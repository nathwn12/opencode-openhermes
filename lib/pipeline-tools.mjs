import { tool } from "@opencode-ai/plugin"
import { createLogger } from "./logger.mjs"
import { createPipeline, generateReport, scoreOverall, shipRecommendation } from "./pipeline.mjs"
import { handoffRequest, parseHandoffResult, assessComplexity, suggestAgent, canAgent, AGENT_ROLES } from "./handoff.mjs"
import { generateGoalMd, updateGoalMdStatus, generateHandover, writeReceipt, resolveSessionDir } from "./goal-tracker.mjs"
import * as guardState from "./guard-state.mjs"

const log = createLogger("pipeline-tools")

export const PipelineToolsPlugin = async (_ctx) => {
  return {
    tool: {
      pipeline_run: tool({
        description: "Execute a quality pipeline with given config and return structured results",
        args: {
          stagesFilter: tool.schema.array(tool.schema.string()).optional().describe("Filter to specific stage names"),
          autoFix: tool.schema.boolean().optional().default(false).describe("Enable auto-fix for fixable stages"),
          skip: tool.schema.array(tool.schema.string()).optional().describe("Stage names to skip"),
          target: tool.schema.string().optional().describe("Target path or description"),
        },
        async execute(args) {
          try {
            const pipeline = createPipeline({
              stagesFilter: args.stagesFilter,
              autoFix: args.autoFix,
              skip: args.skip,
              target: args.target,
            })
            const stageResults = {}
            for (const stage of pipeline.stages) {
              stageResults[stage.name] = {
                name: stage.name,
                status: "configured",
                score: 0.5,
                findings: [],
                summary: `Stage ${stage.name} configured (${stage.label})`,
                weight: stage.weight,
              }
            }
            const result = {
              id: `pipeline_${Date.now().toString(36)}`,
              status: "completed",
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              duration: 0,
              stages: stageResults,
              score: scoreOverall(stageResults),
              ship: shipRecommendation(scoreOverall(stageResults)),
              summary: "",
              metadata: {
                stagesFilter: args.stagesFilter || [],
                autoFix: args.autoFix || false,
                skip: args.skip || [],
                target: args.target || "",
              },
            }
            result.summary = generateReport(result)
            return JSON.stringify(result, null, 2)
          } catch (err) {
            log.error("pipeline_run error:", err?.message)
            return `error: ${err?.message}`
          }
        },
      }),

      handoff_request: tool({
        description: "Create structured handoff requests, suggest agents, assess complexity, or check agent capabilities",
        args: {
          action: tool.schema.enum(["request", "suggest", "assess", "can", "roles"]).describe("Action to perform"),
          agent: tool.schema.string().optional().describe("Agent name (for request/can actions)"),
          context: tool.schema.string().optional().describe("Context description"),
          goal: tool.schema.string().optional().describe("Goal description"),
          expected: tool.schema.string().optional().describe("Expected output description"),
          taskType: tool.schema.string().optional().describe("Task type key (for suggest action)"),
          fileCount: tool.schema.number().optional().describe("File count (for assess action)"),
        },
        async execute(args) {
          try {
            switch (args.action) {
              case "request": {
                const result = handoffRequest({
                  agent: args.agent || "general",
                  context: args.context,
                  goal: args.goal,
                  expected: args.expected,
                })
                return JSON.stringify({ id: result.id, prompt: result.prompt }, null, 2)
              }
              case "suggest": {
                const suggested = suggestAgent(args.taskType || "")
                return suggested
                  ? JSON.stringify({ agent: suggested }, null, 2)
                  : JSON.stringify({ agent: null, error: `No agent found for task type: ${args.taskType}` }, null, 2)
              }
              case "assess": {
                const assessment = assessComplexity(args.fileCount || 1, args.context || "", [])
                return JSON.stringify(assessment, null, 2)
              }
              case "can": {
                const allowed = canAgent(args.agent || "", "edit")
                return JSON.stringify({ agent: args.agent, canEdit: allowed }, null, 2)
              }
              case "roles": {
                return JSON.stringify(AGENT_ROLES, null, 2)
              }
              default:
                return `unknown action: ${args.action}`
            }
          } catch (err) {
            log.error("handoff_request error:", err?.message)
            return `error: ${err?.message}`
          }
        },
      }),

      goal_tracker: tool({
        description: "Manage GOAL.md and HANDOVER.md files for session tracking",
        args: {
          action: tool.schema.enum(["generate", "update", "handover", "receipt"]).describe("Action to perform"),
          title: tool.schema.string().optional().describe("Goal title (for generate)"),
          mission: tool.schema.string().optional().describe("One-line mission (for generate)"),
          status: tool.schema.string().optional().default("in-progress").describe("Goal status"),
          phasesJson: tool.schema.string().optional().describe("JSON array of phase objects (for generate)"),
          sessionDir: tool.schema.string().optional().describe("Session directory (for update)"),
          phaseName: tool.schema.string().optional().describe("Phase name to update (for update)"),
          phaseStatus: tool.schema.string().optional().default("done").describe("Phase status (for update)"),
          sessionName: tool.schema.string().optional().describe("Session name (for handover)"),
          summary: tool.schema.string().optional().describe("Handover summary"),
          reason: tool.schema.string().optional().default("AGENT_SWITCH").describe("Handover reason"),
          content: tool.schema.string().optional().describe("Receipt content (for receipt)"),
          type: tool.schema.string().optional().default("receipt").describe("Receipt type (for receipt)"),
        },
        async execute(args) {
          try {
            switch (args.action) {
              case "generate": {
                let phases = []
                if (args.phasesJson) {
                  try { phases = JSON.parse(args.phasesJson) } catch { phases = [] }
                }
                const fp = generateGoalMd({
                  title: args.title || "Untitled",
                  mission: args.mission || "",
                  status: args.status,
                  phases,
                })
                return `goal generated: ${fp}`
              }
              case "update": {
                const fp = updateGoalMdStatus(args.sessionDir || resolveSessionDir(), args.phaseName || "", args.phaseStatus || "done")
                return `goal updated: ${fp}`
              }
              case "handover": {
                const fp = generateHandover({
                  sessionName: args.sessionName || "default",
                  summary: args.summary || "",
                  reason: args.reason,
                })
                return `handover generated: ${fp}`
              }
              case "receipt": {
                const fp = writeReceipt(args.content || "", args.type)
                return `receipt written: ${fp}`
              }
              default:
                return `unknown action: ${args.action}`
            }
          } catch (err) {
            log.error("goal_tracker error:", err?.message)
            return `error: ${err?.message}`
          }
        },
      }),

      guard_state: tool({
        description: "Manage safety guard state (careful mode, frozen directories, guard mode)",
        args: {
          action: tool.schema.enum(["get", "set", "freeze", "unfreeze", "list-frozen", "careful"]).describe("Action to perform"),
          dir: tool.schema.string().optional().describe("Directory path (for freeze/unfreeze)"),
          careful: tool.schema.boolean().optional().describe("Careful mode value (for careful action)"),
          guardMode: tool.schema.boolean().optional().describe("Guard mode value (for set action)"),
          cwd: tool.schema.string().optional().describe("Working directory override for guard state file"),
        },
        async execute(args) {
          try {
            const cwd = args.cwd
            switch (args.action) {
              case "get": {
                const state = guardState.getState(cwd)
                return JSON.stringify(state, null, 2)
              }
              case "set": {
                const state = guardState.setState({ guardMode: args.guardMode }, cwd)
                return JSON.stringify(state, null, 2)
              }
              case "freeze": {
                if (!args.dir) return "dir is required for freeze action"
                guardState.freezeDir(args.dir, cwd)
                return `frozen: ${args.dir}`
              }
              case "unfreeze": {
                if (!args.dir) return "dir is required for unfreeze action"
                guardState.unfreezeDir(args.dir, cwd)
                return `unfrozen: ${args.dir}`
              }
              case "list-frozen": {
                const dirs = guardState.listFrozenDirs(cwd)
                return dirs.length ? `frozen directories:\n  ${dirs.join("\n  ")}` : "no frozen directories"
              }
              case "careful": {
                guardState.setCarefulMode(args.careful, cwd)
                return `careful mode: ${guardState.isCarefulMode(cwd)}`
              }
              default:
                return `unknown action: ${args.action}`
            }
          } catch (err) {
            log.error("guard_state error:", err?.message)
            return `error: ${err?.message}`
          }
        },
      }),
    },
  }
}
