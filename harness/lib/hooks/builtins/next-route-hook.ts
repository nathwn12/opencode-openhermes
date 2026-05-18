import { HookPhase, HookResult } from "../types.ts";
import type { HookContext, RouteHook } from "../types.ts";

export const nextRouteHook: RouteHook = {
  metadata: {
    name: "next-route",
    priority: 90,
    phase: HookPhase.EARLY,
    dependencies: [],
    errorHandling: "isolate",
  },

  async execute(context: HookContext, route: string) {
    const nextRoute = context._nextRoute?.selected;
    if (!nextRoute || nextRoute === route) {
      return { result: HookResult.CONTINUE, modifiedRoute: route };
    }

    return {
      result: HookResult.CONTINUE,
      modifiedRoute: nextRoute,
    };
  },
};
