// ---------------------------------------------------------------------------
// PlanStore — wraps plan file read/write with memory, findings & decisions
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  MemoryEntry,
  Finding,
  Decision,
} from "./interfaces.ts";
import { MemoryLevel } from "./interfaces.ts";

// ---------------------------------------------------------------------------
// Simple per-path mutex — serializes concurrent read-modify-write cycles
// for the same plan file. Keyed by planPath so writes to different files
// proceed in parallel.
// ---------------------------------------------------------------------------

class PathMutex {
  private locked = false;
  private queue: (() => void)[] = [];

  acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.locked = true;
        resolve();
      });
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }
}

const planLocks = new Map<string, PathMutex>();

function getPlanLock(planPath: string): PathMutex {
  let lock = planLocks.get(planPath);
  if (!lock) {
    lock = new PathMutex();
    planLocks.set(planPath, lock);
  }
  return lock;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PlanData {
  tasks: MemoryPlanEntry[];
  memory: MemoryEntry[];
  findings: Finding[];
  decisions: Decision[];
}

export interface MemoryPlanEntry {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "blocked";
  dependsOn: string[];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export class PlanStore {
  /**
   * Read a plan file and parse its structured sections.
   * Returns default values if the file does not exist or cannot be parsed.
   */
  static async readPlan(planPath: string): Promise<PlanData> {
    if (!fs.existsSync(planPath)) {
      return { tasks: [], memory: [], findings: [], decisions: [] };
    }

    try {
      const source = await fs.promises.readFile(planPath, "utf8");
      return parsePlanDocument(source);
    } catch {
      return { tasks: [], memory: [], findings: [], decisions: [] };
    }
  }

  /**
   * Write plan data back into a markdown plan file.
   * Preserves the original header / frontmatter and appends structured sections.
   */
  static async writePlan(planPath: string, data: PlanData): Promise<void> {
    const sections: string[] = [];

    // Preserve existing header if file exists
    if (fs.existsSync(planPath)) {
      const existing = await fs.promises.readFile(planPath, "utf8");
      const header = extractHeader(existing);
      if (header) sections.push(header);
    }

    // Tasks section
    sections.push("", "## Tasks", "");
    if (data.tasks.length === 0) {
      sections.push("- [ ] (no tasks)");
    } else {
      for (const task of data.tasks) {
        const checkbox = task.status === "completed" ? "x" : " ";
        const dep = task.dependsOn.length > 0 ? ` [depends: ${task.dependsOn.join(", ")}]` : "";
        sections.push(`- [${checkbox}] ${task.description}${dep}`);
      }
    }

    // Memory section
    if (data.memory.length > 0) {
      sections.push("", "## Memory", "");
      for (const entry of data.memory) {
        const meta = entry.metadata
          ? ` ${JSON.stringify(entry.metadata)}`
          : "";
        sections.push(
          `- [${entry.level}] (${entry.importance.toFixed(2)}) ${entry.content}${meta}`,
        );
      }
    }

    // Findings section
    if (data.findings.length > 0) {
      sections.push("", "## Findings", "");
      for (const finding of data.findings) {
        sections.push(
          `- [${finding.severity}] ${finding.description} _(session: ${finding.sessionId})_`,
        );
      }
    }

    // Decisions section
    if (data.decisions.length > 0) {
      sections.push("", "## Decisions", "");
      for (const decision of data.decisions) {
        sections.push(
          `- **${decision.description}** — ${decision.rationale} _(session: ${decision.sessionId})_`,
        );
      }
    }

    sections.push(""); // trailing newline

    // -----------------------------------------------------------------------
    // Atomic write: write to temp file in same directory, then rename.
    // Avoids partial/corrupt files on crash mid-write.
    // Pattern adapted from plan-sync.ts atomicWrite().
    // -----------------------------------------------------------------------
    const dir = path.dirname(planPath);
    const base = path.basename(planPath);
    const tmpPath = path.join(dir, `.${base}.${process.pid}_${Date.now()}.tmp`);
    await fs.promises.writeFile(tmpPath, sections.join("\n"), "utf8");
    try {
      await fs.promises.rename(tmpPath, planPath);
    } catch {
      // EPERM on Windows (cross-device or locking): write content directly
      // to target. Content is already in memory as `sections.join("\n")`.
      await fs.promises.writeFile(planPath, sections.join("\n"), "utf8");
    }
  }

  /**
   * Add a finding to the plan file at the given path.
   *
   * Uses a per-path mutex to prevent lost-update races when called
   * concurrently from memory-sync-hook (or any other caller).
   */
  static async addFinding(
    planPath: string,
    sessionId: string,
    finding: Omit<Finding, "id" | "sessionId" | "timestamp">,
  ): Promise<void> {
    const lock = getPlanLock(planPath);
    await lock.acquire();
    try {
      const data = await PlanStore.readPlan(planPath);
      const newFinding: Finding = {
        id: randomUUID(),
        sessionId,
        ...finding,
        timestamp: Date.now(),
      };
      data.findings.push(newFinding);
      await PlanStore.writePlan(planPath, data);
    } finally {
      lock.release();
    }
  }

  /**
   * Add a decision to the plan file at the given path.
   *
   * Uses a per-path mutex to prevent lost-update races when called
   * concurrently from memory-sync-hook (or any other caller).
   */
  static async addDecision(
    planPath: string,
    sessionId: string,
    decision: Omit<Decision, "id" | "sessionId" | "timestamp">,
  ): Promise<void> {
    const lock = getPlanLock(planPath);
    await lock.acquire();
    try {
      const data = await PlanStore.readPlan(planPath);
      const newDecision: Decision = {
        id: randomUUID(),
        sessionId,
        ...decision,
        timestamp: Date.now(),
      };
      data.decisions.push(newDecision);
      await PlanStore.writePlan(planPath, data);
    } finally {
      lock.release();
    }
  }

  /**
   * Merge parent context entries for child sessions.
   * Returns all entries from both parent and current session context.
   */
  static async getMerged(
    sessionId: string,
    parentSessionId?: string,
  ): Promise<MemoryEntry[]> {
    const all: MemoryEntry[] = [];

    // For now, this is a placeholder that returns empty — real merging
    // requires the caller to provide plan paths. This stub hooks into
    // the intended architecture without dictating I/O strategy.
    if (parentSessionId) {
      // In a real implementation, we would look up the parent session's
      // plan file and merge its memory entries with the child's.
    }

    return all;
  }
}

// ---------------------------------------------------------------------------
// Internal parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parse a plan document string into structured PlanData.
 */
function parsePlanDocument(source: string): PlanData {
  const tasks: MemoryPlanEntry[] = [];
  const memory: MemoryEntry[] = [];
  const findings: Finding[] = [];
  const decisions: Decision[] = [];

  const lines = source.split(/\r?\n/);
  let section: string | null = null;

  for (const raw of lines) {
    const line = raw.trim();

    // Section detection
    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      section = sectionMatch[1].toLowerCase();
      continue;
    }

    if (!section || !line) continue;

    switch (section) {
      case "tasks": {
        const taskMatch = line.match(/^-\s+\[([ x])\]\s+(.+)$/);
        if (taskMatch) {
          const depMatch = taskMatch[2].match(/^(.+?)\s+\[depends:\s+(.+?)\]$/);
          tasks.push({
            id: randomUUID(),
            description: depMatch ? depMatch[1].trim() : taskMatch[2].trim(),
            status: taskMatch[1] === "x" ? "completed" : "pending",
            dependsOn: depMatch ? depMatch[2].split(/,\s*/) : [],
          });
        }
        break;
      }

      case "memory": {
        const memMatch = line.match(
          /^-\s+\[(\w+)\]\s+\(([\d.]+)\)\s+(.+?)(?:\s+(\{.*\}))?$/,
        );
        if (memMatch) {
          let metadata: Record<string, string> | undefined;
          try {
            if (memMatch[4]) metadata = JSON.parse(memMatch[4]);
          } catch {
            // ignore malformed metadata
          }
          memory.push({
            id: randomUUID(),
            level: memMatch[1] as MemoryLevel,
            importance: parseFloat(memMatch[2]),
            content: memMatch[3].trim(),
            timestamp: Date.now(),
            metadata,
          });
        }
        break;
      }

      case "findings": {
        const findingMatch = line.match(
          /^-\s+\[(\w+)\]\s+(.+?)\s+_\(session:\s+(.+?)\)_\s*$/,
        );
        if (findingMatch) {
          findings.push({
            id: randomUUID(),
            severity: findingMatch[1] as Finding["severity"],
            description: findingMatch[2].trim(),
            sessionId: findingMatch[3].trim(),
            timestamp: Date.now(),
          });
        }
        break;
      }

      case "decisions": {
        const decMatch = line.match(
          /^-\s+\*\*(.+?)\*\*\s*[—–-]+\s*(.+?)\s+_\(session:\s+(.+?)\)_\s*$/,
        );
        if (decMatch) {
          decisions.push({
            id: randomUUID(),
            description: decMatch[1].trim(),
            rationale: decMatch[2].trim(),
            sessionId: decMatch[3].trim(),
            timestamp: Date.now(),
          });
        }
        break;
      }
    }
  }

  return { tasks, memory, findings, decisions };
}

/**
 * Extract the header portion of a plan file (everything before the first ##).
 */
function extractHeader(source: string): string | null {
  const idx = source.search(/^## /m);
  if (idx < 0) return source.trim();
  return source.slice(0, idx).trim();
}
