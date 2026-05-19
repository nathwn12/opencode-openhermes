import fs from "node:fs";
import type { SkillRouteMap, SkillRoutingFrontmatter } from "./types.ts";
import {
  extractFrontmatter as sharedExtractFrontmatter,
  parseSkillFrontmatter as sharedParseSkillFrontmatter,
} from "../skills-index/skill-frontmatter-parser.ts";
import type { SkillFrontmatterResult } from "../skills-index/skill-frontmatter-parser.ts";

const EMPTY_ROUTES: SkillRouteMap = {
  pass: [],
  fail: [],
  blocker: [],
};

/**
 * Extract the raw frontmatter string (content between `---` markers).
 * Delegates to the shared canonical parser.
 */
export function extractFrontmatter(source: string): string | null {
  return sharedExtractFrontmatter(source);
}

/**
 * Parse SKILL.md frontmatter into structured routing data.
 * Delegates to the shared canonical parser.
 */
export function parseSkillFrontmatter(source: string): SkillRoutingFrontmatter | null {
  const result: SkillFrontmatterResult | null = sharedParseSkillFrontmatter(source);
  if (!result) return null;

  return {
    name: result.name,
    description: result.description,
    tier: result.tier,
    route: {
      pass: [...result.route.pass],
      fail: [...result.route.fail],
      blocker: [...result.route.blocker],
    },
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
