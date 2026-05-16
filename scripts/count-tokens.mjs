/**
 * Exact token counting using gpt-tokenizer.
 * Counts every SKILL.md, bootstrap doc, AGENTS.md, and instructions.
 */
import { encode } from "gpt-tokenizer";
import fs from "fs";
import path from "path";

const HOME = process.env.USERPROFILE || process.env.HOME;
const ROOT = path.resolve("Q:/PROJECTS/PERSONAL/openhermes-pkg");

const categories = {
  "OH Bootstrap Docs (on disk, NOT injected)": [
    path.join(ROOT, "harness/codex/AUTOPILOT.md"),
    path.join(ROOT, "harness/codex/CONSTITUTION.md"),
    path.join(ROOT, "harness/instructions/RUNTIME.md"),
    path.join(ROOT, "CONTEXT.md"),
    path.join(ROOT, "ETHOS.md"),
  ],
  "OH Agent Prompt (injected as system prompt)": [
    path.join(ROOT, "harness/agents/openhermes.md"),
  ],
  "OH Built-in Skills (31, registered)": [],
  "User Skills (.agents/skills) — on disk, NOT registered": [],
  "User Skills (.config/opencode/skills) — on disk, NOT registered": [],
  "Instructions": [
    path.join(ROOT, "AGENTS.md"),
    path.join(HOME, ".config/opencode/AGENTS.md"),
  ],
};

// Discover OH built-in skills
const skillsDir = path.join(ROOT, "harness/skills");
for (const entry of fs.readdirSync(skillsDir)) {
  const skPath = path.join(skillsDir, entry, "SKILL.md");
  if (fs.existsSync(skPath)) categories["OH Built-in Skills (30, registered)"].push(skPath);
}

// Discover user skills
const userDirs = [
  path.join(HOME, ".agents/skills"),
  path.join(HOME, ".config/opencode/skills"),
];
for (const dir of userDirs) {
  const key = dir.includes(".agents")
    ? "User Skills (.agents/skills) — on disk, NOT registered"
    : "User Skills (.config/opencode/skills) — on disk, NOT registered";
  if (fs.existsSync(dir)) {
    for (const entry of fs.readdirSync(dir)) {
      const skPath = path.join(dir, entry, "SKILL.md");
      if (fs.existsSync(skPath)) categories[key].push(skPath);
    }
  }
}

// Extract frontmatter description
function extractDescription(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return { description: "", body: content };
    const fm = match[1];
    const descLine = fm.split("\n").find(l => l.trim().startsWith("description:"));
    if (!descLine) return { description: "", body: content.slice(match[0].length) };
    const desc = descLine.slice(descLine.indexOf(":") + 1).trim().replace(/^['"]|['"]$/g, "");
    return { description: desc, body: content.slice(match[0].length) };
  } catch { return { description: "", body: "" }; }
}

// Build what the available_skills XML block looks like (OH built-in skills only)
function buildAvailableSkillsXml(includeUserSkills = false) {
  const parts = ['<available_skills>'];
  const allDirs = [path.join(ROOT, "harness/skills")];
  if (includeUserSkills) {
    allDirs.push(
      path.join(HOME, ".agents/skills"),
      path.join(HOME, ".config/opencode/skills"),
    );
  }
  for (const dir of allDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir).sort()) {
      const skPath = path.join(dir, entry, "SKILL.md");
      if (!fs.existsSync(skPath)) continue;
      const { description } = extractDescription(skPath);
      parts.push(`  <skill>`);
      parts.push(`    <name>${entry}</name>`);
      parts.push(`    <description>${description}</description>`);
      parts.push(`    <location>file:///${skPath.replace(/\\/g, '/')}</location>`);
      parts.push(`  </skill>`);
    }
  }
  parts.push('</available_skills>');
  return parts.join('\n');
}

// Count everything
console.log("=".repeat(80));
console.log("EXACT TOKEN COUNTS (gpt-tokenizer)");
console.log("=".repeat(80));

let grandTotal = 0;

for (const [category, files] of Object.entries(categories)) {
  console.log(`\n--- ${category} ---`);
  let catTotal = 0;
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, "utf8");
    const tokens = encode(content).length;
    const name = path.basename(path.dirname(file)) !== "skills"
      ? path.basename(file)
      : path.basename(path.dirname(file));
    console.log(`  ${name.padEnd(40)} ${String(tokens).padStart(6)} tokens  (${content.length.toLocaleString()} bytes)`);
    catTotal += tokens;
  }
  console.log(`  ${"-".repeat(50)}`);
  console.log(`  TOTAL: ${catTotal} tokens`);
  grandTotal += catTotal;
}

// Available skills XML cost (OH built-in only — user skills no longer registered)
console.log(`\n--- available_skills XML Block (OH only, 31 skills) ---`);
const xmlContent = buildAvailableSkillsXml(false);
const xmlTokens = encode(xmlContent).length;
console.log(`  Total: ${xmlTokens} tokens  (${xmlContent.length.toLocaleString()} bytes)`);

console.log(`\n--- available_skills XML Block (ALL 61 skills, for comparison) ---`);
const xmlContentAll = buildAvailableSkillsXml(true);
const xmlTokensAll = encode(xmlContentAll).length;
console.log(`  Total: ${xmlTokensAll} tokens  (${xmlContentAll.length.toLocaleString()} bytes)`);

grandTotal += xmlTokens;

// System prompt components
const instructionsTotal = categories["Instructions"].reduce((s, f) => {
  if (!fs.existsSync(f)) return s;
  return s + encode(fs.readFileSync(f, "utf8")).length;
}, 0);
const agentPromptTotal = categories["OH Agent Prompt (injected as system prompt)"].reduce((s, f) => {
  if (!fs.existsSync(f)) return s;
  return s + encode(fs.readFileSync(f, "utf8")).length;
}, 0);

console.log(`\n${"=".repeat(80)}`);
console.log(`TOTAL ALL SKILL FILES: ${categories["OH Built-in Skills (30, registered)"].reduce((s, f) => s + encode(fs.readFileSync(f, "utf8")).length, 0)} tokens`);
console.log(`TOTAL USER SKILL FILES: ${categories["User Skills (.agents/skills) — on disk, NOT registered"].reduce((s, f) => s + encode(fs.readFileSync(f, "utf8")).length, 0)} tokens`);
console.log(`TOTAL CONFIG SKILLS: ${categories["User Skills (.config/opencode/skills) — on disk, NOT registered"].reduce((s, f) => s + encode(fs.readFileSync(f, "utf8")).length, 0)} tokens`);
console.log(`TOTAL INSTRUCTIONS: ${instructionsTotal} tokens`);
console.log(`AGENT PROMPT (openhermes.md): ${agentPromptTotal} tokens`);
console.log(`available_skills XML (ALL 61 skills, registered): ${xmlTokensAll} tokens`);
console.log(`\nBOOTSTRAP INJECTION: REMOVED (was 4,503 via transform hook)`);
console.log(`ROUTING INVENTORY: REMOVED (was ~902 via buildRoutingInventory())`);
console.log(`\nPER-TURN SYSTEM PROMPT COST: ${instructionsTotal + xmlTokensAll + agentPromptTotal} tokens`);
console.log(`  (instructions ${instructionsTotal} + available_skills ${xmlTokensAll} + agent prompt ${agentPromptTotal})`);
console.log(`PRE-REFACTOR COST: ${instructionsTotal + xmlTokensAll + 4503 + 902} tokens`);
console.log(`SAVINGS: ${(instructionsTotal + xmlTokensAll + 4503 + 902) - (instructionsTotal + xmlTokensAll + agentPromptTotal)} tokens per turn`);
console.log("=".repeat(80));
