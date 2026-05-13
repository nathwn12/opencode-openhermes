import path from "node:path"
import { buildEnvironmentFingerprint, sanitizeRecord } from "./lib/hardening.mjs"
import { getDataRoot } from "./lib/paths.mjs"
import { getStore } from "./lib/memory-store.mjs"
import { createLogger } from "./lib/logger.mjs"

const log = createLogger("skill-builder")

const COMPLEXITY_THRESHOLD = { toolCalls: 8, subagents: 2 }
let sessionStats = { toolCalls: 0, subagents: 0, startTime: Date.now() }

export const SkillBuilderPlugin = async ({ project, directory }) => {
  return {
    "tool.execute.after": async (input, output) => {
      try {
        sessionStats.toolCalls++
        if (input.tool === "task") sessionStats.subagents++
      } catch (err) {
        log.error("tool.execute.after error:", err?.message)
      }
    },

    event: async ({ event }) => {
      try {
        if (event.type === "session.created") {
          sessionStats = { toolCalls: 0, subagents: 0, startTime: Date.now() }
        }

        if (event.type === "session.idle") {
          const stats = { ...sessionStats }
          sessionStats = { toolCalls: 0, subagents: 0, startTime: Date.now() }

          const durationMin = Math.round((Date.now() - stats.startTime) / 60000)
          const isComplex = stats.toolCalls >= COMPLEXITY_THRESHOLD.toolCalls
            || stats.subagents >= COMPLEXITY_THRESHOLD.subagents

          if (isComplex) {
            try {
              const root = getDataRoot()
              const ts = new Date().toISOString()
              const id = `bl_skill_candidate_${ts.replace(/[:.]/g, "-")}`
              const store = getStore()
              const backlogItems = store.list("backlog", 50)
              const hasOpenCandidate = backlogItems.some(e => e.status === "open" && String(e.summary || "").includes("[skill-candidate]"))
              if (hasOpenCandidate) return
              const environmentFingerprint = buildEnvironmentFingerprint(root, directory, project)
              const record = {
                id,
                class: "backlog",
                scope: "global",
                summary: `[skill-candidate] Complex session: ${stats.toolCalls} tool calls, ${stats.subagents} subagents, ${durationMin}min`,
                description: `Session exceeded complexity thresholds (toolCalls>=${COMPLEXITY_THRESHOLD.toolCalls} or subagents>=${COMPLEXITY_THRESHOLD.subagents}). Session had ${stats.toolCalls} tool calls and ${stats.subagents} subagent spawns over ${durationMin} minutes.`,
                title: `Skill candidate: Complex session (${stats.toolCalls} tool calls${stats.subagents ? `, ${stats.subagents} subagents`:""})`,
                priority: "medium",
                trigger: "drift",
                status: "open",
                provenance: {
                  session_id: project?.session_id || `session-${Date.now()}`,
                  harness_root: root,
                  project_root: directory,
                },
                tags: ["skill-candidate", "auto-detected"],
                source: "agent",
                created_at: ts,
                updated_at: ts,
                project: project?.name || path.basename(directory),
                environment_fingerprint: environmentFingerprint,
              }
              const safeRecord = sanitizeRecord(record, { maxStringLength: 4000 })
              store.save("backlog", id, safeRecord)

            } catch (err) { log.warn("backlog write error:", err?.message || err) }
          }
        }
      } catch (err) {
        log.error("event handler error:", err?.message)
      }
    },
  }
}
