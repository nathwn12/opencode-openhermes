import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";

import { MemoryManager } from "./memory-manager.ts";
import { PlanStore } from "./plan-store.ts";
import { MemoryLevel, DEFAULT_BUDGETS } from "./interfaces.ts";
import type { MemoryEntry, Finding, Decision } from "./interfaces.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tmpdir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "memory-test-"));
}

// ---------------------------------------------------------------------------
// MemoryManager tests
// ---------------------------------------------------------------------------

describe("MemoryManager", () => {
  beforeEach(() => {
    MemoryManager.resetInstance();
  });

  afterEach(() => {
    MemoryManager.resetInstance();
  });

  // ---- 1: add() creates entry with correct level ---------------------------

  it("add() creates an entry at the given level", () => {
    const mm = MemoryManager.getInstance();
    const entry = mm.add(MemoryLevel.MISSION, "Test mission entry", 0.8);

    assert.ok(entry.id, "entry must have an id");
    assert.equal(entry.level, MemoryLevel.MISSION);
    assert.equal(entry.content, "Test mission entry");
    assert.equal(entry.importance, 0.8);
    assert.ok(entry.timestamp > 0, "timestamp must be set");
  });

  // ---- 2: getEntries() returns entries at all levels ----------------------

  it("getEntries() returns all entries when no level filter", () => {
    const mm = MemoryManager.getInstance();
    mm.add(MemoryLevel.SYSTEM, "sys", 1.0);
    mm.add(MemoryLevel.PROJECT, "proj", 0.5);
    mm.add(MemoryLevel.TASK, "task", 0.3);

    const all = mm.getEntries();
    assert.equal(all.length, 3);
  });

  // ---- 3: getEntries() filters by level -----------------------------------

  it("getEntries() filters by level", () => {
    const mm = MemoryManager.getInstance();
    mm.add(MemoryLevel.SYSTEM, "sys", 1.0);
    mm.add(MemoryLevel.PROJECT, "proj", 0.5);

    const sys = mm.getEntries(MemoryLevel.SYSTEM);
    assert.equal(sys.length, 1);
    assert.equal(sys[0].level, MemoryLevel.SYSTEM);
  });

  // ---- 4: getEntryCount() returns correct count ---------------------------

  it("getEntryCount() returns correct count", () => {
    const mm = MemoryManager.getInstance();
    assert.equal(mm.getEntryCount(MemoryLevel.TASK), 0);

    mm.add(MemoryLevel.TASK, "t1", 0.5);
    mm.add(MemoryLevel.TASK, "t2", 0.3);
    assert.equal(mm.getEntryCount(MemoryLevel.TASK), 2);
  });

  // ---- 5: entries sorted by importance DESC -------------------------------

  it("entries are sorted by importance descending", () => {
    const mm = MemoryManager.getInstance();
    mm.add(MemoryLevel.TASK, "low", 0.1);
    mm.add(MemoryLevel.TASK, "high", 0.9);
    mm.add(MemoryLevel.TASK, "mid", 0.5);

    const entries = mm.getEntries(MemoryLevel.TASK);
    assert.equal(entries[0].content, "high");
    assert.equal(entries[1].content, "mid");
    assert.equal(entries[2].content, "low");
  });

  // ---- 6: budget enforcement ----------------------------------------------

  it("prunes when budget is exceeded", () => {
    const mm = MemoryManager.getInstance({
      budgets: { [MemoryLevel.TASK]: 3 },
    });

    mm.add(MemoryLevel.TASK, "keep-1", 0.9);
    mm.add(MemoryLevel.TASK, "keep-2", 0.8);
    mm.add(MemoryLevel.TASK, "keep-3", 0.7);
    mm.add(MemoryLevel.TASK, "drop-1", 0.1);
    mm.add(MemoryLevel.TASK, "drop-2", 0.2);

    assert.equal(mm.getEntryCount(MemoryLevel.TASK), 3);
    const entries = mm.getEntries(MemoryLevel.TASK);
    const contents = entries.map((e) => e.content);
    assert.ok(contents.includes("keep-1"));
    assert.ok(contents.includes("keep-2"));
    assert.ok(contents.includes("keep-3"));
    assert.ok(!contents.includes("drop-1"));
    assert.ok(!contents.includes("drop-2"));
  });

  // ---- 7: importance is clamped to [0, 1] ---------------------------------

  it("clamps importance to [0, 1]", () => {
    const mm = MemoryManager.getInstance();
    const e1 = mm.add(MemoryLevel.TASK, "too-high", 5.0);
    const e2 = mm.add(MemoryLevel.TASK, "too-low", -1.0);

    assert.equal(e1.importance, 1.0);
    assert.equal(e2.importance, 0.0);
  });

  // ---- 8: clearLevel clears only the specified level ----------------------

  it("clearLevel clears only the specified level", () => {
    const mm = MemoryManager.getInstance();
    mm.add(MemoryLevel.SYSTEM, "sys", 1.0);
    mm.add(MemoryLevel.MISSION, "mission", 0.5);
    mm.add(MemoryLevel.TASK, "task", 0.3);

    mm.clearLevel(MemoryLevel.TASK);

    assert.equal(mm.getEntryCount(MemoryLevel.TASK), 0);
    assert.equal(mm.getEntryCount(MemoryLevel.SYSTEM), 1);
    assert.equal(mm.getEntryCount(MemoryLevel.MISSION), 1);
  });

  // ---- 9: export / import round-trip --------------------------------------

  it("export/import round-trip preserves all entries", () => {
    const mm = MemoryManager.getInstance();
    mm.add(MemoryLevel.SYSTEM, "sys-1", 1.0);
    mm.add(MemoryLevel.SYSTEM, "sys-2", 0.9);
    mm.add(MemoryLevel.PROJECT, "proj-1", 0.5);
    mm.add(MemoryLevel.MISSION, "mission-1", 0.8);
    mm.add(MemoryLevel.TASK, "task-1", 0.3);

    const snapshot = mm.export();
    assert.equal(snapshot.system.length, 2);
    assert.equal(snapshot.project.length, 1);
    assert.equal(snapshot.mission.length, 1);
    assert.equal(snapshot.task.length, 1);

    // Import into a fresh instance
    MemoryManager.resetInstance();
    const mm2 = MemoryManager.getInstance();
    mm2.import(snapshot);

    assert.equal(mm2.getEntryCount(MemoryLevel.SYSTEM), 2);
    assert.equal(mm2.getEntryCount(MemoryLevel.PROJECT), 1);
    assert.equal(mm2.getEntryCount(MemoryLevel.MISSION), 1);
    assert.equal(mm2.getEntryCount(MemoryLevel.TASK), 1);

    // Verify content preserved
    const sysEntries = mm2.getEntries(MemoryLevel.SYSTEM);
    assert.equal(sysEntries[0].content, "sys-1");
    assert.equal(sysEntries[1].content, "sys-2");
  });

  // ---- 10: getContext produces formatted output ---------------------------

  it("getContext returns formatted output", () => {
    const mm = MemoryManager.getInstance();
    mm.add(MemoryLevel.SYSTEM, "OpenHermes identity", 1.0);
    mm.add(MemoryLevel.MISSION, "Implement feature X", 0.8);

    const ctx = mm.getContext();
    assert.ok(ctx.includes("== SYSTEM =="));
    assert.ok(ctx.includes("== MISSION =="));
    assert.ok(ctx.includes("OpenHermes identity"));
    assert.ok(ctx.includes("Implement feature X"));

    // Verify each line has importance
    const lines = ctx.split("\n");
    const sysLine = lines.find((l) => l.includes("OpenHermes identity"));
    assert.ok(sysLine, "must find system line");
    assert.match(sysLine!, /\[1\.00\]/);
  });

  // ---- 11: getContext with query filters by relevance ---------------------

  it("getContext filters by query string", () => {
    const mm = MemoryManager.getInstance();
    mm.add(MemoryLevel.SYSTEM, "OpenHermes identity", 1.0);
    mm.add(MemoryLevel.MISSION, "Implement feature X", 0.8);
    mm.add(MemoryLevel.PROJECT, "Database schema design", 0.6);

    const ctx = mm.getContext("feature");
    assert.ok(ctx.includes("Implement feature X"));
    assert.ok(!ctx.includes("OpenHermes identity"));
    assert.ok(!ctx.includes("Database schema"));
  });

  // ---- 12: getContext with empty query returns all ------------------------

  it("getContext with empty query returns all", () => {
    const mm = MemoryManager.getInstance();
    mm.add(MemoryLevel.SYSTEM, "entry-1", 1.0);
    mm.add(MemoryLevel.PROJECT, "entry-2", 0.5);

    const ctx = mm.getContext("");
    assert.ok(ctx.includes("entry-1"));
    assert.ok(ctx.includes("entry-2"));
  });

  // ---- 13: Default budgets match spec -------------------------------------

  it("has correct default budgets", () => {
    assert.equal(DEFAULT_BUDGETS[MemoryLevel.SYSTEM], 50);
    assert.equal(DEFAULT_BUDGETS[MemoryLevel.PROJECT], 100);
    assert.equal(DEFAULT_BUDGETS[MemoryLevel.MISSION], 30);
    assert.equal(DEFAULT_BUDGETS[MemoryLevel.TASK], 20);
  });

  // ---- 14: setBudgets re-prunes -------------------------------------------

  it("setBudgets re-prunes after changing budgets", () => {
    const mm = MemoryManager.getInstance({
      budgets: { [MemoryLevel.TASK]: 10 },
    });

    mm.add(MemoryLevel.TASK, "e1", 0.9);
    mm.add(MemoryLevel.TASK, "e2", 0.8);
    mm.add(MemoryLevel.TASK, "e3", 0.7);

    // Reduce budget to 2 — should prune 1
    mm.setBudgets({ [MemoryLevel.TASK]: 2 });
    assert.equal(mm.getEntryCount(MemoryLevel.TASK), 2);
  });

  // ---- 15: metadata stored and formatted ----------------------------------

  it("metadata is stored on entries", () => {
    const mm = MemoryManager.getInstance();
    const entry = mm.add(MemoryLevel.TASK, "with meta", 0.5, {
      source: "test",
      phase: "red",
    });

    assert.deepEqual(entry.metadata, { source: "test", phase: "red" });
  });
});

// ---------------------------------------------------------------------------
// PlanStore tests
// ---------------------------------------------------------------------------

describe("PlanStore", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = tmpdir();
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // ---- 16: readPlan returns defaults for missing file ----------------------

  it("readPlan returns defaults for non-existent file", async () => {
    const result = await PlanStore.readPlan(
      path.join(testDir, "nonexistent.md"),
    );
    assert.deepEqual(result.tasks, []);
    assert.deepEqual(result.memory, []);
    assert.deepEqual(result.findings, []);
    assert.deepEqual(result.decisions, []);
  });

  // ---- 17: writePlan / readPlan round-trip --------------------------------

  it("writePlan and readPlan round-trip preserves data", async () => {
    const planPath = path.join(testDir, "plan-001.md");

    const data = {
      tasks: [
        { id: randomUUID(), description: "Task A", status: "pending" as const, dependsOn: [] },
        { id: randomUUID(), description: "Task B", status: "completed" as const, dependsOn: ["task-a"] },
      ],
      memory: [
        { id: randomUUID(), level: MemoryLevel.PROJECT, content: "Use TypeScript", importance: 0.9, timestamp: Date.now() },
      ],
      findings: [
        { id: randomUUID(), sessionId: "sess-1", description: "Found bug", severity: "blocker" as const, timestamp: Date.now() },
      ],
      decisions: [
        { id: randomUUID(), sessionId: "sess-1", description: "Use Bun", rationale: "Fastest runtime", timestamp: Date.now() },
      ],
    };

    await PlanStore.writePlan(planPath, data);
    assert.ok(fs.existsSync(planPath));

    const loaded = await PlanStore.readPlan(planPath);

    // Tasks
    assert.equal(loaded.tasks.length, 2);
    assert.equal(loaded.tasks[0].description, "Task A");
    assert.equal(loaded.tasks[0].status, "pending");
    assert.equal(loaded.tasks[1].description, "Task B");
    assert.equal(loaded.tasks[1].status, "completed");

    // Memory
    assert.equal(loaded.memory.length, 1);
    assert.equal(loaded.memory[0].content, "Use TypeScript");

    // Findings
    assert.equal(loaded.findings.length, 1);
    assert.equal(loaded.findings[0].description, "Found bug");

    // Decisions
    assert.equal(loaded.decisions.length, 1);
    assert.equal(loaded.decisions[0].description, "Use Bun");
  });

  // ---- 18: addFinding appends to file ------------------------------------

  it("addFinding appends a finding to the plan file", async () => {
    const planPath = path.join(testDir, "plan-002.md");
    const sessionId = "sess-test";

    // Write initial empty plan
    await PlanStore.writePlan(planPath, {
      tasks: [],
      memory: [],
      findings: [],
      decisions: [],
    });

    await PlanStore.addFinding(planPath, sessionId, {
      description: "Critical bug discovered",
      severity: "blocker",
    });

    const data = await PlanStore.readPlan(planPath);
    assert.equal(data.findings.length, 1);
    assert.equal(data.findings[0].description, "Critical bug discovered");
    assert.equal(data.findings[0].severity, "blocker");
    assert.equal(data.findings[0].sessionId, sessionId);
  });

  // ---- 19: addDecision appends to file ------------------------------------

  it("addDecision appends a decision to the plan file", async () => {
    const planPath = path.join(testDir, "plan-003.md");
    const sessionId = "sess-dec";

    await PlanStore.writePlan(planPath, {
      tasks: [],
      memory: [],
      findings: [],
      decisions: [],
    });

    await PlanStore.addDecision(planPath, sessionId, {
      description: "Use singleton pattern",
      rationale: "Ensures single instance across sessions",
    });

    const data = await PlanStore.readPlan(planPath);
    assert.equal(data.decisions.length, 1);
    assert.equal(data.decisions[0].description, "Use singleton pattern");
    assert.equal(data.decisions[0].rationale, "Ensures single instance across sessions");
    assert.equal(data.decisions[0].sessionId, sessionId);
  });

  // ---- 20: writePlan preserves existing header ----------------------------

  it("writePlan preserves existing header", async () => {
    const planPath = path.join(testDir, "plan-004.md");

    // Write initial plan with header
    const header = [
      "# PLAN: test-project",
      "Plan ID: test-project/plan-004.md",
      "Status: active",
      "",
    ].join("\n");
    fs.writeFileSync(planPath, header, "utf8");

    await PlanStore.writePlan(planPath, {
      tasks: [{ id: randomUUID(), description: "Do something", status: "pending", dependsOn: [] }],
      memory: [],
      findings: [],
      decisions: [],
    });

    const content = fs.readFileSync(planPath, "utf8");
    assert.ok(content.includes("# PLAN: test-project"));
    assert.ok(content.includes("Status: active"));
    assert.ok(content.includes("## Tasks"));
    assert.ok(content.includes("Do something"));
  });

  // ---- 21: getMerged returns empty for now --------------------------------

  it("getMerged returns empty for now", async () => {
    const result = await PlanStore.getMerged("session-1");
    assert.deepEqual(result, []);
  });
});

// ---------------------------------------------------------------------------
// Integration: MemoryManager + PlanStore
// ---------------------------------------------------------------------------

describe("Memory integration", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = tmpdir();
    MemoryManager.resetInstance();
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    MemoryManager.resetInstance();
  });

  it("can persist memory entries through PlanStore", async () => {
    const planPath = path.join(testDir, "plan-integration.md");
    const mm = MemoryManager.getInstance();

    mm.add(MemoryLevel.PROJECT, "Project convention: use Bun", 0.9);
    mm.add(MemoryLevel.MISSION, "Implement memory system", 0.8);

    // Export memory and write to plan
    const snapshot = mm.export();
    const allMemory = [
      ...snapshot.system,
      ...snapshot.project,
      ...snapshot.mission,
      ...snapshot.task,
    ];

    await PlanStore.writePlan(planPath, {
      tasks: [],
      memory: allMemory,
      findings: [],
      decisions: [],
    });

    // Read back
    const loaded = await PlanStore.readPlan(planPath);
    assert.equal(loaded.memory.length, 2);

    const contents = loaded.memory.map((m) => m.content);
    assert.ok(contents.includes("Project convention: use Bun"));
    assert.ok(contents.includes("Implement memory system"));

    // Import back into fresh MemoryManager
    MemoryManager.resetInstance();
    const mm2 = MemoryManager.getInstance();
    const restored: MemoryEntry[] = [];

    // Split back into levels
    for (const entry of loaded.memory) {
      restored.push(entry);
    }

    // Group by level and import
    const importSnapshot = {
      system: restored.filter((e) => e.level === MemoryLevel.SYSTEM),
      project: restored.filter((e) => e.level === MemoryLevel.PROJECT),
      mission: restored.filter((e) => e.level === MemoryLevel.MISSION),
      task: restored.filter((e) => e.level === MemoryLevel.TASK),
    };
    mm2.import(importSnapshot);

    assert.equal(mm2.getEntryCount(MemoryLevel.PROJECT), 1);
    assert.equal(mm2.getEntryCount(MemoryLevel.MISSION), 1);
  });
});
