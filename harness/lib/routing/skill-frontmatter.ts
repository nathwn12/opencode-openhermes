import fs from "node:fs";
import type { RouteOutcome, SkillRouteMap, SkillRoutingFrontmatter } from "./types.ts";

const EMPTY_ROUTES: SkillRouteMap = {
  pass: [],
  fail: [],
  blocker: [],
};

function stripQuotes(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function parseRouteValue(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((entry) => stripQuotes(entry))
      .filter(Boolean);
  }

  return [stripQuotes(trimmed)].filter(Boolean);
}

function isRouteOutcome(value: string): value is RouteOutcome {
  return value === "pass" || value === "fail" || value === "blocker";
}

export function extractFrontmatter(source: string): string | null {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return match?.[1] ?? null;
}

export function parseSkillFrontmatter(source: string): SkillRoutingFrontmatter | null {
  const rawFrontmatter = extractFrontmatter(source);
  if (!rawFrontmatter) return null;

  const route: SkillRouteMap = {
    pass: [],
    fail: [],
    blocker: [],
  };

  let name: string | undefined;
  let description: string | undefined;
  let tier: string | undefined;
  let inRouteBlock = false;
  let activeRouteKey: RouteOutcome | null = null;

  for (const rawLine of rawFrontmatter.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) continue;

    if (/^route:\s*$/.test(trimmed)) {
      inRouteBlock = true;
      activeRouteKey = null;
      continue;
    }

    if (inRouteBlock) {
      const routeMatch = line.match(/^\s{2,}(pass|fail|blocker):\s*(.*)$/);
      if (routeMatch && isRouteOutcome(routeMatch[1])) {
        activeRouteKey = routeMatch[1];
        route[activeRouteKey].push(...parseRouteValue(routeMatch[2]));
        continue;
      }

      const listMatch = line.match(/^\s{4,}-\s+(.+)$/);
      if (listMatch && activeRouteKey) {
        route[activeRouteKey].push(stripQuotes(listMatch[1]));
        continue;
      }

      if (!/^\s/.test(line)) {
        inRouteBlock = false;
        activeRouteKey = null;
      } else {
        activeRouteKey = null;
        continue;
      }
    }

    const fieldMatch = line.match(/^(name|description|tier):\s*(.+)$/);
    if (!fieldMatch) continue;

    const value = stripQuotes(fieldMatch[2]);
    switch (fieldMatch[1]) {
      case "name":
        name = value;
        break;
      case "description":
        description = value;
        break;
      case "tier":
        tier = value;
        break;
    }
  }

  return {
    name,
    description,
    tier,
    route,
  };
}

export function readSkillFrontmatter(skillFilePath: string): SkillRoutingFrontmatter | null {
  if (!fs.existsSync(skillFilePath)) return null;
  return parseSkillFrontmatter(fs.readFileSync(skillFilePath, "utf8"));
}

export function emptySkillRoutes(): SkillRouteMap {
  return {
    pass: [...EMPTY_ROUTES.pass],
    fail: [...EMPTY_ROUTES.fail],
    blocker: [...EMPTY_ROUTES.blocker],
  };
}
