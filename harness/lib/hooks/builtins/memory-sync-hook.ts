// ---------------------------------------------------------------------------
// MemorySyncHook — PostToolUse, priority=40, phase=LATE
//
// After each step, sync memory entries to plan file.
// Uses MemoryManager from harness/lib/memory/memory-manager.ts
// ---------------------------------------------------------------------------

import { HookPhase, HookResult } from "../types.ts";
import type { HookContext, PostToolUseHook } from "../types.ts";
import { MemoryManager } from "../../memory/memory-manager.ts";
import { PlanStore } from "../../memory/plan-store.ts";
import { resolvePlanAccess } from "../../plans/plan-location.ts";
import { MemoryLevel } from "../../memory/interfaces.ts";

export const memorySyncHook: PostToolUseHook = {
  metadata: {
    name: "memory-sync",
    priority: 40,
    phase: HookPhase.LATE,
    dependencies: [],
    errorHandling: "isolate",
  },

  async execute(context: HookContext, output: string) {
    // Sync memory entries to plan file
    const planFile = resolvePlanAccess(context.directory)?.path ?? null;
    if (!planFile) {
      // No plan file to sync to — skip silently
      return { result: HookResult.CONTINUE };
    }

    const mem = MemoryManager.getInstance();

    // Extract findings from the session memory (TASK level)
    const taskEntries = mem.getEntries(MemoryLevel.TASK);

    // Sync important task entries as plan findings
    for (const entry of taskEntries) {
      if (entry.importance >= 0.6) {
        try {
          await PlanStore.addFinding(planFile, context.sessionId, {
            description: entry.content,
            severity: entry.importance >= 0.8 ? "warning" : "info",
          });
        } catch {
          // Plan sync is best-effort — don't break execution
        }
      }
    }

    // Sync any decisions
    const missionEntries = mem.getEntries(MemoryLevel.MISSION);
    for (const entry of missionEntries) {
      if (entry.metadata?.type === "decision" && entry.importance >= 0.7) {
        try {
          await PlanStore.addDecision(planFile, context.sessionId, {
            description: entry.content,
            rationale: (entry.metadata.rationale as string) ?? "Auto-synced decision",
          });
        } catch {
          // Best-effort
        }
      }
    }

    return {
      result: HookResult.CONTINUE,
      modifiedContext: {
        _memorySyncCount: taskEntries.filter((e) => e.importance >= 0.6).length,
      },
    };
  },
};
