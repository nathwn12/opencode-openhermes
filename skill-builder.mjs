import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { atomicWriteJson, buildEnvironmentFingerprint, readJson, sanitizeRecord } from "./lib/hardening.mjs"
import { getDataRoot, getMemoryRoot } from "./lib/paths.mjs"

const COMPLEXITY_THRESHOLD = { toolCalls: 8, subagents: 2 }
let sessionStats = { toolCalls: 0, subagents: 0, startTime: Date.now() }

export const SkillBuilderPlugin = async ({ project, directory }) => {
  return {
    "tool.execute.after": async (input, output) => {
      sessionStats.toolCalls++
      if (input.tool === "task") sessionStats.subagents++
    },

    event: async ({ event }) => {
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
            const backlogIndexPath = path.join(root, "memory", "backlog", "index.json")
            const backlogIndex = readJson(backlogIndexPath, [])
            const hasOpenCandidate = Array.isArray(backlogIndex)
              ? backlogIndex.some(e => e.status === "open" && String(e.summary || "").includes("[skill-candidate]"))
              : false
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
            const dir = path.join(root, "memory", "backlog")
            fs.mkdirSync(dir, { recursive: true })
            const safeRecord = sanitizeRecord(record, { maxStringLength: 4000 })
            atomicWriteJson(path.join(dir, `${id}.json`), safeRecord)

            const index = Array.isArray(backlogIndex) ? backlogIndex : []
            index.push({
              id,
              summary: safeRecord.summary,
              title: safeRecord.title,
              status: "open",
              updated_at: ts,
              path: `openhermes/memory/backlog/${id}.json`,
              priority: "medium",
              trigger: "drift",
              environment_fingerprint: environmentFingerprint,
            })
            atomicWriteJson(path.join(dir, "index.json"), index)

          } catch (err) { process.stderr.write(`[skill-builder] backlog write error: ${err?.message || err}\n`) }
        }
      }
    },
  }
}
