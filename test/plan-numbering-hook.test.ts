import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { HookResult } from "../harness/lib/hooks/types.ts";
import type { HookContext } from "../harness/lib/hooks/types.ts";

// ---------------------------------------------------------------------------
// Plan numbering hook test suite
// ---------------------------------------------------------------------------

describe("plan-numbering hook", () => {
  let hook: any;
  let storageDir: string;
  const tmpDirs: string[] = [];

  before(async () => {
    const mod = await import(
      "../harness/lib/hooks/builtins/plan-numbering-hook.ts"
    );
    hook = mod.planNumberingHook;
  });

  after(async () => {
    for (const d of tmpDirs) {
      fs.rmSync(d, { recursive: true, force: true });
    }
    // Reset global test state so other test files are not affected
    const { setPlanStorageDirForTest } = await import("../bootstrap.ts");
    setPlanStorageDirForTest(undefined);
  });

  function makeStorageDir(): string {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "oh-plans-"));
    tmpDirs.push(d);
    return d;
  }

  function makeProjectDir(): string {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "oh-project-"));
    tmpDirs.push(d);
    return d;
  }

  /**
   * Create a plan file at a specific number in the canonical storage layout.
   * Returns the absolute path to the plan file.
   */
  function createPlanFile(
    storageDir: string,
    projectDir: string,
    num: number,
    status: string = "active",
  ): string {
    const projectName = path.basename(projectDir);
    const planDir = path.join(storageDir, projectName);
    const seq = String(num).padStart(3, "0");
    const planPath = path.join(planDir, `plan-${seq}.md`);
    fs.mkdirSync(planDir, { recursive: true });
    fs.writeFileSync(
      planPath,
      [
        `# PLAN: ${projectName}`,
        "",
        `Plan ID: ${projectName}/plan-${seq}.md`,
        `Status: ${status}`,
        `Created: 2026-05-20 12:00`,
        `Updated: 2026-05-20 12:00`,
      ].join("\n"),
      "utf8",
    );
    return planPath;
  }

  function makeContext(projectDir: string): HookContext {
    return {
      sessionId: projectDir,
      agent: "oh-builder",
      directory: projectDir,
      sessions: new Map(),
    };
  }

  // -----------------------------------------------------------------------
  // Test: No plan references → CONTINUE
  // -----------------------------------------------------------------------
  it("returns CONTINUE when output has no plan references", async () => {
    const projectDir = makeProjectDir();
    const ctx = makeContext(projectDir);
    const output = "Everything is working fine. No plans here.";

    const result = await hook.execute(ctx, output);
    assert.equal(result.result, HookResult.CONTINUE);
    assert.equal(result.modifiedOutput, undefined);
  });

  // -----------------------------------------------------------------------
  // Test: Correct plan reference → CONTINUE
  // -----------------------------------------------------------------------
  it("returns CONTINUE when output references the correct next plan number", async () => {
    const storageDir = makeStorageDir();
    // Need to set plan storage so findLatestPlanFile reads from here
    const { setPlanStorageDirForTest } = await import("../bootstrap.ts");
    setPlanStorageDirForTest(storageDir);

    const projectDir = makeProjectDir();
    // Create plan-007 as the latest
    createPlanFile(storageDir, projectDir, 7);
    // Output references plan-008 (which is latest + 1 = correct)
    const output = "Writing the new plan to plan-008.md";
    const ctx = makeContext(projectDir);

    const result = await hook.execute(ctx, output);
    assert.equal(
      result.result,
      HookResult.CONTINUE,
      `Expected CONTINUE but got ${result.result}, output: ${result.modifiedOutput}`,
    );
    assert.equal(result.modifiedOutput, undefined);
  });

  // -----------------------------------------------------------------------
  // Test: Wrong plan reference (too low) → INJECT with corrected path
  // -----------------------------------------------------------------------
  it("returns INJECT when output references a plan number lower than the latest", async () => {
    const storageDir = makeStorageDir();
    const { setPlanStorageDirForTest } = await import("../bootstrap.ts");
    setPlanStorageDirForTest(storageDir);

    const projectDir = makeProjectDir();
    // Create plans 001-007
    for (let i = 1; i <= 7; i++) {
      createPlanFile(storageDir, projectDir, i);
    }
    // Output references plan-001 (wrong — should be plan-008)
    const output = "I will write the plan to plan-001.md";
    const ctx = makeContext(projectDir);

    const result = await hook.execute(ctx, output);
    assert.equal(result.result, HookResult.INJECT);
    assert.ok(result.modifiedOutput);
    assert.match(result.modifiedOutput!, /plan-008\.md/);
    assert.match(result.modifiedOutput!, /Fixed plan file path/);
    assert.doesNotMatch(result.modifiedOutput!, /plan-001\.md/);
  });

  // -----------------------------------------------------------------------
  // Test: Multiple wrong references — all replaced
  // -----------------------------------------------------------------------
  it("replaces all occurrences of the wrong plan number", async () => {
    const storageDir = makeStorageDir();
    const { setPlanStorageDirForTest } = await import("../bootstrap.ts");
    setPlanStorageDirForTest(storageDir);

    const projectDir = makeProjectDir();
    // Plans 001-005 exist
    for (let i = 1; i <= 5; i++) {
      createPlanFile(storageDir, projectDir, i);
    }
    // Output mentions plan-001 twice
    const output =
      "First I wrote plan-001.md, then I updated plan-001.md again.";
    const ctx = makeContext(projectDir);

    const result = await hook.execute(ctx, output);
    assert.equal(result.result, HookResult.INJECT);
    assert.ok(result.modifiedOutput);
    // The warning line has one occurrence, the fixed output has 2 = 3 total
    const matches = result.modifiedOutput!.match(/plan-006\.md/g);
    assert.equal(matches?.length, 3, "Both occurrences should be replaced (2 in body + 1 in warning)");
    // Verify the body portion (after the warning) has exactly 2
    const warningEnd = result.modifiedOutput!.indexOf("\n");
    const body = result.modifiedOutput!.slice(warningEnd + 1);
    const bodyMatches = body.match(/plan-006\.md/g);
    assert.equal(bodyMatches?.length, 2, "Both original occurrences should be replaced in the body");
  });

  // -----------------------------------------------------------------------
  // Test: File rename — wrong file on disk gets renamed
  // -----------------------------------------------------------------------
  it("renames an already-written wrong plan file on disk", async () => {
    const storageDir = makeStorageDir();
    const { setPlanStorageDirForTest } = await import("../bootstrap.ts");
    setPlanStorageDirForTest(storageDir);

    const projectDir = makeProjectDir();
    const projectName = path.basename(projectDir);

    // Create plans 001-003
    for (let i = 1; i <= 3; i++) {
      createPlanFile(storageDir, projectDir, i);
    }

    // Now simulate a subagent that already wrote plan-001.md (wrong)
    const planDir = path.join(storageDir, projectName);
    const wrongFilePath = path.join(planDir, "plan-001.md");
    // It already exists from createPlanFile above. Let's verify it's there.
    assert.ok(fs.existsSync(wrongFilePath), "plan-001.md should exist");

    // Output references plan-001 (wrong)
    const output = "Wrote changes to plan-001.md";
    const ctx = makeContext(projectDir);

    const result = await hook.execute(ctx, output);
    assert.equal(result.result, HookResult.INJECT);
    assert.ok(result.modifiedOutput);

    // After the hook runs, plan-001 should be renamed to plan-004
    // (latest was 003, so next is 004)
    const rightFilePath = path.join(planDir, "plan-004.md");
    assert.ok(fs.existsSync(rightFilePath), "plan-004.md should exist after rename");
    // The content should be the original plan-001 content
    const content = fs.readFileSync(rightFilePath, "utf8");
    assert.match(content, /Plan ID:/);
  });

  // -----------------------------------------------------------------------
  // Test: Empty plan dir — no plans exist → CONTINUE
  // -----------------------------------------------------------------------
  it("returns CONTINUE when no plan files exist yet", async () => {
    const storageDir = makeStorageDir();
    const { setPlanStorageDirForTest } = await import("../bootstrap.ts");
    setPlanStorageDirForTest(storageDir);

    const projectDir = makeProjectDir();
    // No plan files created — empty directory
    const output = "Creating plan-001.md for the first time";
    const ctx = makeContext(projectDir);

    const result = await hook.execute(ctx, output);
    assert.equal(
      result.result,
      HookResult.CONTINUE,
      "Should return CONTINUE when no plans exist to validate against",
    );
  });

  // -----------------------------------------------------------------------
  // Test: Multiple different wrong plan numbers
  // -----------------------------------------------------------------------
  it("handles multiple different wrong plan numbers and replaces all", async () => {
    const storageDir = makeStorageDir();
    const { setPlanStorageDirForTest } = await import("../bootstrap.ts");
    setPlanStorageDirForTest(storageDir);

    const projectDir = makeProjectDir();
    // Plans 001-010 exist
    for (let i = 1; i <= 10; i++) {
      createPlanFile(storageDir, projectDir, i);
    }
    // Output mentions plan-001 and plan-005 (both wrong)
    const output =
      "First wrote plan-001.md, then updated plan-005.md";
    const ctx = makeContext(projectDir);

    const result = await hook.execute(ctx, output);
    assert.equal(result.result, HookResult.INJECT);
    assert.ok(result.modifiedOutput);
    // Both should be replaced with plan-011
    assert.doesNotMatch(result.modifiedOutput!, /plan-001\.md/);
    assert.doesNotMatch(result.modifiedOutput!, /plan-005\.md/);
    assert.match(result.modifiedOutput!, /plan-011\.md/);
  });
});
