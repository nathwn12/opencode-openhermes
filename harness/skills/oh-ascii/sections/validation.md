# Phase C: Validation

Validates structural alignment of box-drawing characters in markdown code blocks. Script bundled at `scripts/check_ascii_alignment.py`.

### Usage
```bash
python3 scripts/check_ascii_alignment.py docs/ARCHITECTURE.md    # single file
python3 scripts/check_ascii_alignment.py docs/                    # batch dir
python3 scripts/check_ascii_alignment.py docs/ --verbose          # show skipped blocks
python3 scripts/check_ascii_alignment.py docs/ --warn-only        # warnings exit 0
```

### Checks
- **Vertical alignment** — connectors must match above/below
- **Corner connections** — corners connect to adjacent lines
- **Junction validity** — T-joins/crosses have correct connections
- **Line continuity** — horizontals terminate at valid endpoints
- **Box closure** — no dangling edges

### Output
Compiler-like format:
```
file.md:45:12: error: vertical connector '|' at col 12 has no match above
  -> Suggestion: Add '|', '├', '┤', '┬', or '┼' at line 44, col 12
```

| Level | Exit |
|-------|------|
| error | 1 |
| warning | 2 (or 0 with --warn-only) |
| info / clean | 0 |

Validation scope: enclosed box diagrams in fenced code blocks. Skips file trees (`├──`). Detects all line weights (light, double, heavy, rounded).

### Integration
```bash
# Create → validate → fix → re-validate until clean
python3 scripts/check_ascii_alignment.py docs/ARCHITECTURE.md
```
