import path from "node:path"
import os from "node:os"
import fs from "node:fs"
import { atomicWriteJson, buildEnvironmentFingerprint, fingerprintEnvironment, isTruthy, sanitizeRecord, truncateText } from "./lib/hardening.mjs"
import { getDataRoot, getCacheRoot, getMemoryRoot, getRecallRoot, getRuntimeRoot } from "./lib/paths.mjs"
import { getStore } from "./lib/memory-store.mjs"
import { createLogger } from "./lib/logger.mjs"

const log = createLogger("autorecall")
const OLD_BASE = path.join(os.homedir(), ".config", "opencode", "openhermes")
const BOILERPLATE_SUMMARY = /^(Idle checkpoint for|Pre-compaction checkpoint for|Placeholder checkpoint|Session in progress|No active checkpoint)/i

function hasExpired(r) {
  if (r?.status === "expired" || r?.status === "decayed") return true
  if (r?.decay_at && Date.parse(r.decay_at) < Date.now()) return true
  if (r?.expires_at && Date.parse(r.expires_at) < Date.now()) return true
  return false
}

function sweepStaleRecords() {
  const classes = ["checkpoint", "constraint", "decision", "instinct", "audit", "backlog", "verification_receipt"]
  let swept = 0
  for (const cls of classes) {
    const records = getStore().all(cls)
    for (const record of records) {
      if (!record || !hasExpired(record)) continue
      if (record.status === "expired" || record.status === "decayed") continue
      record.status = "expired"
      record.updated_at = new Date().toISOString()
      getStore().save(cls, record.id, record)
      swept++
    }
  }
  return swept
}

function sweepBoilerplateCheckpoints() {
  const cutoff = Date.now() - 86400000
  let archived = 0
  const records = getStore().all("checkpoint")
  for (const record of records) {
    if (record.status === "expired" || record.status === "archived") continue
    if (!BOILERPLATE_SUMMARY.test(record.summary || "")) continue
    const ts = Date.parse(record.updated_at || record.created_at || 0)
    if (Number.isNaN(ts) || ts > cutoff) continue
    record.status = "archived"
    record.archived_at = new Date().toISOString()
    record.updated_at = record.archived_at
    getStore().save("checkpoint", record.id, record)
    archived++
  }
  return archived
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
    `If none are skill-worthy, close them via ohc_save with status:"closed".`
  ].join("\n")
}

function formatMemoryWriteGap(memory) {
  const gaps = []
  if (memory.constraints.length === 0) gaps.push("constraints")
  if (memory.decisions.length === 0) gaps.push("decisions")
  if (!gaps.length) return null
  return `## Memory Write Gap\nThese memory classes are empty: ${gaps.join(", ")}. Write at least one ${gaps[0]} this session.`
}

export async function refreshRecallCache(projectKey, directory) {
  await loadMemoryAndWriteCache(projectKey, directory)
}

async function loadMemoryAndWriteCache(projectKey, directory) {
  sweepStaleRecords()
  sweepBoilerplateCheckpoints()
  const SENTINEL = path.join(getDataRoot(), ".migrated-from-v1")
  if (!fs.existsSync(SENTINEL)) {
    const oldMemory = path.join(OLD_BASE, "memory")
    const oldCache = path.join(oldMemory, "recall")
    if (fs.existsSync(oldMemory)) {
      fs.cpSync(oldMemory, getMemoryRoot(), { recursive: true })
      if (fs.existsSync(oldCache)) {
        fs.mkdirSync(getRecallRoot(), { recursive: true })
        const files = fs.readdirSync(oldCache).filter(f => f.endsWith(".json"))
        for (const f of files) fs.cpSync(path.join(oldCache, f), path.join(getRecallRoot(), f))
      }
      fs.rmSync(oldMemory, { recursive: true, force: true })
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
    fs.mkdirSync(path.dirname(SENTINEL), { recursive: true })
    fs.writeFileSync(SENTINEL, new Date().toISOString(), "utf8")
  }

  const memory = { constraints: [], decisions: [], mistakes: [], checkpoint: null, pendingSkillCandidates: [] }
  const fingerprint = buildEnvironmentFingerprint(getDataRoot(), directory, { name: projectKey })

  const allConstraints = getStore().all("constraint")
  memory.constraints = allConstraints.filter(e => e.status === "active")

  const allDecisions = getStore().all("decision")
  memory.decisions = allDecisions
    .filter(e => e.status === "active")
    .filter(validateMemoryRecord)

  const allMistakes = getStore().all("mistake")
  memory.mistakes = allMistakes.filter(e => e.status === "active").slice(0, 5)

  const latestCheckpoint = getStore().latest("checkpoint")
  if (latestCheckpoint) memory.checkpoint = latestCheckpoint

  const allBacklog = getStore().all("backlog")
  memory.pendingSkillCandidates = allBacklog.filter(e =>
    e.status === "open" && Array.isArray(e.tags) && e.tags.includes("skill-candidate")
  )

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
      try {
        if (event.type === "session.created") {
          const projectKey = project?.name || path.basename(directory)
          await loadMemoryAndWriteCache(projectKey, directory)
        }
      } catch (err) {
        log.error("event handler error:", err?.message)
      }
    },
  }
}
