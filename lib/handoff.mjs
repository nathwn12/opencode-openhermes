// OpenHermes Agent Handoff — lightweight helper library
// Convention-based, no runtime deps. Agents import and call.

let _idSeq = 0

function nextId() {
  _idSeq++
  return `ho_${Date.now().toString(36)}_${_idSeq}`
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// Estimate task complexity from file count and description.
export function assessComplexity(fileCount = 1, description = "", patterns = []) {
  const pScore = Array.isArray(patterns) ? patterns.length : 0
  const level = fileCount > 50 || pScore > 5 ? "very-large"
    : fileCount > 10 || pScore > 2 ? "hard"
    : fileCount > 2 || pScore > 0 ? "medium"
    : "easy"
  return {
    level,
    fileCount: clamp(fileCount, 0, 9999),
    patterns: pScore,
    strategy: level === "easy" ? "direct"
      : level === "medium" ? "sequential-or-fan-out"
      : level === "hard" ? "sequential-multi"
      : "fan-out"
  }
}

// Build a structured handoff request string for the `task` tool prompt.
export function handoffRequest(opts) {
  const {
    agent,
    phase = "execute",
    context = "",
    goal = "",
    expected = "",
    permissions = "",
    limits = "",
    complexity,
  } = opts || {}
  const id = nextId()
  const c = complexity || assessComplexity()
  const lines = [
    `## HANDOFF REQUEST`,
    `Agent: ${agent}`,
    `Task ID: ${id}`,
    `Phase: ${phase}`,
    `Complexity: ${c.level}`,
    ``,
    `### Context`,
    String(context).trim() || "(no context provided)",
    ``,
    `### Goal`,
    String(goal).trim() || "(no goal provided)",
    ``,
    `### Expected Output`,
    String(expected).trim() || "Return structured result with status, summary, details, receipts, next, learning.",
    ``,
    `### Permissions`,
    String(permissions).trim() || "(default permissions apply)",
    ``,
    `### Limits`,
    String(limits).trim() || "(no explicit limits)",
    ``,
    `### Handoff Result Format`,
    `When done, return:`,
    `## HANDOFF RESULT`,
    `Status: success | failure | partial`,
    `Task ID: ${id}`,
    `### Summary`,
    `### Details`,
    `### Receipts`,
    `### Next`,
    `### Learning`,
  ].join("\n")
  return { id, prompt: lines }
}

// Validate a subagent's result string has required sections.
export function parseHandoffResult(text) {
  if (!text || typeof text !== "string") return { status: "invalid", error: "no result text" }
  const statusMatch = text.match(/Status:\s*(success|failure|partial)/i)
  const hasSummary = /### Summary/i.test(text)
  const hasDetails = /### Details/i.test(text)
  const hasReceipts = /### Receipts/i.test(text)
  const summaryMatch = text.match(/### Summary\s*\n\s*(.+)/i)
  return {
    status: statusMatch ? statusMatch[1].toLowerCase() : "unknown",
    summary: summaryMatch ? summaryMatch[1].trim() : "",
    hasSummary,
    hasDetails,
    hasReceipts,
    valid: !!(statusMatch && hasSummary),
  }
}

// Agent capability/role definitions for reference.
export const AGENT_ROLES = {
  OpenHermes:       { tier: 3, edit: true,  exec: true,  desc: "Primary agent — all tools, all permissions" },
  "oh-architect":        { tier: 1, edit: false, exec: false, desc: "System architecture design" },
  "oh-blueprinter":          { tier: 1, edit: false, exec: false, desc: "Feature/refactor planning" },
  "oh-auditor":  { tier: 1, edit: false, exec: false, desc: "Code quality review" },
  "oh-warden": { tier: 1, edit: false, exec: false, desc: "Security audit (report only, no patches)" },
  "oh-explorer":          { tier: 1, edit: false, exec: false, desc: "Read-only codebase exploration" },
  "oh-mender": { tier: 2, edit: true, exec: true, desc: "Build/type error fixes" },
  "oh-scribe":    { tier: 2, edit: true, exec: true, desc: "Doc/codemap updates" },
  "oh-sweeper": { tier: 2, edit: true, exec: true, desc: "Dead code cleanup" },
  "oh-prover":      { tier: 2, edit: true, exec: true, desc: "TDD red-green-refactor" },
  "oh-pilot":  { tier: 3, edit: true, exec: true, desc: "Managed autonomous loops" },
  "oh-e2e":     { tier: 3, edit: true, exec: true, desc: "Playwright E2E tests" },
  "oh-scout":    { tier: 1, edit: false, exec: true, desc: "MCP doc lookup" },
  "oh-tuner": { tier: 1, edit: false, exec: true, desc: "Harness config audit" },
  "oh-review-db":   { tier: 1, edit: false, exec: true, desc: "PostgreSQL review" },
  "oh-review-go":      { tier: 1, edit: false, exec: true, desc: "Go code review" },
  "oh-build-go":       { tier: 2, edit: true, exec: true, desc: "Go build fix" },
  "oh-review-java":    { tier: 1, edit: false, exec: true, desc: "Java review" },
  "oh-build-java":     { tier: 2, edit: true, exec: true, desc: "Java build fix" },
  "oh-review-kotlin":  { tier: 1, edit: false, exec: true, desc: "Kotlin review" },
  "oh-build-kotlin":   { tier: 2, edit: true, exec: true, desc: "Kotlin build fix" },
  "oh-review-cpp":     { tier: 1, edit: false, exec: true, desc: "C++ review" },
  "oh-build-cpp":      { tier: 2, edit: true, exec: true, desc: "C++ build fix" },
  "oh-review-rust":    { tier: 1, edit: false, exec: true, desc: "Rust review" },
  "oh-build-rust":     { tier: 2, edit: true, exec: true, desc: "Rust build fix" },
  "oh-review-py":  { tier: 1, edit: false, exec: true, desc: "Python review" },
  "oh-chronicler":    { tier: 2, edit: true, exec: true, desc: "Session management" },
  "oh-merger":        { tier: 2, edit: true, exec: true, desc: "PR workflow" },
  "oh-scraper":       { tier: 3, edit: true, exec: true, desc: "Browser automation" },
  "oh-publisher":     { tier: 3, edit: true, exec: true, desc: "Release pipeline" },
  "oh-sentinel":      { tier: 1, edit: false, exec: false, desc: "Safety guard" },
  "oh-gater": { tier: 3, edit: true, exec: true, desc: "Multi-agent pipeline orchestrator" },
  "general":        { tier: 2, edit: true, exec: true, desc: "General purpose" },
}

// Suggest best agent for a task type.
export function suggestAgent(taskType) {
  const map = {
    architecture: "oh-architect",
    plan: "oh-blueprinter",
    "code-review": "oh-auditor",
    security: "oh-warden",
    explore: "oh-explorer",
    "build-fix": "oh-mender",
    docs: "oh-scribe",
    "dead-code": "oh-sweeper",
    tdd: "oh-prover",
    e2e: "oh-e2e",
    "doc-lookup": "oh-scout",
    "db-review": "oh-review-db",
    "go-review": "oh-review-go",
    "go-build": "oh-build-go",
    "java-review": "oh-review-java",
    "java-build": "oh-build-java",
    "kotlin-review": "oh-review-kotlin",
    "kotlin-build": "oh-build-kotlin",
    "cpp-review": "oh-review-cpp",
    "cpp-build": "oh-build-cpp",
    "rust-review": "oh-review-rust",
    "rust-build": "oh-build-rust",
    "python-review": "oh-review-py",
    loop: "oh-pilot",
    "harness-audit": "oh-tuner",
    session: "oh-chronicler",
    pr: "oh-merger",
    browser: "oh-scraper",
    publish: "oh-publisher",
    guard: "oh-sentinel",
  }
  return map[taskType] || null
}

// Quick permission check: can agent X do action Y?
export function canAgent(agentName, action) {
  const role = AGENT_ROLES[agentName]
  if (!role) return false
  if (action === "edit") return role.edit
  if (action === "exec" || action === "bash") return role.exec
  if (action === "read") return true
  if (action === "delegate") return role.tier >= 1
  return false
}
