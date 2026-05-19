// ---------------------------------------------------------------------------
// Routing Graph — single source of truth extracted from SKILL.md frontmatter
// AUTO-GENERATED. Run `bun run harness/lib/routing/gen-routing-graph.ts` to regenerate.
// ---------------------------------------------------------------------------

/**
 * Skill routing graph — all edges by outcome order (pass, fail, blocker per skill).
 */
export const ROUTING_GRAPH: Record<string, readonly string[]> = {
  "oh-ascii": ["surface", "surface", "surface"],
  "oh-browser": ["surface", "oh-browser", "surface"],
  "oh-builder": ["oh-gauntlet", "oh-builder", "surface"],
  "oh-docs": ["oh-retro", "oh-builder", "surface"],
  "oh-expert": ["oh-builder", "oh-gauntlet", "oh-expert", "surface"],
  "oh-facade": ["oh-review", "oh-manifest", "oh-facade", "surface"],
  "oh-full-output": ["done", "surface", "oh-expert", "surface"],
  "oh-fusion": ["oh-skill-craft", "oh-skills-list", "surface", "surface"],
  "oh-gauntlet": ["oh-ship", "oh-builder", "surface"],
  "oh-grill": ["oh-builder", "oh-planner", "oh-planner", "surface"],
  "oh-guard": ["mode", "mode", "surface"],
  "oh-handoff": ["done", "surface", "surface"],
  "oh-health": ["surface", "oh-investigate", "surface"],
  "oh-init": ["done", "oh-init", "surface"],
  "oh-investigate": ["oh-builder", "oh-expert", "surface"],
  "oh-issue": ["done", "oh-planner", "surface"],
  "oh-learn": ["surface", "surface", "surface"],
  "oh-manifest": ["oh-planner", "oh-expert", "surface"],
  "oh-pdf": ["surface", "oh-builder", "surface"],
  "oh-plan-review": ["oh-grill", "oh-manifest", "oh-planner", "surface"],
  "oh-planner": ["oh-grill", "oh-planner", "surface"],
  "oh-prd": ["oh-issue", "oh-grill", "surface"],
  "oh-refactor": ["oh-gauntlet", "oh-planner", "oh-investigate", "oh-builder", "surface"],
  "oh-retro": ["oh-planner", "oh-handoff", "surface"],
  "oh-review": ["oh-gauntlet", "oh-ship", "oh-builder", "surface"],
  "oh-security": ["surface", "oh-investigate", "surface"],
  "oh-ship": ["oh-retro", "oh-docs", "oh-expert", "surface"],
  "oh-skill-craft": ["oh-skills-list", "oh-expert", "surface"],
  "oh-skills-list": ["done", "surface", "surface"],
  "oh-triage": ["oh-issue", "oh-handoff", "oh-expert", "surface"],
  "oh-worktree": ["oh-manifest", "surface", "surface"],
} as const;

/**
 * Classification matrix — maps task patterns to entry skills.
 * Source: AUTOPILOT.md Auto-Classify decision matrix.
 */
export const CLASSIFICATION_MATRIX: Record<string, string> = {
  "multi-step": "oh-planner",
  vague: "oh-planner",
  bug: "oh-investigate",
  ui: "oh-facade",
  browser: "oh-browser",
  security: "oh-security",
  health: "oh-health",
  pipeline: "oh-manifest",
  review: "oh-review",
  simple: "oh-builder",
  handoff: "oh-handoff",
  fusion: "oh-fusion",
  refactor: "oh-refactor",
  retro: "oh-retro",
  worktree: "oh-worktree",
  docs: "oh-docs",
  learn: "oh-learn",
  pdf: "oh-pdf",
  ascii: "oh-ascii",
  "plan-review": "oh-plan-review",
  "self-diagnosis": "oh-expert",
} as const;

/**
 * Safety valve configuration.
 * Source: AUTOPILOT.md Safety Valves section.
 */
export const SAFETY_VALVES = {
  /** Maximum sub-agent delegation depth before loop guard stops. */
  maxDelegationDepth: 25,
  /** Maximum consecutive same-skill repeats before loop guard stops. */
  maxRoutingLoops: 5,
  /** Terminal route values that end the routing chain. */
  terminalRoutes: ["surface", "done", "oh-handoff"] as const,
} as const;

/**
 * Entry points — skills directly loaded by the autopilot classification matrix.
 */
export const ENTRY_POINTS: readonly string[] = [
  "oh-planner",
  "oh-investigate",
  "oh-facade",
  "oh-security",
  "oh-health",
  "oh-ascii",
  "oh-manifest",
  "oh-review",
  "oh-plan-review",
  "oh-builder",
  "oh-handoff",
  "oh-fusion",
  "oh-expert",
  "oh-refactor",
  "oh-retro",
  "oh-worktree",
  "oh-docs",
  "oh-learn",
  "oh-pdf",
] as const;

/**
 * Direct-user-request skills — invoked by name or trigger keywords, not through the routing graph.
 */
export const DIRECT_USER_SKILLS: readonly string[] = [
  "oh-browser",
  "oh-full-output",
  "oh-guard",
  "oh-init",
  "oh-issue",
  "oh-prd",
  "oh-skills-list",
  "oh-triage",
] as const;
