import path from "node:path"
import os from "node:os"
import fs from "node:fs"
import { atomicWriteJson, fingerprintEnvironment, isTruthy, sanitizeRecord, truncateText } from "./lib/hardening.mjs"
import { getDataRoot, getCacheRoot, getMemoryRoot, getRecallRoot, getRuntimeRoot } from "./lib/paths.mjs"

const OLD_BASE = path.join(os.homedir(), ".config", "opencode", "openhermes")

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

async function loadMemoryAndWriteCache(projectKey, directory) {
  const SENTINEL = path.join(getDataRoot(), ".migrated-from-v1")
  if (!fs.existsSync(SENTINEL)) {
    const oldMemory = path.join(OLD_BASE, "memory")
    if (fs.existsSync(oldMemory)) {
      fs.cpSync(oldMemory, getMemoryRoot(), { recursive: true })
      fs.rmSync(oldMemory, { recursive: true, force: true })
    }
    const oldCache = path.join(OLD_BASE, "memory", "recall")
    if (fs.existsSync(oldCache)) {
      fs.mkdirSync(getRecallRoot(), { recursive: true })
      const files = fs.readdirSync(oldCache).filter(f => f.endsWith(".json"))
      for (const f of files) fs.cpSync(path.join(oldCache, f), path.join(getRecallRoot(), f))
    }
    const oldRuntime = path.join(OLD_BASE, "runtime")
    if (fs.existsSync(oldRuntime)) {
      fs.cpSync(oldRuntime, getRuntimeRoot(), { recursive: true })
      fs.rmSync(oldRuntime, { recursive: true, force: true })
    }
    const oldArchive = path.join(OLD_BASE, "archive")
    if (fs.existsSync(oldArchive)) {
      fs.rmSync(oldArchive, { recursive: true, force: true })
    }
    fs.writeFileSync(SENTINEL, new Date().toISOString(), "utf8")
  }

  const memory = { constraints: [], decisions: [], mistakes: [], checkpoint: null, pendingSkillCandidates: [] }
  const fingerprint = buildEnvironmentFingerprint(getDataRoot(), directory, projectKey)

  const constraintsIndex = readJson(path.join(getMemoryRoot(), "constraints", "index.json"), [])
  if (Array.isArray(constraintsIndex)) memory.constraints = constraintsIndex.filter(e => e.status === "active")

  const decisionsIndex = readJson(path.join(getMemoryRoot(), "decisions", "index.json"), [])
  if (Array.isArray(decisionsIndex)) {
    memory.decisions = decisionsIndex
      .filter(e => e.status === "active")
      .map(entry => loadMemoryRecord(getDataRoot(), "decisions", entry))
      .filter(validateMemoryRecord)
  }

  const allMistakes = readJsonl(path.join(getMemoryRoot(), "mistakes", "mistakes.jsonl"))
  if (allMistakes.length) memory.mistakes = allMistakes.filter(e => e.status === "active").slice(0, 5)

  const checkpointIndex = readJson(path.join(getMemoryRoot(), "checkpoints", "index.json"), [])
  if (Array.isArray(checkpointIndex) && checkpointIndex.length > 0) {
    const latest = checkpointIndex.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0]
    memory.checkpoint = readJson(path.join(getMemoryRoot(), "checkpoints", `${latest.id}.json`), null)
  }

  const backlogIndex = readJson(path.join(getMemoryRoot(), "backlog", "index.json"), [])
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

  const cacheDir = getRecallRoot()
  fs.mkdirSync(cacheDir, { recursive: true })
  atomicWriteJson(path.join(cacheDir, "cache.json"), sanitizeRecord({
    context: boundedContext,
    project: projectKey,
    trust_mode: isTruthy(process.env.OPENCODE_ALLOW_PROJECT_HARNESS) ? "project" : "global",
    harness_root: getDataRoot(),
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
        const projectKey = project?.name || path.basename(directory)
        await loadMemoryAndWriteCache(projectKey, directory)
      }
    },
  }
}
