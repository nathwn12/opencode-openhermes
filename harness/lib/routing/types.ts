export const ROUTE_OUTCOMES = ["pass", "fail", "blocker"] as const;
export const ROUTE_VERIFICATIONS = ["verified", "unverified"] as const;
export const ROUTE_ACTIONS = ["done", "fixable", "needs-context", "blocked"] as const;
export const ROUTE_WORK_TYPES = ["implement", "verify", "ship", "diagnose", "surface"] as const;

export type RouteOutcome = (typeof ROUTE_OUTCOMES)[number];
export type RouteVerification = (typeof ROUTE_VERIFICATIONS)[number];
export type RouteAction = (typeof ROUTE_ACTIONS)[number];
export type RouteWork = (typeof ROUTE_WORK_TYPES)[number];

export interface SkillRouteMap {
  pass: string[];
  fail: string[];
  blocker: string[];
}

export interface SkillRoutingFrontmatter {
  name?: string;
  description?: string;
  tier?: string;
  route: SkillRouteMap;
}

export interface RouteEvidence {
  outcome: RouteOutcome;
  verification?: RouteVerification;
  action?: RouteAction;
  work?: RouteWork;
  target?: string;
  reason?: string;
}

export interface RouteResolution {
  outcome: RouteOutcome;
  verification?: RouteVerification;
  action?: RouteAction;
  work?: RouteWork;
  candidates: string[];
  selected: string | null;
  reason: string;
}

export interface RuntimeRouteDecision {
  selected: string;
  source: "next_route" | "route_guidance";
  outcome?: RouteOutcome;
  verification?: RouteVerification;
  action?: RouteAction;
  work?: RouteWork;
  candidates?: string[];
  reason?: string;
}
