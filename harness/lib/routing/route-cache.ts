// ---------------------------------------------------------------------------
// RouteCache — singleton that caches all SKILL.md frontmatter at bootstrap
// Zero disk I/O on the routing hot path after initialization.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { parseSkillFrontmatter } from "./skill-frontmatter.ts";
import type { SkillRouteMap, SkillRoutingFrontmatter } from "./types.ts";

export interface CachedSkillMeta {
  frontmatter: SkillRoutingFrontmatter;
  sourcePath: string;
}

export class RouteCache {
  private static instance: RouteCache | null = null;
  private cache: Map<string, CachedSkillMeta> = new Map();
  private initialized = false;
  private skillsDir: string = "";
  private userDirs: string[] = [];

  private constructor() {}

  /** Get the singleton instance. */
  static getInstance(): RouteCache {
    if (!RouteCache.instance) {
      RouteCache.instance = new RouteCache();
    }
    return RouteCache.instance;
  }

  /** Reset singleton — used in tests for isolation. */
  static resetInstance(): void {
    RouteCache.instance = null;
  }

  /**
   * Walk all skills directories and cache every SKILL.md frontmatter.
   * Later directories override earlier ones on name conflict (matching bootstrap priority).
   * Missing/unreadable directories are silently skipped.
   */
  initialize(skillsDir: string, userDirs: string[]): void {
    if (this.initialized) return;
    this.skillsDir = skillsDir;
    this.userDirs = userDirs;
    this.cache.clear();

    const allDirs = [skillsDir, ...userDirs];

    for (const dir of allDirs) {
      if (!fs.existsSync(dir)) continue;

      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillName = entry.name;
        const skillFilePath = path.join(dir, skillName, "SKILL.md");

        if (!fs.existsSync(skillFilePath)) continue;

        try {
          const source = fs.readFileSync(skillFilePath, "utf8");
          const frontmatter = parseSkillFrontmatter(source);
          if (!frontmatter) continue;

          // Later dirs override earlier ones
          this.cache.set(skillName, { frontmatter, sourcePath: skillFilePath });
        } catch {
          // Parse failure — skip silently
          continue;
        }
      }
    }

    this.initialized = true;
  }

  /** Get cached frontmatter for a skill, or undefined on miss. */
  get(skillName: string): SkillRoutingFrontmatter | undefined {
    return this.cache.get(skillName)?.frontmatter;
  }

  /** Get just the route map portion for a skill — zero-alloc convenience. */
  getRouteMap(skillName: string): SkillRouteMap | undefined {
    return this.cache.get(skillName)?.frontmatter.route;
  }

  /** Check if a skill is cached. */
  has(skillName: string): boolean {
    return this.cache.has(skillName);
  }

  /**
   * Invalidate cache entries.
   * - With a skill name: clears just that entry.
   * - Without arguments: clears all entries and resets initialization state.
   */
  invalidate(name?: string): void {
    if (name) {
      this.cache.delete(name);
    } else {
      this.cache.clear();
      this.initialized = false;
    }
  }

  /**
   * Re-scan all skills directories and rebuild the cache. Used after skill installation
   * (e.g., oh-skills-link verification) to ensure new skills are discovered without a restart.
   */
  reload(): void {
    this.initialized = false;
    this.cache.clear();
    this.initialize(this.skillsDir, this.userDirs);
  }

  /** Iterate over all cached entries. */
  entries(): IterableIterator<[string, CachedSkillMeta]> {
    return this.cache.entries();
  }
}
