import path from "node:path"
import os from "node:os"
import fs from "node:fs"
import { atomicWriteJson, fingerprintEnvironment, sanitizeRecord, truncateText } from "./lib/hardening.mjs"

function isTruthy(value) {
  return /^(1|true|yes|on)$/i.test(String(value || ""))
}

function getHarnessRoot(directory) {
  const home = process.env.USERPROFILE || os.homedir()
  const configRoot = path.join(home, ".config", "opencode")
  const projectHarness = path.join(directory, ".opencode", "openhermes")
  const projectMemory = path.join(projectHarness, "memory")
  if (isTruthy(process.env.OPENCODE_ALLOW_PROJECT_HARNESS)) {
    try {
      fs.accessSync(projectMemory)
      return projectHarness
    } catch {
    }
  }
  return path.join(configRoot, "openhermes")
}

function readJson(fp, fallback) {
  try { return JSON.parse(fs.readFileSync(fp, "utf8")) } catch { return fallback }
}

function readJsonl(fp) {
  try {
    return fs.readFileSync(fp, "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l))
  } catch { return [] }
}

function loadMemoryRecord(root, className, entry) {
  const recordPath = path.join(root, "memory", className, `${entry.id}.json`)
  const record = readJson(recordPath, null)
  if (record && typeof record === "object") return record
  return {
    ...entry,
    class: className,
    scope: entry.scope || "harness",
  }
}

function buildEnvironmentFingerprint(harnessRoot, directory, projectKey) {
  return fingerprintEnvironment({
    cwd: directory,
    harnessRoot,
    projectRoot: directory,
    project: projectKey,
  })
}

function formatContext(memory) {
  const parts = []
  if (memory.checkpoint) parts.push(`## Active Checkpoint\n${memory.checkpoint.summary || "N/A"}\n`)
  if (memory.constraints.length) parts.push(`## Active Constraints\n${memory.constraints.map(c => `- ${c.summary}`).join("\n")}\n`)
  if (memory.decisions.length) parts.push(`## Recent Decisions\n${memory.decisions.slice(0, 3).map(d => `- ${d.summary}`).join("\n")}\n`)
  if (memory.mistakes.length) parts.push(`## Recent Mistakes (top ${Math.min(3, memory.mistakes.length)})\n${memory.mistakes.slice(0, 3).map(m => `- ${m.summary}`).join("\n")}\n`)
  return parts.join("\n")
}

function isFreshCache(cache, fingerprint) {
  if (!cache || !cache.fingerprint || cache.fingerprint.sha256 !== fingerprint.sha256) return false
  if (!cache.freshness_marker || !cache.freshness_marker.updated_at) return false
  const ttlMs = Number.isFinite(cache.freshness_marker.ttl_ms) ? cache.freshness_marker.ttl_ms : 1800000
  return (Date.now() - Date.parse(cache.freshness_marker.updated_at)) <= ttlMs
}

function validateMemoryRecord(record) {
  const required = ["id", "class", "scope", "summary", "status"]
  const missing = required.filter(r => !record[r])
  if (missing.length) return false
  if (record.confidence !== undefined && record.confidence < 0.3) return false
  return true
}

function formatBacklogNudge(candidates) {
  if (!candidates.length) return null
  const count = candidates.length
  const top = candidates.slice(0, 3).map((c, i) => `${i + 1}. ${c.summary || c.title || "unnamed candidate"}`).join("\n")
  return [
    `## Pending Skill Candidates (${count} open)`,
    `The skill creation loop has ${count} unprocessed candidates.`,
    `CRITICAL: Process the oldest candidate via /learn on this session start.`,
    `Top candidates:`,
    top,
    `Trigger: /learn to create skills from these sessions.`,
    `If none are skill-worthy, close them via hm_put with status:"closed".`
  ].join("\n")
}

function formatMemoryWriteGap(memory) {
  const gaps = []
  if (memory.constraints.length === 0) gaps.push("constraints")
  if (memory.decisions.length === 0) gaps.push("decisions")
  if (!gaps.length) return null
  return `## Memory Write Gap\nThese memory classes are empty: ${gaps.join(", ")}. Write at least one ${gaps[0]} this session.`
}

async function loadMemoryAndWriteCache(harnessRoot, projectKey, directory) {
  const memory = { constraints: [], decisions: [], mistakes: [], checkpoint: null, pendingSkillCandidates: [] }
  const fingerprint = buildEnvironmentFingerprint(harnessRoot, directory, projectKey)

  const constraintsIndex = readJson(path.join(harnessRoot, "memory", "constraints", "index.json"), [])
  if (Array.isArray(constraintsIndex)) memory.constraints = constraintsIndex.filter(e => e.status === "active")

  const decisionsIndex = readJson(path.join(harnessRoot, "memory", "decisions", "index.json"), [])
  if (Array.isArray(decisionsIndex)) {
    memory.decisions = decisionsIndex
      .filter(e => e.status === "active")
      .map(entry => loadMemoryRecord(harnessRoot, "decisions", entry))
      .filter(validateMemoryRecord)
  }

  const allMistakes = readJsonl(path.join(harnessRoot, "memory", "mistakes", "mistakes.jsonl"))
  if (allMistakes.length) memory.mistakes = allMistakes.filter(e => e.status === "active").slice(0, 5)

  const checkpointIndex = readJson(path.join(harnessRoot, "memory", "checkpoints", "index.json"), [])
  if (Array.isArray(checkpointIndex) && checkpointIndex.length > 0) {
    const latest = checkpointIndex.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0]
    memory.checkpoint = readJson(path.join(harnessRoot, "memory", "checkpoints", `${latest.id}.json`), null)
  }

  const backlogIndex = readJson(path.join(harnessRoot, "memory", "backlog", "index.json"), [])
  if (Array.isArray(backlogIndex)) {
    memory.pendingSkillCandidates = backlogIndex.filter(e =>
      e.status === "open" && (e.summary || "").includes("skill-candidate")
    )
  }

  const contextParts = []
  const baseContext = formatContext(memory)
  if (baseContext) contextParts.push(baseContext)
  const backlogNudge = formatBacklogNudge(memory.pendingSkillCandidates)
  if (backlogNudge) contextParts.push(backlogNudge)
  const writeGap = formatMemoryWriteGap(memory)
  if (writeGap) contextParts.push(writeGap)

  const context = contextParts.join("\n\n")
  const boundedContext = context ? truncateText(context, 12000) : null

  const cacheDir = path.join(harnessRoot, "memory", "recall")
  fs.mkdirSync(cacheDir, { recursive: true })
  atomicWriteJson(path.join(cacheDir, "cache.json"), sanitizeRecord({
    context: boundedContext,
    project: projectKey,
    trust_mode: isTruthy(process.env.OPENCODE_ALLOW_PROJECT_HARNESS) ? "project" : "global",
    harness_root: harnessRoot,
    project_root: directory,
    updated_at: new Date().toISOString(),
    fingerprint,
    freshness_marker: {
      updated_at: new Date().toISOString(),
      ttl_ms: 1800000,
    },
    stats: {
      constraints: memory.constraints.length,
      decisions: memory.decisions.length,
      mistakes: memory.mistakes.length,
      has_checkpoint: !!memory.checkpoint,
      pending_skill_candidates: memory.pendingSkillCandidates.length
    }
  }, { maxStringLength: 4000 }))
}

export const AutorecallPlugin = async ({ project, directory }) => {
  return {
    event: async ({ event }) => {
      if (event.type === "session.created") {
        const harnessRoot = getHarnessRoot(directory)
        const projectKey = project?.name || path.basename(directory)
        await loadMemoryAndWriteCache(harnessRoot, projectKey, directory)
      }
    },
  }
}
