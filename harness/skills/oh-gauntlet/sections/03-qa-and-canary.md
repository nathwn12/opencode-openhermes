# Stage 4: QA Sweep (tiered)
Quick (critical only) / Standard (+ medium) / Exhaustive (+ cosmetic). Execute flows, log findings, fix highest severity first, re-verify after each fix.

# Stage 5: Canary (post-deploy)
Capture pre-deploy baselines. Deploy. Navigate key flows. Diff against baselines. Surface anomalies. Suggest rollback if critical.

# Stage 6: Manual Verification
- Happy path, error path, no regression, logging covers failures, docs match behavior.
