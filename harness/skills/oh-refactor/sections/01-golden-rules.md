## Golden Rules

1. **Behavior preserved** — changes structure only. Changing behavior = feature, not refactor.
2. **Small steps** — one change, verify, commit, repeat. Never batch.
3. **Tests essential** — no safety net = editing blind. Write characterization tests first.
4. **One thing per commit** — never mix refactoring with feature work.
5. **Commit between safe states** — commit before starting, after each green run.

## When NOT to Refactor
- Code that works and will never change
- Critical production code without tests (add tests first)
- Tight deadline with no test safety net
- "Just because" — every refactor needs a clear purpose
