# Phase A: Design Patterns

### Box-Drawing Characters

Use ONE set per diagram. Never mix.

```
default:   ┌─┐ │ └─┘  ├─┤ ┬ ┴ ┼
emphasis:  ┏━┓ ┃ ┗━┛  ┣━┫ ┳ ┻ ╋
title:     ╔═╗ ║ ╚═╝  ╠═╣ ╦ ╩ ╬
soft:      ╭─╮ │ ╰─╯
portable:  +-+ | +-+  +-+ + + +
arrows:    → ← ↑ ↓ ─> <─ ──> <──
blocks:    █ ▓ ░ ▏▎▍▌▋▊▉
status:    ● ○ ✓ ✗ ⚠ ◆ ◇ ▶ ▷ ↑↓→ ▓▒░
```

| Set | Use |
|-----|-----|
| `default` ─│ | Most diagrams |
| `emphasis` ━┃ | Headers, focus elements |
| `title` ═║ | Section banners only |
| `soft` ╭╮╰╯ ─│ | Status cards, ambient UI |
| `portable` +-\| | CI/TTY fallback |

Status glyphs (closed set): `● ○ ✓ ✗ ⚠ ◆ ◇ ▶ ▷  ↑ ↓ →  ▓ ░ ▒`

### Diagram Patterns

#### Architecture
```
┌──────────────┐      ┌──────────────┐
│   Frontend   │─────>│   Backend    │
│   React 19   │      │   FastAPI    │
└──────────────┘      └───────┬──────┘
                              v
                      ┌──────────────┐
                      │  PostgreSQL  │
                      └──────────────┘
```

#### File Trees with Annotations
```
src/
├── api/
│   ├── routes.py          [M] +45 -12    !! high-traffic
│   └── schemas.py         [M] +20 -5
├── services/
│   └── billing.py         [A] +180       ** new
└── tests/
    └── test_billing.py    [A] +120       ** new

Legend: [A]dd [M]odify [D]elete  !! Risk  ** New
```

#### Progress Bars, Swimlanes, Blast Radius, Comparisons, Reversibility

##### Progress
```
[████████░░] 80% Complete
+ Design    (2d)   + Backend   (5d)
~ Frontend  (3d)   - Testing   (pending)
```

##### Swimlane
```
Backend  ===[Schema]======[API]===========================[Deploy]====>
                |            |                                ^
                |            +------blocks------+             |
Frontend -------[Wait]--------[Components]=======[Integration]=+

=== active   --- blocked/waiting   | dependency
```

##### Blast Radius (Concentric Rings)
```
            Ring 3: Tests (8 files)
       +-----------------------------------+
       |    Ring 2: Transitive (5)          |
       |   +----------------------------+   |
       |   |  Ring 1: Direct (3)        |   |
       |   |   +------------------+     |   |
       |   |   |   CHANGED FILE   |     |   |
       |   |   +------------------+     |   |
       |   +----------------------------+   |
       +-----------------------------------+
```

##### Comparison (Before/After)
```
BEFORE                          AFTER
┌────────────────┐              ┌────────────────┐
│   Monolith     │              │  Service A     │──┐
│   (all-in-1)   │              └────────────────┘  │  ┌──────────┐
└────────────────┘              ┌────────────────┐  ├─>│  Shared  │
                                │  Service B     │──┘  │  Queue   │
                                └────────────────┘     └──────────┘
```

##### Reversibility Timeline
```
Phase 1  [================]  FULLY REVERSIBLE    (add column)
Phase 2  [================]  FULLY REVERSIBLE    (new endpoint)
Phase 3  [============....]  PARTIALLY           (backfill)
              --- POINT OF NO RETURN ---
Phase 4  [........????????]  IRREVERSIBLE        (drop column)
```

### Key Rules
- **Font**: Monospace only — box-drawing requires fixed-width
- **Arrows**: `->`, `-->`, or `|` with `v`/`^`
- **Width**: Under 80 cols for terminal compat
- **Nesting**: Max 3 levels
- **Labels**: Short — long text breaks alignment
- **Set consistency**: One set per diagram, never mixed
