# oh-ship — Push & Deploy (Steps 7–11)

## 7. Push to current branch
`git push origin <current-branch>`. Always the current branch. Never assume a different target.

## 8. PR (only if requested)
If the user explicitly said "create a PR", "open a pull request", or similar → create PR with summary and test evidence. If the change is very large, you may **suggest** a PR, but do not create one without explicit user confirmation.

## 9. Deploy
Trigger deploy (platform-specific). If no deploy target is configured, skip.

## 10. Verify
Smoke test or health check if applicable.

## 11. Post-ship docs sync
Cross-reference diff against README, CHANGELOG, ARCHITECTURE.md, CONTRIBUTING.md. Update to match what shipped.
