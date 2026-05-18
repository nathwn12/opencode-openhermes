import type { RouteEvidence, RouteResolution, SkillRouteMap } from "./types.ts";

function findCandidate(candidates: string[], fragment: string): string | null {
  return candidates.find((candidate) => candidate.includes(fragment)) ?? null;
}

function buildResolution(evidence: RouteEvidence, candidates: string[], selected: string | null, reason: string): RouteResolution {
  return {
    outcome: evidence.outcome,
    ...(evidence.verification ? { verification: evidence.verification } : {}),
    ...(evidence.action ? { action: evidence.action } : {}),
    ...(evidence.work ? { work: evidence.work } : {}),
    candidates,
    selected,
    reason,
  };
}

export function resolveRoute(routeMap: SkillRouteMap, evidence: RouteEvidence): RouteResolution {
  const candidates = [...routeMap[evidence.outcome]];
  if (candidates.length === 0) {
    return buildResolution(evidence, candidates, null, `No route candidates declared for outcome \"${evidence.outcome}\".`);
  }

  if (evidence.target && candidates.includes(evidence.target)) {
    return buildResolution(evidence, candidates, evidence.target, `Selected \"${evidence.target}\" from output evidence.`);
  }

  if (evidence.action === "fixable" || evidence.work === "implement") {
    const builderCandidate = findCandidate(candidates, "builder");
    if (builderCandidate) {
      return buildResolution(evidence, candidates, builderCandidate, `Selected \"${builderCandidate}\" for fixable implementation work.`);
    }
  }

  if (evidence.verification === "unverified") {
    const gauntletCandidate = findCandidate(candidates, "gauntlet");
    if (gauntletCandidate) {
      return buildResolution(evidence, candidates, gauntletCandidate, `Selected \"${gauntletCandidate}\" because work is still unverified.`);
    }
  }

  if (evidence.work === "verify") {
    const gauntletCandidate = findCandidate(candidates, "gauntlet");
    if (gauntletCandidate) {
      return buildResolution(evidence, candidates, gauntletCandidate, `Selected \"${gauntletCandidate}\" for verification work.`);
    }
  }

  if (evidence.work === "ship" && evidence.verification === "verified" && evidence.action === "done") {
    const shipCandidate = findCandidate(candidates, "ship");
    if (shipCandidate) {
      return buildResolution(evidence, candidates, shipCandidate, `Selected \"${shipCandidate}\" for verified ship-ready work.`);
    }
  }

  return buildResolution(evidence, candidates, candidates[0], `Selected first declared route for outcome \"${evidence.outcome}\".`);
}
