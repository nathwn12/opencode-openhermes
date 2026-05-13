import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import { getHarnessDir, setHarnessRootForTest } from "./harness-resolver.mjs"

export function resolveHarnessDir() {
  return getHarnessDir()
}

export function setHarnessDirForTest(dir) {
  setHarnessRootForTest(dir)
}

function readTemplate(name) {
  const dir = resolveHarnessDir()
  const fp = join(dir, "templates", name)
  return readFileSync(fp, "utf8")
}

function sessionBaseDir() {
  return join(homedir(), ".config", "opencode", "TASKS")
}

export function resolveSessionDir(sessionName) {
  const base = sessionBaseDir()
  if (!existsSync(base)) mkdirSync(base, { recursive: true })
  if (sessionName) {
    const dir = join(base, sessionName)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    return dir
  }
  const entries = existsSync(base) ? readdirSync(base) : []
  const sorted = entries.filter(e => e !== ".gitkeep").sort().reverse()
  if (sorted.length > 0) return join(base, sorted[0])
  const fallback = join(base, "default")
  if (!existsSync(fallback)) mkdirSync(fallback, { recursive: true })
  return fallback
}

function phasesToMd(phases) {
  return phases.map(p => {
    const check = p.done ? "x" : " "
    return `- [${check}] ${p.name}${p.owner ? ` — ${p.owner}` : ""}`
  }).join("\n")
}

export function generateGoalMd({ title, mission, status = "in-progress", phases = [], startDate = new Date().toISOString().slice(0, 10), etaDate = "", blockers = "none", planPath = "", nextAction = "" }) {
  const template = readTemplate("GOAL.md.tmpl")
  const phasesMd = phasesToMd(phases)
  const content = template
    .replace(/\{TITLE\}/g, title)
    .replace(/\{ONE_LINE_MISSION\}/g, mission)
    .replace(/\{STATUS\}/g, status)
    .replace(/\{START_DATE\}/g, startDate)
    .replace(/\{ETA_DATE\}/g, etaDate)
    .replace(/\{PHASES\}/g, phasesMd)
    .replace(/\{BLOCKERS\}/g, blockers)
    .replace(/\{PLAN_PATH\}/g, planPath)
    .replace(/\{NEXT_ACTION\}/g, nextAction)
  const dir = resolveSessionDir()
  const fp = join(dir, "GOAL.md")
  writeFileSync(fp, content, "utf8")
  return fp
}

export function updateGoalMdStatus(sessionDir, phaseName, status) {
  const fp = join(sessionDir, "GOAL.md")
  if (!existsSync(fp)) throw new Error(`GOAL.md not found at ${fp}`)
  let content = readFileSync(fp, "utf8")
  const check = status === "done" ? "x" : " "
  const pattern = new RegExp(`(- \\[.)\\s*${escapeRegex(phaseName)}`, "")
  if (pattern.test(content)) {
    content = content.replace(pattern, `- [${check}] ${phaseName}`)
  } else {
    content += `\n- [${check}] ${phaseName}`
  }
  writeFileSync(fp, content, "utf8")
  return fp
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function generateHandover({ sessionName, summary, reason = "AGENT_SWITCH", stateSnapshot = {}, decisions = [], blockers = "none", remaining = "", nextContext = "", receipts = "" }) {
  const template = readTemplate("HANDOVER.md.tmpl")
  const decisionsMd = decisions.length > 0
    ? decisions.map((d, i) => `${i + 1}. ${d}`).join("\n")
    : "none"
  const remainingMd = remaining || "none"
  const content = template
    .replace(/\{SESSION_NAME\}/g, sessionName)
    .replace(/\{SUMMARY\}/g, summary)
    .replace(/\{REASON\}/g, reason)
    .replace(/\{COMMANDS_COUNT\}/g, String(stateSnapshot.commands ?? "?"))
    .replace(/\{SUBAGENTS_COUNT\}/g, String(stateSnapshot.subagents ?? "?"))
    .replace(/\{SKILLS_COUNT\}/g, String(stateSnapshot.skills ?? "?"))
    .replace(/\{TESTS_PASSED\}/g, String(stateSnapshot.testsPassed ?? "?"))
    .replace(/\{TESTS_TOTAL\}/g, String(stateSnapshot.testsTotal ?? "?"))
    .replace(/\{GIT_BRANCH\}/g, stateSnapshot.gitBranch ?? "?")
    .replace(/\{GIT_HASH\}/g, stateSnapshot.gitHash ?? "?")
    .replace(/\{DECISIONS\}/g, decisionsMd)
    .replace(/\{BLOCKERS\}/g, blockers)
    .replace(/\{REMAINING\}/g, remainingMd)
    .replace(/\{NEXT_CONTEXT\}/g, nextContext)
    .replace(/\{RECEIPTS\}/g, receipts || "none")
  const dir = resolveSessionDir(sessionName)
  const fp = join(dir, "HANDOVER.md")
  writeFileSync(fp, content, "utf8")
  return fp
}

export function writeReceipt(content, type = "receipt") {
  const dir = resolveSessionDir()
  const ts = new Date().toISOString().replace(/[:.]/g, "-")
  const fp = join(dir, `${type}-${ts}.md`)
  writeFileSync(fp, content, "utf8")
  return fp
}
