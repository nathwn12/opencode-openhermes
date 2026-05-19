import path from "node:path";
import { HookPhase, HookResult } from "../types.ts";
import type { HookContext, PostToolUseHook } from "../types.ts";
import { readSkillFrontmatter, resolveRoute } from "../../routing/index.ts";
import type { RouteEvidence } from "../../routing/index.ts";
import { ROUTE_GUIDANCE_PREFIX } from "../../routing/index.ts";
import {
  ROUTE_ACTIONS,
  ROUTE_OUTCOMES,
  ROUTE_VERIFICATIONS,
  ROUTE_WORK_TYPES,
} from "../../routing/types.ts";

const ROUTE_EVIDENCE_PREFIX = "ROUTE_EVIDENCE:";

function isRouteOutcome(value: unknown): value is RouteEvidence["outcome"] {
  return typeof value === "string" && ROUTE_OUTCOMES.includes(value as RouteEvidence["outcome"]);
}

function isRouteVerification(value: unknown): value is NonNullable<RouteEvidence["verification"]> {
  return typeof value === "string" && ROUTE_VERIFICATIONS.includes(value as NonNullable<RouteEvidence["verification"]>);
}

function isRouteAction(value: unknown): value is NonNullable<RouteEvidence["action"]> {
  return typeof value === "string" && ROUTE_ACTIONS.includes(value as NonNullable<RouteEvidence["action"]>);
}

function isRouteWork(value: unknown): value is NonNullable<RouteEvidence["work"]> {
  return typeof value === "string" && ROUTE_WORK_TYPES.includes(value as NonNullable<RouteEvidence["work"]>);
}

function parseRouteEvidence(output: string): RouteEvidence | null {
  const evidenceLine = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith(ROUTE_EVIDENCE_PREFIX));

  if (!evidenceLine) return null;

  const raw = evidenceLine.slice(ROUTE_EVIDENCE_PREFIX.length).trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<RouteEvidence>;
    if (!isRouteOutcome(parsed.outcome)) return null;
    if (parsed.verification !== undefined && !isRouteVerification(parsed.verification)) return null;
    if (parsed.action !== undefined && !isRouteAction(parsed.action)) return null;
    if (parsed.work !== undefined && !isRouteWork(parsed.work)) return null;
    if (parsed.target !== undefined && typeof parsed.target !== "string") return null;
    if (parsed.reason !== undefined && typeof parsed.reason !== "string") return null;

    return {
      outcome: parsed.outcome,
      ...(parsed.verification ? { verification: parsed.verification } : {}),
      ...(parsed.action ? { action: parsed.action } : {}),
      ...(parsed.work ? { work: parsed.work } : {}),
      ...(parsed.target ? { target: parsed.target } : {}),
      ...(parsed.reason ? { reason: parsed.reason } : {}),
    };
  } catch {
    return null;
  }
}

export const dynamicRouteHook: PostToolUseHook = {
  metadata: {
    name: "dynamic-route",
    priority: 20,
    phase: HookPhase.LATE,
    dependencies: [],
    errorHandling: "isolate",
  },

  async execute(context: HookContext, output: string) {
    const evidence = parseRouteEvidence(output);
    const skillsDir = typeof context._routingSkillsDir === "string" ? context._routingSkillsDir : undefined;

    if (!evidence || !skillsDir || !context.agent) {
      return { result: HookResult.CONTINUE };
    }

    // Try cache first (zero I/O on the hot path), fall back to disk
    let frontmatter: ReturnType<typeof readSkillFrontmatter> | undefined;
    const cachedRouteMap = context._routeCache?.getRouteMap(context.agent);
    if (cachedRouteMap) {
      frontmatter = { route: cachedRouteMap };
    } else {
      const skillFilePath = path.join(skillsDir, context.agent, "SKILL.md");
      frontmatter = readSkillFrontmatter(skillFilePath);
    }

    if (!frontmatter) {
      return { result: HookResult.CONTINUE };
    }

    const resolution = resolveRoute(frontmatter.route, evidence);
    const guidance = `${ROUTE_GUIDANCE_PREFIX} ${JSON.stringify(resolution)}`;
    const modifiedOutput = output.includes(ROUTE_GUIDANCE_PREFIX)
      ? output
      : `${output.trimEnd()}\n${guidance}`.trim();

    // After fusion's skill-link verification, reload the route cache so newly created
    // skills are discovered on the next routing hop (not this one — the cache was read above).
    if (context.agent === "oh-skills-link" && context._routeCache) {
      context._routeCache.reload();
    }

    return {
      result: HookResult.INJECT,
      modifiedOutput,
    };
  },
};
