import crypto from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const SECRET_KEY_PATTERN = /(token|secret|password|passwd|passphrase|pwd|credential|auth|api[-_ ]?key|access[-_ ]?key|refresh[-_ ]?token|authorization|cookie|bearer)/i
const TEXT_REDACTIONS = [
  [/\bsk-[A-Za-z0-9]{16,}\b/g, "[REDACTED]"],
  [/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, "[REDACTED]"],
  [/\bgithub_pat_[A-Za-z0-9_]+\b/g, "[REDACTED]"],
  [/\bxox[baprs]-[A-Za-z0-9-]+\b/g, "[REDACTED]"],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/gi, "Bearer [REDACTED]"],
  [/\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g, "[REDACTED]"],
]

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function truncateText(text, limit = 12000) {
  const value = String(text ?? "")
  if (limit <= 0 || value.length <= limit) return value
  const suffix = "...[truncated]"
  const sliceLength = Math.max(0, limit - suffix.length)
  return value.slice(0, sliceLength) + suffix
}

function hasExpired(r) {
  if (r?.status === "expired" || r?.status === "decayed") return true
  if (r?.decay_at && Date.parse(r.decay_at) < Date.now()) return true
  if (r?.expires_at && Date.parse(r.expires_at) < Date.now()) return true
  return false
}

function redactSensitiveText(text) {
  let output = String(text ?? "")
  for (const [pattern, replacement] of TEXT_REDACTIONS) {
    output = output.replace(pattern, replacement)
  }
  return output
}

function sanitizeValue(value, key = "", options = {}) {
  const maxStringLength = Number.isFinite(options.maxStringLength) ? options.maxStringLength : 12000
  if (value === null || value === undefined) return value
  if (typeof value === "string") return truncateText(redactSensitiveText(value), maxStringLength)
  if (typeof value === "number" || typeof value === "boolean") return value
  if (Array.isArray(value)) return value.map(item => sanitizeValue(item, key, options))
  if (isPlainObject(value)) {
    const redacted = {}
    for (const [childKey, childValue] of Object.entries(value)) {
      redacted[childKey] = SECRET_KEY_PATTERN.test(childKey)
        ? "[REDACTED]"
        : sanitizeValue(childValue, childKey, options)
    }
    return redacted
  }
  return truncateText(redactSensitiveText(String(value)), maxStringLength)
}

function sanitizeRecord(record, options = {}) {
  return sanitizeValue(record, "", options)
}

function fingerprintEnvironment(input = {}) {
  const fingerprint = {
    cwd: path.resolve(input.cwd || process.cwd()),
    harness_root: input.harnessRoot ? path.resolve(input.harnessRoot) : null,
    project_root: input.projectRoot ? path.resolve(input.projectRoot) : null,
    project: input.project || null,
    session_id: input.sessionId || null,
    os: process.platform,
    release: os.release(),
    arch: process.arch,
    shell: process.env.ComSpec || process.env.COMSPEC || "cmd.exe",
    provider: process.env.OPENCODE_PROVIDER || null,
    model: process.env.OPENCODE_MODEL || null,
  }
  const sha256 = crypto.createHash("sha256").update(JSON.stringify(fingerprint)).digest("hex")
  return { ...fingerprint, sha256 }
}

function fingerprintFile(filePath) {
  try {
    const stat = fs.statSync(filePath)
    const content = fs.readFileSync(filePath)
    return {
      path: path.normalize(filePath),
      mtime: stat.mtime.toISOString(),
      size: stat.size,
      sha256: crypto.createHash("sha256").update(content).digest("hex"),
    }
  } catch {
    return null
  }
}

function atomicWriteJson(filePath, data) {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  const tmpPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`)
  const payload = `${JSON.stringify(data, null, 2)}\n`
  fs.writeFileSync(tmpPath, payload, "utf8")
  try {
    fs.renameSync(tmpPath, filePath)
  } catch (err) {
    fs.copyFileSync(tmpPath, filePath)
    fs.rmSync(tmpPath, { force: true })
  }
}

function isTruthy(value) {
  return /^(1|true|yes|on)$/i.test(String(value || ""))
}

function readJson(fp, fallback) {
  try { return JSON.parse(fs.readFileSync(fp, "utf8")) } catch { return fallback }
}

function buildEnvironmentFingerprint(root, directory, project) {
  return fingerprintEnvironment({
    cwd: directory,
    harnessRoot: root,
    projectRoot: directory,
    project: project?.name || path.basename(directory),
    sessionId: project?.session_id || null,
  })
}

function toDisplayPath(absPath) {
  if (!absPath) return ''
  const normalized = absPath.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/openhermes/')
  if (idx !== -1) return 'openhermes' + normalized.slice(idx + 11)
  const parts = normalized.split('/').filter(Boolean)
  return parts.slice(-2).join('/')
}

export { atomicWriteJson, buildEnvironmentFingerprint, fingerprintEnvironment, fingerprintFile, hasExpired, isPlainObject, isTruthy, readJson, redactSensitiveText, sanitizeRecord, toDisplayPath, truncateText }
