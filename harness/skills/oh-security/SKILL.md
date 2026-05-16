---
name: oh-security
description: "Security audit — secrets, dependencies, CI/CD, threat modeling"
tier: 3
route:
  pass: surface
  fail: oh-investigate
  blocker: surface
---

# oh-security

Security audit: secrets scanning, dependency checks, CI/CD review, threat modeling. Read-only — diagnosis only.

## Steps

1. Detect mode: daily (default, 8/10 confidence gate) or comprehensive (`--comprehensive`, 2/10 gate)
2. Map stack, architecture, trust boundaries, data flows, and attack surface
3. Scan git history, .env files, and CI inline configs for leaked secrets
4. Audit dependencies for CVEs, install scripts, lockfile integrity, and abandoned packages
5. Review CI/CD security — pinned actions, pull_request_target misuse, script injection, secrets exposure
6. Check infrastructure — Dockerfiles, IaC, prod DB URLs, staging-to-prod references
7. Assess OWASP Top 10 and STRIDE coverage gaps
8. Produce Security Posture Report with criticality-ranked findings and route

## Routing

| Outcome | Route |
|---------|-------|
| pass | surface (report findings) |
| fail | → oh-investigate (deepen) |
| blocker | → surface |
