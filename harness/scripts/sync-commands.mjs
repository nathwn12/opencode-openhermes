#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, "..", "..")
const COMMANDS_DIR = path.join(REPO_ROOT, "harness", "commands")
const BOOTSTRAP_FILE = path.join(REPO_ROOT, "bootstrap.mjs")
const README_FILE = path.join(REPO_ROOT, "README.md")

const COMMANDS_START = "<!-- COMMANDS:START -->"
const COMMANDS_END = "<!-- COMMANDS:END -->"

const HOOK_ONLY = new Set(["update-me"])

function parseRegistry(src) {
  const commands = {}
  const blockMatch = src.match(/config\.command\s*=\s*\{([\s\S]*?)\n\s*\}/)
  if (!blockMatch) return commands

  let rest = blockMatch[1]
  const entryRe = /^\s*"([^"]+)"\s*:\s*\{([\s\S]*?)\},?\s*$/gm
  let m
  while ((m = entryRe.exec(rest)) !== null) {
    const name = m[1]
    const body = m[2]
    const agent = body.match(/agent:\s*"([^"]+)"/)?.[1] ?? ""
    const description = body.match(/description:\s*"([^"]+)"/)?.[1] ?? ""
    const template = body.match(/template:\s*ct\("([^"]+)"\)/) ? m[0].match(/template:\s*(ct\("[^"]+"\)|""|'')/)?.[1] : ""
    const hasFile = template.includes("ct(")
    commands[name] = { name, agent, description, hasFile }
  }
  return commands
}

function parseCommandFile(filePath) {
  const src = fs.readFileSync(filePath, "utf8")
  const name = path.basename(filePath, ".md")
  const description = src.match(/^description:\s*(.+)$/m)?.[1] ?? ""
  const agent = src.match(/^agent:\s*(.+)$/m)?.[1] ?? ""
  return { name, description, agent }
}

function scanCommandFiles() {
  const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith(".md"))
  const map = {}
  for (const f of files) {
    const parsed = parseCommandFile(path.join(COMMANDS_DIR, f))
    map[parsed.name] = parsed
  }
  return map
}

function getHookCommands() {
  return [...HOOK_ONLY].map(name => ({ name, agent: "", description: "Hook-handled (see plugin source)" }))
}

function printReport(registry, filesOnDisk, hookCommands, cmdNames) {
  console.log("")
  console.log("  COMMAND SYNC REPORT")
  console.log("  " + "=".repeat(50))
  console.log(`  Registered in bootstrap.mjs:  ${Object.keys(registry).length}`)
  console.log(`  Files in harness/commands/:    ${Object.keys(filesOnDisk).length}`)
  console.log(`  Hook-only (no registry):        ${hookCommands.length}`)
  console.log(`  Total real commands:           ${cmdNames.length}`)
  console.log("")

  const registered = new Set(Object.keys(registry))
  const onDisk = new Set(Object.keys(filesOnDisk))
  const allHooks = new Set(hookCommands.map(h => h.name))

  const registeredNoFile = [...registered].filter(n => !onDisk.has(n))
  const fileNotRegistered = [...onDisk].filter(n => !registered.has(n) && !allHooks.has(n))
  const hookNoReg = [...allHooks].filter(n => !registered.has(n) && !onDisk.has(n))

  if (registeredNoFile.length) {
    console.log("  ⚠ REGISTERED, NO FILE:")
    for (const n of registeredNoFile) {
      const e = registry[n]
      console.log(`    /${n}  —  ${e.description}`)
    }
    console.log("")
  }

  if (fileNotRegistered.length) {
    console.log("  ⚠ FILE EXISTS, NOT REGISTERED:")
    for (const n of fileNotRegistered) {
      console.log(`    /${n}`)
    }
    console.log("")
  }

  if (hookNoReg.length) {
    console.log("  ℹ HOOK-ONLY (no registry, no file):")
    for (const n of hookNoReg) {
      console.log(`    /${n}`)
    }
    console.log("")
  }

  if (!registeredNoFile.length && !fileNotRegistered.length) {
    console.log("  ✓ Everything in sync — no gaps.")
    console.log("")
  }
}

function generateMissingFiles(registry, filesOnDisk) {
  let count = 0
  for (const [name, entry] of Object.entries(registry)) {
    if (filesOnDisk[name]) continue

    const templateFile = `${name}.md`
    const agent = entry.agent || "OpenHermes"
    const desc = entry.description

    let md = `---
description: ${desc}
agent: ${agent}
subtask: true
---

# ${name.charAt(0).toUpperCase() + name.slice(1)} Command

`

    if (name === "ohc") {
      md += `OHC context management — hook-handled.\n\nRun \`/ohc status\` to check context usage, \`/ohc compress [targetTokens] [focus]\` to free space.\n\n$ARGUMENTS\n`
    } else {
      md += `${desc}: $ARGUMENTS\n`
    }

    fs.writeFileSync(path.join(COMMANDS_DIR, templateFile), md, "utf8")
    console.log(`  ✓ Created harness/commands/${templateFile}`)
    count++
  }

  if (count === 0) console.log("  No missing files to generate.")
  return count
}

function getCommandNames(registry, hookCommands) {
  const names = [...Object.keys(registry), ...hookCommands.map(h => h.name)]
  names.sort()
  return names
}

function formatCommandRow(names) {
  const count = names.length
  const list = names.map(n => `\`/${n}\``).join(", ")
  return `| **${count} slash commands** | ${list} |`
}

function formatBacktickList(names) {
  return ` ${names.map(n => `\\\`/${n}\\\``).join(", ")}`
}

function syncBootstrap(registry, hookCommands) {
  let src = fs.readFileSync(BOOTSTRAP_FILE, "utf8")
  const cmdNames = getCommandNames(registry, hookCommands)
  const row = formatCommandRow(cmdNames)

  const startIdx = src.indexOf(COMMANDS_START)
  const endIdx = src.indexOf(COMMANDS_END)

  if (startIdx === -1 || endIdx === -1) {
    console.log("  ✗ Markers not found in bootstrap.mjs. Inserting markers.")
    const plugRowRe = /(\|\s+\*\*Plugins\s*\*\*.*\|)/
    const match = src.match(plugRowRe)
    if (!match) {
      console.log("  ✗ Could not find Plugins row to anchor insertion.")
      return false
    }
    const insertAfter = match.index + match[0].length
    const newRow = `\n| **Slash commands** | ${COMMANDS_START} ${COMMANDS_END} |`
    src = src.slice(0, insertAfter) + newRow + src.slice(insertAfter)
    // Re-find markers for content replacement below
    const newStart = src.indexOf(COMMANDS_START)
    const newEnd = src.indexOf(COMMANDS_END)
    if (newStart !== -1 && newEnd !== -1 && newEnd > newStart) {
      const content = formatBacktickList(cmdNames)
      src = src.slice(0, newStart + COMMANDS_START.length) + content + src.slice(newEnd)
    }
    fs.writeFileSync(BOOTSTRAP_FILE, src, "utf8")
    console.log("  ✓ Inserted Slash commands row in bootstrap.mjs")
    return true
  }

  if (endIdx <= startIdx) {
    console.log("  ✗ Markers out of order in bootstrap.mjs")
    return false
  }

  const content = formatBacktickList(cmdNames)
  src = src.slice(0, startIdx + COMMANDS_START.length) + content + src.slice(endIdx)
  fs.writeFileSync(BOOTSTRAP_FILE, src, "utf8")
  console.log("  ✓ Updated Slash commands row in bootstrap.mjs")
  return true
}

function syncReadme(registry, hookCommands) {
  let src = fs.readFileSync(README_FILE, "utf8")
  const cmdNames = getCommandNames(registry, hookCommands)
  const row = formatCommandRow(cmdNames)

  const tableRowRe = /^\|\s*\*\*(\d+)\s*slash commands\s*\*\*.*\|$/m
  const match = src.match(tableRowRe)
  if (!match) {
    console.log("  ✗ Could not find slash commands row in README.md")
    return false
  }

  src = src.replace(tableRowRe, row)
  fs.writeFileSync(README_FILE, src, "utf8")
  console.log(`  ✓ Updated README.md: ${cmdNames.length} commands`)
  return true
}

// Main
const args = process.argv.slice(2)
const doAudit = args.includes("--audit") || args.length === 0
const doGenerate = args.includes("--generate") || args.length === 0
const doSyncBootstrap = args.includes("--sync-bootstrap") || args.includes("--sync") || args.length === 0
const doSyncReadme = args.includes("--sync-readme") || args.includes("--sync") || args.length === 0

console.log("  ▸ syncing command definitions...")
console.log("")

const bootstrapSrc = fs.readFileSync(BOOTSTRAP_FILE, "utf8")
const registry = parseRegistry(bootstrapSrc)
const filesOnDisk = scanCommandFiles()
const hookCommands = getHookCommands()
const cmdNames = getCommandNames(registry, hookCommands)

if (doAudit) printReport(registry, filesOnDisk, hookCommands, cmdNames)

if (doGenerate) {
  console.log("  [generate]")
  generateMissingFiles(registry, filesOnDisk)
  console.log("")
}

if (doSyncBootstrap) {
  console.log("  [sync-bootstrap]")
  const ok = syncBootstrap(registry, hookCommands)
  if (!ok) process.exitCode = 1
  console.log("")
}

if (doSyncReadme) {
  console.log("  [sync-readme]")
  const ok = syncReadme(registry, hookCommands)
  if (!ok) process.exitCode = 1
  console.log("")
}

console.log("  done.")
