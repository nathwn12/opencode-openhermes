import { describe, it, before } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe("composer", () => {
  let mod: {
    compose: (opts?: { phases?: string[] }) => string
    composeFragment: (name: string) => string
    listFragments: () => string[]
  }

  before(async () => {
    mod = await import("./compose.ts")
  })

  it("listFragments returns all 9 fragment names", () => {
    const names = mod.listFragments()
    assert.equal(names.length, 9)
    assert.deepEqual(names, [
      "01-identity",
      "02-delegation",
      "03-permissions",
      "04-task-flow",
      "05-confidence",
      "06-parallelization",
      "07-shell",
      "08-routing",
      "09-guardrails",
    ])
  })

  it("composeFragment returns correct trimmed content for each fragment", () => {
    // 01-identity
    const identity = mod.composeFragment("01-identity")
    assert.ok(identity.startsWith("You are OpenHermes"), "identity starts with intro")
    assert.ok(identity.endsWith("concise."), "identity ends with concise.")
    assert.ok(!identity.endsWith("\n"), "identity has no trailing newline")
    assert.ok(!identity.includes("## Core Behaviors"), "identity does not include core behaviors")

    // 02-delegation
    const delegation = mod.composeFragment("02-delegation")
    assert.ok(delegation.startsWith("## Core Behaviors"), "delegation starts with Core Behaviors")
    assert.ok(delegation.includes("Enforced delegation"), "delegation mentions enforced delegation")
    assert.ok(!delegation.endsWith("\n"), "delegation has no trailing newline")

    // 03-permissions
    const permissions = mod.composeFragment("03-permissions")
    assert.ok(permissions.startsWith("## Permissions"), "permissions starts with Permissions")
    assert.ok(permissions.includes("DENIED"), "permissions mentions DENIED")

    // 04-task-flow
    const taskFlow = mod.composeFragment("04-task-flow")
    assert.ok(taskFlow.startsWith("## Task Flow"), "task-flow starts with Task Flow")
    assert.ok(taskFlow.includes("dispatch to oh-builder immediately"), "task-flow prefers immediate implementation dispatch")
    assert.ok(taskFlow.includes("concrete, low-risk, and fixable"), "task-flow keeps the low-risk fix gate explicit")

    // 05-confidence
    const confidence = mod.composeFragment("05-confidence")
    assert.ok(confidence.startsWith("## Stop Conditions"), "confidence starts with Stop Conditions")
    assert.ok(!confidence.includes("## Parallelization"), "confidence does not include parallelization")

    // 06-parallelization
    const parallelization = mod.composeFragment("06-parallelization")
    assert.ok(parallelization.startsWith("## Parallelization Rules"), "parallelization starts with Parallelization Rules")
    assert.ok(parallelization.includes("ALWAYS parallelize"), "parallelization mentions ALWAYS parallelize")

    // 07-shell
    const shell = mod.composeFragment("07-shell")
    assert.ok(shell.startsWith("## Confidence Gate Examples"), "shell starts with Confidence Gate Examples")
    assert.ok(shell.includes("## Shell Awareness (Windows)"), "shell includes Shell Awareness")
    assert.ok(shell.includes("Shell Pre-flight"), "shell includes Shell Pre-flight")

    // 08-routing
    const routing = mod.composeFragment("08-routing")
    assert.ok(routing.startsWith("## Plan Storage"), "routing starts with Plan Storage")
    assert.ok(!routing.includes("## Guardrails"), "routing does not include guardrails")

    // 09-guardrails
    const guardrails = mod.composeFragment("09-guardrails")
    assert.ok(guardrails.startsWith("## Guardrails"), "guardrails starts with Guardrails")
    assert.ok(guardrails.includes("## Routing"), "guardrails includes Routing")
    assert.ok(guardrails.includes("dispatch to oh-builder immediately"), "guardrails prefer immediate implementation dispatch")

    const ethos = fs.readFileSync(path.resolve(__dirname, "..", "..", "..", "ETHOS.md"), "utf8")
    assert.ok(!ethos.includes("harness/commands/"), "ethos no longer hard-codes harness/commands path")
    assert.ok(ethos.includes("command markdown"), "ethos keeps the command-doc concept")

    const context = fs.readFileSync(path.resolve(__dirname, "..", "..", "..", "CONTEXT.md"), "utf8")
    assert.ok(!context.includes("harness/commands/"), "context no longer hard-codes harness/commands path")
    assert.ok(context.includes("legacy compatibility loaders"), "context preserves compatibility note")
  })

  it("composeFragment throws for unknown fragment", () => {
    assert.throws(() => mod.composeFragment("nonexistent"), {
      name: "Error",
      message: /Fragment "nonexistent" not found/,
    })
  })

  it("compose() includes all canonical sections in correct order", () => {
    // Read the original openhermes.md and extract body
    const agentPath = path.resolve(__dirname, "..", "..", "agents", "openhermes.md")
    const source = fs.readFileSync(agentPath, "utf8")
    const match = source.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/)

    // The original body (before modification) is embedded as the fragments.
    // The current openhermes.md now has a different body (reference text).
    // We compare against the composed output from the canonical fragments.
    const composed = mod.compose()

    // Verify it has all expected sections
    assert.ok(composed.includes("You are OpenHermes"), "contains identity")
    assert.ok(composed.includes("## Core Behaviors"), "contains core behaviors")
    assert.ok(composed.includes("## Permissions"), "contains permissions")
    assert.ok(composed.includes("## Task Flow"), "contains task flow")
    assert.ok(composed.includes("## Stop Conditions"), "contains stop conditions")
    assert.ok(composed.includes("## Parallelization Rules"), "contains parallelization rules")
    assert.ok(composed.includes("## Confidence Gate Examples"), "contains confidence gate examples")
    assert.ok(composed.includes("## Shell Awareness (Windows)"), "contains shell awareness")
    assert.ok(composed.includes("## Plan Storage"), "contains plan storage")
    assert.ok(composed.includes("## Guardrails"), "contains guardrails")
    assert.ok(composed.includes("## Routing"), "contains routing")

    // Verify section ordering matches canonical
    const routingIdx = composed.indexOf("## Routing")
    const guardrailsIdx = composed.indexOf("## Guardrails")
    assert.ok(routingIdx > guardrailsIdx, "Routing comes after Guardrails")

    // Verify CRLF line endings
    assert.ok(composed.includes("\r\n"), "uses CRLF line endings")

    // Verify no trailing newline
    assert.ok(!composed.endsWith("\n"), "no trailing newline")
    assert.ok(!composed.endsWith("\r"), "no trailing carriage return")
  })

  it("compose() with phases filters correctly", () => {
    // Filter by "identity" → only identity fragment
    const identityOnly = mod.compose({ phases: ["identity"] })
    assert.ok(identityOnly.includes("You are OpenHermes"), "filtered identity includes intro")
    assert.ok(!identityOnly.includes("## Core Behaviors"), "filtered identity excludes other sections")

    // Filter by routing-related phases
    const routingOnly = mod.compose({ phases: ["routing", "guardrails"] })
    assert.ok(routingOnly.includes("## Plan Storage"), "routing filter includes plan storage")
    assert.ok(routingOnly.includes("## Guardrails"), "routing filter includes guardrails")
    assert.ok(routingOnly.includes("## Routing"), "routing filter includes routing")
    assert.ok(!routingOnly.includes("## Core Behaviors"), "routing filter excludes core behaviors")

    // Empty phases → no fragments
    const empty = mod.compose({ phases: [] })
    assert.equal(empty, "", "empty phases returns empty string")
  })

  it("compose() fragments join with \\r\\n\\r\\n separator", () => {
    const composed = mod.compose()

    // Verify the separator between sections
    // Between identity and delegation
    assert.ok(composed.includes("concise.\r\n\r\n## Core Behaviors"),
      "identity and delegation separated by \\r\\n\\r\\n")

    // Between delegation and permissions
    assert.ok(composed.includes("delegating.\r\n\r\n## Permissions"),
      "delegation and permissions separated by \\r\\n\\r\\n")
  })

  it("listFragments returns fragments in sorted order", () => {
    const names = mod.listFragments()
    // Verify numeric prefix sort
    for (let i = 0; i < names.length - 1; i++) {
      assert.ok(names[i] < names[i + 1], `fragments sorted: ${names[i]} < ${names[i + 1]}`)
    }
  })
})
