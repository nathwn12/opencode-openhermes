## Anti-Patterns

- Mixing character sets in one diagram
- Tabs in diagrams — use spaces; tabs cause false positives
- Deep nesting (4+ levels) — readability degrades past 3
- Over-80-col diagrams — break into sections
- Inline ASCII outside code blocks — always fence
- PlantUML for one-off simple diagrams — manual ASCII is faster for <5 boxes

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Garbled Unicode | Terminal lacks UTF-8 support | Ensure UTF-8 locale and monospace font |
| Misaligned diagram | Wrong font or tab characters | Fixed-width font (Consolas, Courier, Monaco); convert tabs to spaces |
| PlantUML command not found | Not installed | `java -jar plantuml.jar -txt` as fallback |
| False positives from tabs | Tab characters misalign columns | Convert tabs to spaces before validation |
| Diagram wrong but validator passes | Aesthetic spacing not structural | Validator checks structure, not visual alignment — review manually |
| Validator skipping diagram | Not an enclosed box diagram | Ensure all 4 corners present (`┌┐└┘` or equivalent) |
| Unicode chars not rendering | Terminal font missing glyphs | Use font with full box-drawing support (Cascadia Code, JetBrains Mono) |

## Routing

| Outcome | Route | Reason |
|---------|-------|--------|
| pass | surface | Diagram created/validated, report results |
| fail | surface | Issues found, surface for manual fix |
| blocker | surface | Cannot proceed, report why |
