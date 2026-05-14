---
name: oh-security
description: "Security audit: secrets archaeology, dependency supply chain, CI/CD security, OWASP Top 10, STRIDE threat modeling, LLM security. Two modes: daily (8/10 confidence gate) and comprehensive (2/10 bar)."
tier: 3
benefits-from: [oh-expert]
triggers:
  - "security audit"
  - "threat model"
  - "check for vulnerabilities"
  - "owasp review"
  - "pentest"
  - "security review"
  - "cso"
---

# oh-security

Security audit that finds the doors that are actually unlocked. Two modes: **daily** (8/10 confidence gate — low noise, high signal) and **comprehensive** (2/10 bar — casts a wider net, more findings). Output is a Security Posture Report with severity ratings and remediation plans. Does NOT make code changes — diagnosis only.

## Mode Selection

- **Daily** (default) — 8/10 confidence gate. Only flag findings with strong evidence. Skips speculative or trace-only checks. Runs all phases but reports only clear findings.
- **Comprehensive** (`--comprehensive`) — 2/10 bar. Surfaces more. Includes trace-only flags, speculative dependency issues, and historical pattern matching.

## Phases

### Phase 0: Stack Detection + Architecture Mental Model
Detect the project's language stack and framework. Build an explicit mental model: what are the components, trust boundaries, data flows, and attack surface.

### Phase 1: Attack Surface Census
Map what an attacker sees:
- Public vs authenticated vs admin endpoints
- File upload points, external integrations, background jobs
- WebSocket channels, webhook receivers
- CI/CD workflows, container configs, IaC, deploy targets

### Phase 2: Secrets Archaeology
Scan git history for leaked credentials (AWS keys, OpenAI keys, GitHub tokens, Slack tokens, generic secrets). Check `.env` tracking status. Scan CI configs for inline secrets.

### Phase 3: Dependency Supply Chain
Check beyond `npm audit`: known CVEs in direct deps, install scripts in production deps, lockfile integrity, abandoned packages. Diff-mode limits to changed deps.

### Phase 4: CI/CD Pipeline Security
Check for unpinned third-party actions, `pull_request_target` misuse, script injection via `${{ github.event.* }}`, secrets exposed as env vars, CODEOWNERS protection on workflow files.

### Phase 5: Infrastructure Shadow Surface
Dockerfiles (root user, secrets in ARG, missing USER), config files with prod DB URLs, IaC (overly permissive IAM, privileged K8s). Staging configs referencing prod.

### Phase 6: Webhook & Integration Audit
Webhook endpoints without signature verification, TLS verification disabled in prod, overly broad OAuth scopes.

### Phase 7: LLM & AI Security
Prompt injection vectors (user input flowing into system prompts), unsanitized LLM output rendered in UI, tool/function calling without validation, hardcoded AI API keys.

### Phase 8: OWASP Top 10 + STRIDE
Map findings to OWASP Top 10 categories and STRIDE threat model. Identify gaps in coverage across categories.

## Output Format

```
Security Posture Report
══════════════════════
Project: <name>
Branch:  <branch>
Mode:    daily | comprehensive
Date:    <date>

Critical (n):
  - <finding> — <file:line> — <remediation>

High (n):
  - <finding> — <file:line> — <remediation>

Medium (n):
  - <finding> — <file:line> — <remediation>

Low (n):
  - <finding> — <file:line> — <remediation>

OWASP Coverage:
  A01:Broken Access Control — n findings
  A02:Cryptographic Failures — n findings
  ...

STRIDE:
  Spoofing — n
  Tampering — n
  Repudiation — n
  Info Disclosure — n
  Denial of Service — n
  Elevation of Privilege — n
```

## Rules

- **Read-only.** No fixes. Diagnosis only, except for auto-fixable low-severity findings when explicitly asked.
- **Daily mode** gates findings at 8/10 confidence. If you would not stake your reputation on it, skip it in daily mode.
- **Comprehensive mode** gates at 2/10. Surface everything plausible. The user decides.
- **No false positives on git history.** Placeholder values ("your_", "changeme") excluded. Rotated secrets still flagged (they were exposed).
- **Prioritize by blast radius.** Remote code execution > credential exposure > info leak > best-practice gap.
- **Always distinguish direct vs transitive** dependencies in supply chain findings.
- **Use Grep/Glob tools** for searches, not bash grep. The bash blocks below show WHAT to search, not HOW.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → [report findings to user] |
| fail | → oh-investigate (deepen on findings) |
| blocker | → surface to user |
