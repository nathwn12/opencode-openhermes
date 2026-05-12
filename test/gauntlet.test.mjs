import { describe, it } from "node:test"
import assert from "node:assert/strict"

const p = await import("../lib/pipeline.mjs")

describe("DEFAULT_STAGES", () => {
  it("is an array with 5 elements", () => {
    assert.ok(Array.isArray(p.DEFAULT_STAGES))
    assert.equal(p.DEFAULT_STAGES.length, 5)
  })

  it("each stage has required fields", () => {
    for (const s of p.DEFAULT_STAGES) {
      assert.equal(typeof s.name, "string", `stage ${s.name} missing name`)
      assert.equal(typeof s.label, "string", `stage ${s.name} missing label`)
      assert.equal(typeof s.description, "string", `stage ${s.name} missing description`)
      assert.equal(typeof s.agent, "string", `stage ${s.name} missing agent`)
      assert.equal(typeof s.severity, "string", `stage ${s.name} missing severity`)
      assert.equal(typeof s.autoFix, "boolean", `stage ${s.name} missing autoFix`)
      assert.equal(typeof s.weight, "number", `stage ${s.name} missing weight`)
      assert.equal(typeof s.timeout, "number", `stage ${s.name} missing timeout`)
    }
  })

  it("all stage names are unique", () => {
    const names = p.DEFAULT_STAGES.map(s => s.name)
    assert.equal(new Set(names).size, names.length)
  })

  it("weights sum to 1.0 (excluding report stage)", () => {
    const total = p.DEFAULT_STAGES
      .filter(s => s.name !== "report")
      .reduce((sum, s) => sum + s.weight, 0)
    assert.equal(Math.round(total * 100) / 100, 1.0)
  })
})

describe("scoreStage", () => {
  it("returns 1.0 for empty findings", () => {
    assert.equal(p.scoreStage([]), 1.0)
  })

  it("returns 0.0 for critical finding", () => {
    assert.equal(p.scoreStage([{ severity: "critical" }]), 0.0)
  })

  it("returns 0.3 for high finding", () => {
    assert.equal(p.scoreStage([{ severity: "high" }]), 0.3)
  })

  it("returns 0.7 for medium finding", () => {
    assert.equal(p.scoreStage([{ severity: "medium" }]), 0.7)
  })

  it("returns 0.9 for low finding", () => {
    assert.equal(p.scoreStage([{ severity: "low" }]), 0.9)
  })

  it("multiple medium findings reduce score below 0.7", () => {
    const findings = [{ severity: "medium" }, { severity: "medium" }]
    const score = p.scoreStage(findings)
    assert.ok(score < 0.7, `expected score < 0.7, got ${score}`)
  })

  it("multiple high findings reduce score", () => {
    const findings = [{ severity: "high" }, { severity: "high" }]
    const score = p.scoreStage(findings)
    assert.ok(score < 0.3, `expected score < 0.3, got ${score}`)
  })
})

describe("scoreOverall", () => {
  it("one clean stage at weight 1.0 returns that stage's score", () => {
    const result = p.scoreOverall({
      scope: { name: "scope", score: 1.0, weight: 1.0 },
    })
    assert.equal(result, 1.0)
  })

  it("two stages at equal weight returns average", () => {
    const result = p.scoreOverall({
      a: { name: "a", score: 1.0, weight: 0.5 },
      b: { name: "b", score: 0.5, weight: 0.5 },
    })
    assert.equal(result, 0.75)
  })
})

describe("shipRecommendation", () => {
  it("0.95 returns ship", () => {
    assert.equal(p.shipRecommendation(0.95), "ship")
  })

  it("0.80 returns review", () => {
    assert.equal(p.shipRecommendation(0.80), "review")
  })

  it("0.60 returns block", () => {
    assert.equal(p.shipRecommendation(0.60), "block")
  })

  it("1.0 returns ship", () => {
    assert.equal(p.shipRecommendation(1.0), "ship")
  })

  it("0.7 returns review", () => {
    assert.equal(p.shipRecommendation(0.7), "review")
  })

  it("0.0 returns block", () => {
    assert.equal(p.shipRecommendation(0.0), "block")
  })
})

describe("createPipeline", () => {
  it("returns an object with stages, opts, results, run, runStage", () => {
    const pipe = p.createPipeline({})
    assert.ok(Array.isArray(pipe.stages))
    assert.equal(typeof pipe.opts, "object")
    assert.ok(pipe.results instanceof Map)
    assert.equal(typeof pipe.run, "function")
    assert.equal(typeof pipe.runStage, "function")
  })

  it("filters to only scope stage when stagesFilter is set", () => {
    const pipe = p.createPipeline({ stagesFilter: ["scope"] })
    assert.equal(pipe.stages.length, 1)
    assert.equal(pipe.stages[0].name, "scope")
  })

  it("marks skipped stages when skip is set", () => {
    const pipe = p.createPipeline({ skip: ["quality"] })
    assert.ok(pipe._skipped.includes("quality"))
    assert.equal(pipe.stages.length, 5)
  })
})

describe("generateReport", () => {
  const result = {
    score: 0.85,
    ship: "review",
    duration: 1234,
    startedAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:01.234Z",
    stages: {
      scope: { name: "scope", status: "passed", score: 0.9, findings: [{ severity: "low" }], summary: "Clean scope" },
      security: { name: "security", status: "passed", score: 0.85, findings: [], summary: "No issues" },
    },
  }

  it("output contains Quality Score and Ship Recommendation", () => {
    const report = p.generateReport(result)
    assert.ok(report.includes("Quality Score"), `missing Quality Score in:\n${report}`)
    assert.ok(report.includes("Ship Recommendation"), `missing Ship Recommendation in:\n${report}`)
  })

  it("output contains each stage name from results", () => {
    const report = p.generateReport(result)
    assert.ok(report.includes("scope"), "missing scope stage")
    assert.ok(report.includes("security"), "missing security stage")
  })
})
