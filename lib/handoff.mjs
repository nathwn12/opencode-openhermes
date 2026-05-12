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
  architect:        { tier: 1, edit: false, exec: false, desc: "System architecture design" },
  planner:          { tier: 1, edit: false, exec: false, desc: "Feature/refactor planning" },
  "code-reviewer":  { tier: 1, edit: false, exec: false, desc: "Code quality review" },
  "security-reviewer": { tier: 1, edit: false, exec: false, desc: "Security audit (report only, no patches)" },
  explore:          { tier: 1, edit: false, exec: false, desc: "Read-only codebase exploration" },
  "build-error-resolver": { tier: 2, edit: true, exec: true, desc: "Build/type error fixes" },
  "doc-updater":    { tier: 2, edit: true, exec: true, desc: "Doc/codemap updates" },
  "refactor-cleaner": { tier: 2, edit: true, exec: true, desc: "Dead code cleanup" },
  "tdd-guide":      { tier: 2, edit: true, exec: true, desc: "TDD red-green-refactor" },
  "loop-operator":  { tier: 3, edit: true, exec: true, desc: "Managed autonomous loops" },
  "e2e-runner":     { tier: 3, edit: true, exec: true, desc: "Playwright E2E tests" },
  "docs-lookup":    { tier: 1, edit: false, exec: true, desc: "MCP doc lookup" },
  "harness-optimizer": { tier: 1, edit: false, exec: true, desc: "Harness config audit" },
  "review-database":   { tier: 1, edit: false, exec: true, desc: "PostgreSQL review" },
  "review-go":      { tier: 1, edit: false, exec: true, desc: "Go code review" },
  "build-go":       { tier: 2, edit: true, exec: true, desc: "Go build fix" },
  "review-java":    { tier: 1, edit: false, exec: true, desc: "Java review" },
  "build-java":     { tier: 2, edit: true, exec: true, desc: "Java build fix" },
  "review-kotlin":  { tier: 1, edit: false, exec: true, desc: "Kotlin review" },
  "build-kotlin":   { tier: 2, edit: true, exec: true, desc: "Kotlin build fix" },
  "review-cpp":     { tier: 1, edit: false, exec: true, desc: "C++ review" },
  "build-cpp":      { tier: 2, edit: true, exec: true, desc: "C++ build fix" },
  "review-rust":    { tier: 1, edit: false, exec: true, desc: "Rust review" },
  "build-rust":     { tier: 2, edit: true, exec: true, desc: "Rust build fix" },
  "review-python":  { tier: 1, edit: false, exec: true, desc: "Python review" },
  "pipeline-orchestrator": { tier: 3, edit: true, exec: true, desc: "Multi-agent pipeline orchestrator" },
  "general":        { tier: 2, edit: true, exec: true, desc: "General purpose" },
}

// Suggest best agent for a task type.
export function suggestAgent(taskType) {
  const map = {
    architecture: "architect",
    plan: "planner",
    "code-review": "code-reviewer",
    security: "security-reviewer",
    explore: "explore",
    "build-fix": "build-error-resolver",
    docs: "doc-updater",
    "dead-code": "refactor-cleaner",
    tdd: "tdd-guide",
    e2e: "e2e-runner",
    "doc-lookup": "docs-lookup",
    "db-review": "review-database",
    "go-review": "review-go",
    "go-build": "build-go",
    "java-review": "review-java",
    "java-build": "build-java",
    "kotlin-review": "review-kotlin",
    "kotlin-build": "build-kotlin",
    "cpp-review": "review-cpp",
    "cpp-build": "build-cpp",
    "rust-review": "review-rust",
    "rust-build": "build-rust",
    "python-review": "review-python",
    loop: "loop-operator",
    "harness-audit": "harness-optimizer",
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
