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
route:
  pass: surface
  fail: oh-investigate
  blocker: surface
---

# oh-security

Security audit. Two modes: **Daily** (8/10 confidence — low noise, high signal) and **Comprehensive** (2/10 bar — wider net). Output: Security Posture Report. Read-only — diagnosis only.

## Modes
- **Daily** (default) — only flag findings with strong evidence. Skips speculative checks.
- **Comprehensive** (`--comprehensive`) — surface everything plausible. User decides.

## Phases

### Phase 0: Stack + Architecture Mental Model
Detect language, framework, components, trust boundaries, data flows, attack surface.

### Phase 1: Attack Surface Census
Public vs authed vs admin endpoints. File uploads, external integrations, WebSocket, webhooks. CI/CD workflows, containers, IaC, deploy targets.

### Phase 2: Secrets Archaeology
Git history for leaked credentials (AWS, OpenAI, GitHub, Slack, generic). .env tracking status. CI inline secrets.

### Phase 3: Dependency Supply Chain
CVEs in direct deps, install scripts in production deps, lockfile integrity, abandoned packages. Diff-mode limits to changed deps.

### Phase 4: CI/CD Security
Unpinned third-party actions, `pull_request_target` misuse, script injection via `${{ github.event.* }}`, secrets as env vars, CODEOWNERS on workflows.

### Phase 5: Infrastructure Shadow
Dockerfiles (root, secrets in ARG, missing USER), configs with prod DB URLs, IaC (overly permissive IAM, privileged K8s). Staging → prod refs.

### Phase 6: Webhooks
Endpoints without signature verification, TLS verification disabled, overly broad OAuth scopes.

### Phase 7: LLM Security
Prompt injection (user input → system prompts), unsanitized LLM output in UI, tool calls without validation, hardcoded AI keys.

### Phase 8: OWASP + STRIDE
Map findings to OWASP Top 10 and STRIDE. Coverage gaps identified.

## Output

```
Security Posture Report
Critical (n): finding — file:line — remediation
High (n):
Medium (n):
Low (n):
OWASP Coverage: A01-A10
STRIDE: Spoofing..Elevation of Privilege
```

## Rules
- Read-only (diagnosis only). Auto-fix low severity only if explicitly asked.
- Daily: 8/10 gate. Would you stake reputation on it?
- Comprehensive: 2/10 gate. Surface everything.
- No false positives on git history. Placeholder values excluded. Rotated secrets still flagged.
- Prioritize by blast radius: RCE > credential exposure > info leak > best-practice.
- Distinguish direct vs transitive dependency findings.
- Use Grep/Glob tools, not bash grep.

## Routing

| Outcome | Route |
|---------|-------|
| pass | surface (report findings) |
| fail | → oh-investigate (deepen) |
| blocker | → surface |
