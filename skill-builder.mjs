import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { atomicWriteJson, fingerprintEnvironment, sanitizeRecord } from "./lib/hardening.mjs"

function isTruthy(value) {
  return /^(1|true|yes|on)$/i.test(String(value || ""))
}

function getHarnessRoot(directory) {
  const home = process.env.USERPROFILE || os.homedir()
  const configRoot = path.join(home, ".config", "opencode")
  const projectHarness = path.join(directory, ".opencode", "openhermes")
  const projectMemory = path.join(projectHarness, "memory")
  if (isTruthy(process.env.OPENCODE_ALLOW_PROJECT_HARNESS)) {
    try { fs.accessSync(projectMemory); return projectHarness } catch {}
  }
  return path.join(configRoot, "openhermes")
}

function readJson(fp, fallback) {
  try { return JSON.parse(fs.readFileSync(fp, "utf8")) } catch { return fallback }
}

function buildEnvironmentFingerprint(root, directory, project) {
  return fingerprintEnvironment({
    cwd: directory,
    harnessRoot: root,
    projectRoot: directory,
    project: project?.name || path.basename(directory),
    sessionId: project?.session_id || null,
  })
}

const COMPLEXITY_THRESHOLD = { toolCalls: 8, subagents: 2 }
let sessionStats = { toolCalls: 0, subagents: 0, startTime: Date.now(), newSkills: [] }

export const SkillBuilderPlugin = async ({ project, directory }) => {
  return {
    "tool.execute.after": async (input, output) => {
      sessionStats.toolCalls++
      if (input.tool === "task") sessionStats.subagents++
    },

    event: async ({ event }) => {
      if (event.type === "session.created") {
        sessionStats = { toolCalls: 0, subagents: 0, startTime: Date.now(), newSkills: [] }
        try {
          const root = getHarnessRoot(directory)
          const backlogIndex = readJson(path.join(root, "memory", "backlog", "index.json"), [])
          const pending = Array.isArray(backlogIndex)
            ? backlogIndex.filter(e => e.status === "open" && (e.summary || "").includes("skill-candidate"))
            : []
        } catch (err) {}
      }

      if (event.type === "session.idle") {
        const durationMin = Math.round((Date.now() - sessionStats.startTime) / 60000)
        const isComplex = sessionStats.toolCalls >= COMPLEXITY_THRESHOLD.toolCalls
          || sessionStats.subagents >= COMPLEXITY_THRESHOLD.subagents

        if (isComplex) {
          try {
            const root = getHarnessRoot(directory)
            const ts = new Date().toISOString()
            const id = `bl_skill_candidate_${ts.replace(/[:.]/g, "-")}`
            const backlogIndexPath = path.join(root, "memory", "backlog", "index.json")
            const backlogIndex = readJson(backlogIndexPath, [])
            const hasOpenCandidate = Array.isArray(backlogIndex)
              ? backlogIndex.some(e => e.status === "open" && String(e.summary || "").includes("[skill-candidate]"))
              : false
            if (hasOpenCandidate) {
              sessionStats = { toolCalls: 0, subagents: 0, startTime: Date.now(), newSkills: [] }
              return
            }
            const environmentFingerprint = buildEnvironmentFingerprint(root, directory, project)
            const record = {
              id,
              class: "backlog",
              scope: "global",
              summary: `[skill-candidate] Complex session: ${sessionStats.toolCalls} tool calls, ${sessionStats.subagents} subagents, ${durationMin}min`,
              description: `Session exceeded complexity thresholds (toolCalls>=${COMPLEXITY_THRESHOLD.toolCalls} or subagents>=${COMPLEXITY_THRESHOLD.subagents}). Session had ${sessionStats.toolCalls} tool calls and ${sessionStats.subagents} subagent spawns over ${durationMin} minutes.`,
              title: `Skill candidate: Complex session (${sessionStats.toolCalls} tool calls${sessionStats.subagents ? `, ${sessionStats.subagents} subagents`:""})`,
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

          } catch (err) {}
        }
        sessionStats = { toolCalls: 0, subagents: 0, startTime: Date.now(), newSkills: [] }
      }
    },
  }
}
