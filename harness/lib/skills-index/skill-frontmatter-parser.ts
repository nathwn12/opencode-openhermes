// ---------------------------------------------------------------------------
// Shared SKILL.md frontmatter parser
//
// Canonical parser for YAML-style frontmatter blocks in SKILL.md files.
// Handles all three route value formats: inline scalar, inline array,
// and list items — plus top-level fields (name, description, tier).
//
// This is the SINGLE source of truth. Both the routing subsystem and the
// skills-index subsystem delegate here. All fixes and features go here first.
// ---------------------------------------------------------------------------

import type { SkillRouteMap } from "../routing/types.ts";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SkillFrontmatterResult {
  name: string | undefined;
  description: string | undefined;
  tier: string | undefined;
  route: SkillRouteMap;
}

// ---------------------------------------------------------------------------
// Regexes
// ---------------------------------------------------------------------------

/** Match the frontmatter block between `---` delimiters. */
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** Top-level fields — name, description, tier. */
const FIELD_RE = /^(name|description|tier):\s*(.*)$/;

/** Indented route sub-key — pass/fail/blocker with optional inline value. */
const ROUTE_KEY_RE = /^\s{2,}(pass|fail|blocker):\s*(.*)$/;

/** List item under a route key. */
const LIST_ITEM_RE = /^\s{4,}-\s+(.+)$/;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function stripQuotes(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

/**
 * Parse a route value that may be an inline array `[a, b]` or a scalar.
 * Always returns an array (possibly single-element or empty).
 */
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract the raw frontmatter string (content between `---` markers) from a
 * SKILL.md source string. Returns `null` if no frontmatter is found.
 */
export function extractFrontmatter(source: string): string | null {
  const match = source.match(FRONTMATTER_RE);
  return match?.[1] ?? null;
}

/**
 * Parse a SKILL.md source string and extract structured frontmatter.
 *
 * Handles:
 * - Top-level fields: `name`, `description`, `tier`
 * - Route block starting with `route:` at top level
 * - Route sub-keys: `pass:`, `fail:`, `blocker:` (2+ space indent)
 * - Three route value formats:
 *   - Inline scalar: `  pass: oh-grill`
 *   - Inline array:  `  pass: [oh-grill, oh-planner]`
 *   - List items:    `  pass:\n    - oh-grill\n    - oh-planner`
 *
 * Returns `null` if the source has no frontmatter block.
 * Returns a `SkillFrontmatterResult` with all route values as arrays.
 */
export function parseSkillFrontmatter(source: string): SkillFrontmatterResult | null {
  const rawFrontmatter = extractFrontmatter(source);
  if (!rawFrontmatter) return null;

  const route: SkillRouteMap = { pass: [], fail: [], blocker: [] };
  let name: string | undefined;
  let description: string | undefined;
  let tier: string | undefined;
  let inRouteBlock = false;
  let activeRouteKey: "pass" | "fail" | "blocker" | null = null;

  for (const rawLine of rawFrontmatter.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) continue;

    // ---- Detect route block start ----
    if (!inRouteBlock && trimmed === "route:") {
      inRouteBlock = true;
      activeRouteKey = null;
      continue;
    }

    // ---- Inside route block ----
    if (inRouteBlock) {
      const routeMatch = line.match(ROUTE_KEY_RE);
      if (routeMatch) {
        const key = routeMatch[1] as "pass" | "fail" | "blocker";
        const val = routeMatch[2].trim();

        if (val.startsWith("[")) {
          // Inline array: [a, b, c]
          activeRouteKey = null;
          route[key].push(...parseRouteValue(val));
        } else if (val && val !== "-") {
          // Inline scalar (signal value, not a list-starter dash)
          activeRouteKey = null;
          route[key].push(stripQuotes(val));
        } else {
          // Empty value or bare dash — list items follow on next lines
          activeRouteKey = key;
        }
        continue;
      }

      // List items under the active route key
      const listMatch = line.match(LIST_ITEM_RE);
      if (listMatch && activeRouteKey) {
        route[activeRouteKey].push(stripQuotes(listMatch[1]));
        continue;
      }

      // Non-indented line exits the route block
      if (!line.startsWith(" ")) {
        inRouteBlock = false;
        activeRouteKey = null;
      } else {
        // Indented but unrecognized — clear active key, stay in block
        activeRouteKey = null;
        continue;
      }
    }

    // ---- Top-level fields (outside route block) ----
    const fieldMatch = line.match(FIELD_RE);
    if (!fieldMatch) continue;

    const rawValue = stripQuotes(fieldMatch[2]);
    switch (fieldMatch[1]) {
      case "name":
        name = rawValue;
        break;
      case "description":
        description = rawValue;
        break;
      case "tier":
        tier = rawValue;
        break;
    }
  }

  return { name, description, tier, route };
}
