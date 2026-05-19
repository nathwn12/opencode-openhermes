import { describe, it, after } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { readPlanSummary, resolvePlanAccess, setPlanStorageDirForTest } from "../harness/lib/plans/plan-location.ts"

describe("plan-location imports", () => {
  const storageDirs: string[] = []

  after(() => {
    setPlanStorageDirForTest(undefined)
    for (const d of storageDirs) {
      if (fs.existsSync(d)) {
        fs.rmSync(d, { recursive: true, force: true })
      }
    }
  })

  it("imports hook modules without bootstrap cycle failure", async () => {
    await import("../harness/lib/hooks/builtins/plan-check-hook.ts")
  })

  it("resolvePlanAccess and readPlanSummary use the same latest plan", () => {
    const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), "oh-plan-location-"))
    storageDirs.push(storageDir)
    const projectDir = path.join(storageDir, "workspace", "project-a")
    const projectPlanDir = path.join(storageDir, "project-a")
    fs.mkdirSync(projectDir, { recursive: true })
    fs.mkdirSync(projectPlanDir, { recursive: true })
    setPlanStorageDirForTest(storageDir)

    fs.writeFileSync(
      path.join(projectPlanDir, "plan-001.md"),
      ["# PLAN: project-a", "Status: complete", "Objective: first", ""].join("\n"),
      "utf8",
    )
    fs.writeFileSync(
      path.join(projectPlanDir, "plan-002.md"),
      ["# PLAN: project-a", "Status: active", "Objective: latest", ""].join("\n"),
      "utf8",
    )

    const access = resolvePlanAccess(projectDir)
    assert.ok(access)
    assert.equal(access?.path, path.join(projectPlanDir, "plan-002.md"))
    assert.equal(access?.summary, "Active plan: status=active | objective=latest")
    assert.equal(readPlanSummary(projectDir), access?.summary)
  })

  it("resolvePlanAccess resolves a plan when only one marker is present", () => {
    const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), "oh-plan-location-"))
    storageDirs.push(storageDir)
    const projectDir = path.join(storageDir, "workspace", "project-a")
    const projectPlanDir = path.join(storageDir, "project-a")
    fs.mkdirSync(projectDir, { recursive: true })
    fs.mkdirSync(projectPlanDir, { recursive: true })
    setPlanStorageDirForTest(storageDir)

    const statusOnly = path.join(projectPlanDir, "plan-001.md")
    fs.writeFileSync(statusOnly, ["# PLAN: project-a", "Status: active", ""].join("\n"), "utf8")
    const statusAccess = resolvePlanAccess(projectDir)
    assert.ok(statusAccess)
    assert.equal(statusAccess?.path, statusOnly)
    assert.equal(statusAccess?.summary, "Active plan: status=active")

    const objectiveOnly = path.join(projectPlanDir, "plan-002.md")
    fs.writeFileSync(objectiveOnly, ["# PLAN: project-a", "Objective: keep moving", ""].join("\n"), "utf8")
    const objectiveAccess = resolvePlanAccess(projectDir)
    assert.ok(objectiveAccess)
    assert.equal(objectiveAccess?.path, objectiveOnly)
    assert.equal(objectiveAccess?.summary, "Active plan: objective=keep moving")
  })
})
