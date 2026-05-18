import {
  ROUTE_ACTIONS,
  ROUTE_OUTCOMES,
  ROUTE_VERIFICATIONS,
  ROUTE_WORK_TYPES,
} from "./types.ts";
import type {
  RouteAction,
  RouteOutcome,
  RouteResolution,
  RouteVerification,
  RouteWork,
  RuntimeRouteDecision,
} from "./types.ts";

export const ROUTE_GUIDANCE_PREFIX = "ROUTE_GUIDANCE:";
export const NEXT_ROUTE_PREFIX = "NEXT_ROUTE:";

interface ConsumedRouteGuidance {
  output: string;
  selected: string | null;
}

const runtimeRouteState = new Map<string, RuntimeRouteDecision>();

function isRouteOutcome(value: unknown): value is RouteOutcome {
  return typeof value === "string" && ROUTE_OUTCOMES.includes(value as RouteOutcome);
}

function isRouteVerification(value: unknown): value is RouteVerification {
  return typeof value === "string" && ROUTE_VERIFICATIONS.includes(value as RouteVerification);
}

function isRouteAction(value: unknown): value is RouteAction {
  return typeof value === "string" && ROUTE_ACTIONS.includes(value as RouteAction);
}

function isRouteWork(value: unknown): value is RouteWork {
  return typeof value === "string" && ROUTE_WORK_TYPES.includes(value as RouteWork);
}

export function extractRouteGuidance(output: string): RouteResolution | null {
  const guidanceLine = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith(ROUTE_GUIDANCE_PREFIX));

  if (!guidanceLine) return null;

  const raw = guidanceLine.slice(ROUTE_GUIDANCE_PREFIX.length).trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<RouteResolution>;
    if (!isRouteOutcome(parsed.outcome)) return null;
    if (parsed.verification !== undefined && !isRouteVerification(parsed.verification)) return null;
    if (parsed.action !== undefined && !isRouteAction(parsed.action)) return null;
    if (parsed.work !== undefined && !isRouteWork(parsed.work)) return null;
    if (!Array.isArray(parsed.candidates) || !parsed.candidates.every((candidate) => typeof candidate === "string")) {
      return null;
    }
    if (parsed.selected !== null && parsed.selected !== undefined && typeof parsed.selected !== "string") {
      return null;
    }
    if (typeof parsed.reason !== "string") return null;

    return {
      outcome: parsed.outcome,
      ...(parsed.verification ? { verification: parsed.verification } : {}),
      ...(parsed.action ? { action: parsed.action } : {}),
      ...(parsed.work ? { work: parsed.work } : {}),
      candidates: parsed.candidates,
      selected: parsed.selected ?? null,
      reason: parsed.reason,
    };
  } catch {
    return null;
  }
}

export function consumeRouteGuidance(output: string): ConsumedRouteGuidance {
  const guidance = extractRouteGuidance(output);
  if (!guidance?.selected || output.includes(NEXT_ROUTE_PREFIX)) {
    return { output, selected: guidance?.selected ?? null };
  }

  return {
    output: `${output.trimEnd()}\n${NEXT_ROUTE_PREFIX} ${guidance.selected}`,
    selected: guidance.selected,
  };
}

function extractExplicitNextRoute(output: string): string | null {
  const routeLine = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith(NEXT_ROUTE_PREFIX));

  if (!routeLine) return null;

  const raw = routeLine.slice(NEXT_ROUTE_PREFIX.length).trim();
  if (!raw || /\s/.test(raw)) return null;
  return raw;
}

export function extractRuntimeRouteDecision(output: string): RuntimeRouteDecision | null {
  const explicitNextRoute = extractExplicitNextRoute(output);
  if (explicitNextRoute) {
    return {
      selected: explicitNextRoute,
      source: "next_route",
    };
  }

  const guidance = extractRouteGuidance(output);
  if (!guidance?.selected) return null;

  return {
    selected: guidance.selected,
    source: "route_guidance",
    outcome: guidance.outcome,
    verification: guidance.verification,
    action: guidance.action,
    work: guidance.work,
    candidates: guidance.candidates,
    reason: guidance.reason,
  };
}

export function rememberRuntimeRouteDecision(sessionId: string, output: string): RuntimeRouteDecision | null {
  const decision = extractRuntimeRouteDecision(output);
  if (!decision) {
    runtimeRouteState.delete(sessionId);
    return null;
  }

  runtimeRouteState.set(sessionId, decision);
  return decision;
}

export function getRuntimeRouteDecision(sessionId: string): RuntimeRouteDecision | null {
  return runtimeRouteState.get(sessionId) ?? null;
}

export function clearRuntimeRouteDecision(sessionId: string): void {
  runtimeRouteState.delete(sessionId);
}
