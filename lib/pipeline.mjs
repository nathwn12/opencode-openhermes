export const DEFAULT_STAGES = [
  {
    name: "scope",
    label: "Scope Check",
    description: "Verify diff matches intent, no scope drift",
    agent: "oh-auditor",
    severity: "high",
    autoFix: false,
    weight: 0.20,
    timeout: 60000,
  },
  {
    name: "security",
    label: "Security Review",
    description: "OWASP Top 10, injection, XSS, auth flaws, secrets exposure",
    agent: "oh-warden",
    severity: "critical",
    autoFix: false,
    weight: 0.35,
    timeout: 90000,
  },
  {
    name: "review",
    label: "Code Review",
    description: "Code quality, architecture, DRY, edge cases, naming",
    agent: "oh-auditor",
    severity: "medium",
    autoFix: true,
    weight: 0.25,
    timeout: 60000,
  },
  {
    name: "quality",
    label: "Quality Check",
    description: "Test coverage, lint issues, dead code, type safety",
    agent: "oh-prover",
    severity: "medium",
    autoFix: true,
    weight: 0.20,
    timeout: 60000,
  },
  {
    name: "report",
    label: "Summary Report",
    description: "Compute quality score and generate structured report",
    agent: "oh-gater",
    severity: "low",
    autoFix: false,
    weight: 0.00,
    timeout: 30000,
  },
]

export function createPipeline(opts = {}) {
  const { stagesFilter, autoFix, skip, target } = opts
  let stages = [...DEFAULT_STAGES]
  if (Array.isArray(stagesFilter) && stagesFilter.length > 0) {
    stages = stages.filter(s => stagesFilter.includes(s.name))
  }
  const skipped = Array.isArray(skip) ? skip : []
  return new Pipeline(stages, { stagesFilter, autoFix, skip, target }, skipped)
}

class Pipeline {
  constructor(stages, opts, skipped) {
    this.stages = stages
    this.opts = opts
    this.results = new Map()
    this._skipped = skipped
  }

  async run(ctx) {
    const id = `pipeline_${Date.now().toString(36)}`
    const startedAt = new Date().toISOString()

    for (const stage of this.stages) {
      if (this._skipped.includes(stage.name)) {
        this.results.set(stage.name, {
          name: stage.name,
          status: "skipped",
          score: 0.5,
          findings: [],
          summary: `Skipped per --skip filter`,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          duration: 0,
          weight: stage.weight,
          error: null,
        })
        continue
      }
      const result = await this.runStage(stage.name, ctx)
      this.results.set(stage.name, result)
    }

    const completedAt = new Date().toISOString()
    const stageResults = Object.fromEntries(this.results)
    const score = scoreOverall(stageResults)
    const ship = shipRecommendation(score)
    const summary = generateReport({
      id,
      startedAt,
      completedAt,
      duration: new Date(completedAt) - new Date(startedAt),
      stages: stageResults,
      score,
      ship,
    })

    return {
      id,
      status: "completed",
      startedAt,
      completedAt,
      duration: new Date(completedAt) - new Date(startedAt),
      stages: stageResults,
      score,
      ship,
      summary,
      metadata: {
        stagesFilter: this.opts.stagesFilter || [],
        autoFix: this.opts.autoFix || false,
        skip: this.opts.skip || [],
        target: this.opts.target || "",
      },
    }
  }

  async runStage(name, ctx) {
    const stage = this.stages.find(s => s.name === name)
    if (!stage) {
      return {
        name,
        status: "error",
        score: 0,
        findings: [],
        summary: `Stage "${name}" not found`,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 0,
        weight: 0,
        error: `Stage "${name}" not found`,
      }
    }

    if (this._skipped.includes(stage.name)) {
      return {
        name: stage.name,
        status: "skipped",
        score: 0.5,
        findings: [],
        summary: `Skipped per --skip filter`,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 0,
        weight: stage.weight,
        error: null,
      }
    }

    const startedAt = new Date().toISOString()

    try {
      const { handoffRequest, parseHandoffResult, taskDelegate } = ctx
      const { prompt } = handoffRequest({
        agent: stage.agent,
        context: `Running pipeline stage: ${stage.name} (${stage.label})`,
        goal: stage.description,
        expected: `Return findings with severity (critical/high/medium/low/info), category, title, detail, file, line, recommendation, autoFixable.`,
      })

      const resultText = await taskDelegate(stage.agent, prompt)
      parseHandoffResult(resultText)
      const findings = extractFindings(resultText)
      const completedAt = new Date().toISOString()
      const score = scoreStage(findings)
      const status = score >= 0.7 ? "passed" : "failed"

      return {
        name: stage.name,
        status,
        score,
        findings,
        summary: `Found ${findings.length} issue(s), score ${(score * 100).toFixed(0)}%`,
        startedAt,
        completedAt,
        duration: new Date(completedAt) - new Date(startedAt),
        weight: stage.weight,
        error: null,
      }
    } catch (err) {
      const completedAt = new Date().toISOString()
      return {
        name: stage.name,
        status: "error",
        score: 0,
        findings: [],
        summary: err.message,
        startedAt,
        completedAt,
        duration: new Date(completedAt) - new Date(startedAt),
        weight: stage.weight,
        error: err.message,
      }
    }
  }
}

export function scoreStage(findings) {
  if (!findings || findings.length === 0) return 1.0

  let critical = 0, high = 0, medium = 0, low = 0
  for (const f of findings) {
    if (f.severity === "critical") critical++
    else if (f.severity === "high") high++
    else if (f.severity === "medium") medium++
    else if (f.severity === "low") low++
  }

  if (critical > 0) return 0.0
  if (high > 0) return Math.max(0, 0.3 - (high - 1) * 0.05)
  if (medium > 0) return Math.max(0, 0.7 - (medium - 1) * 0.05)
  if (low > 0) return Math.max(0, 0.9 - (low - 1) * 0.02)
  return 1.0
}

export function scoreOverall(stageResults) {
  const stages = Object.values(stageResults)
  let totalWeight = 0
  let weightedSum = 0
  for (const s of stages) {
    const w = typeof s.weight === "number" ? s.weight : 0
    if (s.score > 0) {
      weightedSum += s.score * w
      totalWeight += w
    }
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0
}

export function shipRecommendation(score) {
  if (score >= 0.9) return "ship"
  if (score >= 0.7) return "review"
  return "block"
}

export function generateReport(result) {
  const score = (result.score * 100).toFixed(0)
  const lines = []
  lines.push("# Quality Report")
  lines.push("")
  lines.push(`**Quality Score**: ${score}/100`)
  lines.push(`**Ship Recommendation**: ${result.ship.toUpperCase()}`)
  lines.push("")
  lines.push("## Per-Stage Breakdown")
  lines.push("")
  lines.push("| Stage | Status | Score | Findings | Summary |")
  lines.push("|-------|--------|-------|----------|---------|")
  for (const stage of Object.values(result.stages)) {
    const pct = (stage.score * 100).toFixed(0)
    lines.push(`| ${stage.name} | ${stage.status} | ${pct}% | ${stage.findings?.length || 0} | ${stage.summary || ""} |`)
  }
  lines.push("")
  lines.push("## Timeline")
  lines.push("")
  lines.push(`**Total Duration**: ${result.duration || 0}ms`)
  lines.push(`**Started**: ${result.startedAt}`)
  lines.push(`**Completed**: ${result.completedAt}`)
  lines.push(`**Stages Completed**: ${Object.keys(result.stages).length}`)
  return lines.join("\n")
}

function extractFindings(text) {
  if (!text || typeof text !== "string") return []
  const findings = []
  const blocks = text.split(/##\s+Findings/i)
  if (blocks.length < 2) return findings

  const content = blocks.slice(1).join("")
  const entries = content.split(/(?=^- severity:)/m)
  for (const entry of entries) {
    const severityMatch = entry.match(/severity:\s*(\S+)/)
    if (!severityMatch) continue
    const finding = {
      severity: severityMatch[1].toLowerCase(),
      category: extractField(entry, "category"),
      title: extractField(entry, "title"),
      detail: extractField(entry, "detail"),
      file: extractField(entry, "file"),
      line: parseInt(extractField(entry, "line"), 10) || undefined,
      recommendation: extractField(entry, "recommendation"),
      autoFixable: extractField(entry, "autoFixable") === "true",
    }
    findings.push(finding)
  }

  return findings
}

function extractField(text, key) {
  const re = new RegExp(`^${key}:\\s*(.+)`, "m")
  const m = text.match(re)
  return m ? m[1].trim() : undefined
}
