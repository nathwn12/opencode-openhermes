---
name: oh-canary
description: "Post-deploy verification — monitor for errors and regressions"
---

# oh-canary

## When to Use
After deploying to production. Watches the live app for console errors, performance regressions, and page failures.

## Workflow
1. **Set baseline** — capture pre-deploy screenshots and metrics
2. **Deploy check** — verify deploy completed successfully
3. **Canary run** — navigate key user flows, capture screenshots, log console errors
4. **Compare** — diff against pre-deploy baselines
5. **Alert** — surface anomalies, performance regressions, new errors
6. **Recovery** — if critical issues found, suggest rollback

## Output
Canary report with: health status, screenshots (before/after), error log, performance diff, ship/go/no-go verdict.

## Anti-patterns
- Skipping canary for "trivial" deploys (the trivial ones always break)
- Alert fatigue (every console.warn is not a production incident)
- No rollback plan ("we'll fix it forward")
