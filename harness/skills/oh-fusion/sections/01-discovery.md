## Phase 1: Discovery

Input: user's skill source. Output: raw content loaded.

| Source | Access |
|--------|--------|
| `.agents/skills/<name>/SKILL.md` | Read file |
| `npx skills` package | `npx skills find <query>` |
| URL | Fetch content |
| User path | Resolve and read |
| Inline text | Capture raw |

Confirm: content loaded, frontmatter present, no access restrictions. For multiple: all loaded.
