---
name: oh-ascii
description: "Complete ASCII diagramming toolkit: design patterns, PlantUML generation, and structural validation. Use when creating architecture diagrams, file trees, flowcharts, sequence diagrams, box-drawing layouts, or validating ASCII art alignment in documentation."
route:
  pass: surface
  fail: surface
  blocker: surface
tier: 2
format: chunked
sections:
  patterns: "ASCII design patterns: box-drawing characters, architecture diagrams, file trees, progress/swimlane/blast-radius/comparison/reversibility visualizations"
  plantuml: "PlantUML generation workflow, 7 template types (sequence/class/activity/state/component/use case/deployment), CLI options"
  validation: "Structural validation: check_ascii_alignment.py script, 5 checks, compiler-like output format, integration pattern"
  reference: "Anti-patterns (6 rules), troubleshooting table (7 issues with causes/fixes), routing table"
triggers:
  - "ASCII diagram"
  - "box drawing"
  - "architecture diagram"
  - "sequence diagram"
  - "flowchart"
  - "file tree"
  - "diagram alignment"
  - "PlantUML ASCII"
  - "blast radius visualization"
  - "swimlane diagram"
  - "timeline diagram"
  - "status tracking visual"
  - "diagram validation"
---

# oh-ascii

Complete ASCII diagramming — three phases: **Design** (patterns & layout rules), **Generate** (PlantUML workflow), **Validate** (structural alignment checking). All output renders in monospace terminals.

This skill is **chunked**. Read this index, pick the section you need, and `read()` only that section file.

## Section Index

| Section | File | Covers |
|---|---|---|
| Patterns | `sections/patterns.md` | Box-drawing character sets (default/emphasis/title/soft/portable, status glyphs, arrows, blocks), architecture diagrams with directional flow, file trees with change annotations ([A]/[M]/[D] + line counts + risk markers), progress bars, swimlane diagrams, blast radius concentric rings, before/after comparisons, reversibility timelines, key rules (monospace, <80 cols, max 3 levels nesting, set consistency) |
| PlantUML | `sections/plantuml.md` | PlantUML text-mode ASCII generation workflow (`-utxt` / `-txt`), 7 template types with example PUML: sequence (actor/participant/database), component (service boundaries), activity (branching workflows with decision nodes), state (state transitions with events), CLI options (output dir, batch, charset) |
| Validation | `sections/validation.md` | check_ascii_alignment.py script usage (single file, batch dir, --verbose, --warn-only), 5 structural checks (vertical alignment, corner connections, junction validity, line continuity, box closure), compiler-like error output format with suggestions, exit codes (error=1, warning=2, clean=0), integration pattern (create → validate → fix → re-validate) |
| Reference | `sections/reference.md` | Anti-patterns (mixing character sets, tabs in diagrams, deep nesting past 3, >80-col diagrams, inline ASCII outside code blocks, PlantUML for <5-box one-offs), troubleshooting table (7 issues: garbled Unicode, misalignment, missing plantuml, tab false positives, validator limitations, skipped diagrams, unicode rendering), routing table |

**Usage:**
1. Read this stub (already loaded)
2. Decide which section you need from the table above
3. `read("sections/<section>.md")` to load only that content
4. Only read additional sections if the task requires them

## Routing

| Outcome | Route | Reason |
|---------|-------|--------|
| pass | surface | Diagram created/validated, report results |
| fail | surface | Issues found, surface for manual fix |
| blocker | surface | Cannot proceed, report why |
