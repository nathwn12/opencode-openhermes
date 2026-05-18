import fs from "node:fs"
import os from "node:os"
import path from "node:path"

let _planStorageOverride: string | undefined

export interface PlanAccess {
  path: string
  status: string | null
  objective: string | null
  summary: string | null
}

export function setPlanStorageDirForTest(dir: string | undefined): void {
  _planStorageOverride = dir
}

export function planStorageDir(): string {
  return _planStorageOverride ?? path.join(os.homedir(), ".local", "share", "openhermes", "plans")
}

function getProjectName(projectDir: string): string {
  return path.basename(projectDir)
}

function ensureDir(dir: string): void {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[openhermes] Failed to create directory ${dir}: ${msg}`)
  }
}

function readPlanAccess(filePath: string): PlanAccess | null {
  if (!fs.existsSync(filePath)) return null
  const source = fs.readFileSync(filePath, "utf8")
  const status = source.match(/^Status:\s*(.+)$/m)?.[1]?.trim() ?? null
  const objective = source.match(/^Objective:\s*(.+)$/m)?.[1]?.trim() ?? null
  if (!status && !objective) return null
  const parts = [status ? `status=${status}` : null, objective ? `objective=${objective}` : null].filter(Boolean)
  return {
    path: filePath,
    status,
    objective,
    summary: `Active plan: ${parts.join(" | ")}`,
  }
}

export function resolvePlanAccess(projectDir: string): PlanAccess | null {
  const latest = findLatestPlanFile(projectDir)
  if (!latest) return null
  return readPlanAccess(latest)
}

export function findLatestPlanFile(projectDir: string): string | null {
  const projectName = getProjectName(projectDir)
  const storage = planStorageDir()
  const projectDirPath = path.join(storage, projectName)
  if (!fs.existsSync(projectDirPath)) return null
  let latest: string | null = null
  let highest = -1
  try {
    for (const entry of fs.readdirSync(projectDirPath)) {
      const m = entry.match(/^plan-(\d{3})\.md$/)
      if (m) {
        const n = parseInt(m[1], 10)
        if (n > highest) {
          highest = n
          latest = path.join(projectDirPath, entry)
        }
      }
    }
  } catch {
    return null
  }
  return latest
}

export function ensurePlanFile(projectDir: string): string {
  const access = resolvePlanAccess(projectDir)
  if (access?.status === "active" || access?.status === "in-progress") {
    return access.path
  }

  const projectName = getProjectName(projectDir)
  const storage = planStorageDir()
  const projectDirPath = path.join(storage, projectName)
  ensureDir(projectDirPath)

  const latest = access?.path ?? findLatestPlanFile(projectDir)
  let nextSeq = 1
  if (latest) {
    const m = path.basename(latest).match(/^plan-(\d{3})\.md$/)
    if (m) nextSeq = parseInt(m[1], 10) + 1
  }

  const seq = String(nextSeq).padStart(3, "0")
  const planId = `${projectName}/plan-${seq}.md`
  const planPath = path.join(projectDirPath, `plan-${seq}.md`)
  const now = new Date().toISOString().replace("T", " ").slice(0, 16)

  const content = [
    `# PLAN: ${projectName}`,
    "",
    `Plan ID: ${planId}`,
    `Project: ${projectName}`,
    `Status: active`,
    `Created: ${now}`,
    `Updated: ${now}`,
    `Project Path: ${projectDir}`,
    `Plan Path: ${planPath}`,
    `Objective: (pending classification)`,
    "",
    "## Tasks",
    "",
    "- [ ] (discoverable — pending classification)",
    "",
  ].join("\n")

  try {
    fs.writeFileSync(planPath, content, "utf8")
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[openhermes] Failed to write plan file ${planPath}: ${msg}`)
  }
  return planPath
}

export function readPlanSummary(projectDir: string): string | null {
  return resolvePlanAccess(projectDir)?.summary ?? null
}
