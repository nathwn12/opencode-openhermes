// ---------------------------------------------------------------------------
// PlanNumberingHook — PostToolUse, priority=15, phase=NORMAL
//
// Detects when subagents write to wrong-numbered plan files (e.g. hardcoded
// plan-001.md instead of the correct next sequential number). Fixes the path
// in the output and renames any already-written files on disk.
// ---------------------------------------------------------------------------

import path from "node:path";
import fs from "node:fs";
import { HookPhase, HookResult } from "../types.ts";
import type { HookContext, PostToolUseHook } from "../types.ts";
import { findLatestPlanFile } from "../../plans/plan-location.ts";

export const planNumberingHook: PostToolUseHook = {
  metadata: {
    name: "plan-numbering",
    priority: 15,
    phase: HookPhase.NORMAL,
    dependencies: [],
    errorHandling: "isolate",
  },

  async execute(context: HookContext, output: string) {
    // Extract project directory from context
    const projectDir = context.directory;

    // Scan output for plan file references
    const planRefRegex = /plan-(\d{3})\.md/g;
    const matches = [...output.matchAll(planRefRegex)];

    if (matches.length === 0) {
      return { result: HookResult.CONTINUE };
    }

    // Get the actual latest plan from the filesystem
    const latest = findLatestPlanFile(projectDir);

    if (!latest) {
      // No existing plans — any plan-NNN.md reference is for a new plan
      // Can't validate without existing context
      return { result: HookResult.CONTINUE };
    }

    const latestMatch = latest.match(/plan-(\d{3})\.md$/);
    if (!latestMatch) return { result: HookResult.CONTINUE };

    const latestNum = parseInt(latestMatch[1], 10);

    let needsFix = false;
    let fixedOutput = output;
    let correctedPath = "";

    // Collect all unique wrong plan numbers referenced
    const wrongRefs = new Map<string, string>(); // wrong "001" -> correct "008"
    const correctNum = String(latestNum + 1).padStart(3, "0");
    correctedPath = `plan-${correctNum}.md`;

    for (const match of matches) {
      const refNum = parseInt(match[1], 10);

      // Case 1: output references plan-001 but latest on disk is plan-007
      // This means we're overwriting old plans instead of creating plan-008
      if (refNum <= latestNum) {
        needsFix = true;
        wrongRefs.set(match[1], correctNum);

        // Patch the output: replace the wrong path with the correct one
        fixedOutput = fixedOutput.replace(
          new RegExp(`plan-${match[1]}\\.md`, "g"),
          correctedPath,
        );
      }
    }

    if (!needsFix) {
      return { result: HookResult.CONTINUE };
    }

    // Rename any already-written files on disk
    const planDir = path.dirname(latest);
    for (const [wrongNum] of wrongRefs) {
      const wrongPath = path.join(planDir, `plan-${wrongNum}.md`);
      const rightPath = path.join(planDir, correctedPath);

      if (fs.existsSync(wrongPath)) {
        // Read the content to check if it's a plan file (and not some other file)
        const content = fs.readFileSync(wrongPath, "utf8");
        if (
          content.includes("Plan ID:") ||
          content.includes("# PLAN:")
        ) {
          fs.renameSync(wrongPath, rightPath);
        }
      }
    }

    return {
      result: HookResult.INJECT,
      modifiedOutput: `⚠️ [plan-numbering] Fixed plan file path: referenced plan-NNN.md should be ${correctedPath}\n${fixedOutput.trim()}`,
    };
  },
};
