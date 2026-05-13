import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import crypto from "node:crypto"
import { fileURLToPath } from "node:url"
import { createLogger } from "./lib/logger.mjs"
import { getHarnessDir, setHarnessRootForTest, resolveHarnessRoot } from "./lib/harness-resolver.mjs"

const log = createLogger("bootstrap")
let _bootstrapping = false
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export { resolveHarnessRoot, setHarnessRootForTest, getHarnessDir }

function syncSkills(hDir) {
  const src = path.join(hDir, "skills")
  const dest = path.join(os.homedir(), ".config", "opencode", "skills")
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const skill of fs.readdirSync(src)) {
    const sPath = path.join(src, skill)
    if (!fs.statSync(sPath).isDirectory()) continue
    const dPath = path.join(dest, skill)
    const srcSk = path.join(sPath, "SKILL.md")
    const dstSk = path.join(dPath, "SKILL.md")
    if (!fs.existsSync(srcSk)) continue
    const srcHash = crypto.createHash("md5").update(fs.readFileSync(srcSk)).digest("hex")
    let dstHash = ""
    try { dstHash = crypto.createHash("md5").update(fs.readFileSync(dstSk)).digest("hex") } catch {}
    if (srcHash === dstHash) continue
    fs.mkdirSync(dPath, { recursive: true })
    fs.cpSync(srcSk, dstSk, { force: true })
    log.info(`synced skill: ${skill}`)
  }
}

export const BootstrapPlugin = async ({ directory }) => {
  const hDir = getHarnessDir()
  syncSkills(hDir)

  const getContent = () => {
    try {
      const constitution = fs.readFileSync(path.join(hDir, "codex", "CONSTITUTION.md"), "utf8")
      const runtime = fs.readFileSync(path.join(hDir, "instructions", "RUNTIME.md"), "utf8")
      const ethosPath = path.join(__dirname, "ETHOS.md")
      const ethos = fs.existsSync(ethosPath) ? fs.readFileSync(ethosPath, "utf8") : ""
      return [
        `<OPENHERMES_V4>`,
        constitution ? `<CONSTITUTION>\n${constitution}\n</CONSTITUTION>` : null,
        runtime ? `<RUNTIME>\n${runtime}\n</RUNTIME>` : null,
        ethos ? `<ETHOS>\n${ethos}\n</ETHOS>` : null,
      ].filter(Boolean).join("\n\n")
    } catch (err) {
      log.error("bootstrap build error:", err?.message)
      return null
    }
  }

  return {
    config: async (config) => {
      config.skills = config.skills || {}
      config.skills.paths = config.skills.paths || []
      const skillsDir = path.join(hDir, "skills")
      if (!config.skills.paths.includes(skillsDir)) config.skills.paths.push(skillsDir)
    },

    "experimental.chat.messages.transform": async (_input, output) => {
      try {
        if (_bootstrapping) return
        if (!output.messages?.length) return
        const firstUser = output.messages.find(m => m?.info?.role === "user")
        if (!firstUser?.parts?.length) return
        if (firstUser.parts.some(p => p.text?.includes("OPENHERMES_V4"))) return
        const content = getContent()
        if (!content) return
        _bootstrapping = true
        try {
          firstUser.parts.unshift({ type: "text", text: content })
        } finally {
          _bootstrapping = false
        }
      } catch (err) {
        log.error("transform error:", err?.message)
      }
    },
  }
}
