# Runtime Guards — Prevent Stale Assumptions and Silent Failures

## Problem Statement
OpenHermes agents often operate on cached assumptions that become stale:
- "npm install is available" → but npm registry is down or rate-limited
- "git fetch works" → but remote repository was deleted or moved  
- "Python 3.10 exists" → but path changed to Python 3.12
- "Provider endpoint reachable" → but load balancer rotated certificates

These stale assumptions cause:
- Silent failures (agent retries indefinitely)
- Wasted compute (re-running commands that will fail anyway) 
- Incorrect behavior based on outdated information

## Guard Enforcement

### 1. Session Initialization Constraint
At session start, create active constraint with `enforcement: hard`:
```json
{
  "id": "runtime-guards-session",
  "class": "constraint",
  "project": "current-project",
  "summary": "Runtime guards for stale assumption prevention",
  "constraints": [
    {
      "name": "never_cache_tool_state",
      "description": "Every tool call → fresh verification, no cache lookup",
      "enforcement": "hard"
    },
    {
      "name": "environment_fingerprint_required", 
      "description": "Record OS, shell, cwd, provider, model at session start",
      "enforcement": "hard" 
    }
  ]
}
```

### 2. Pre-Tool-Call Check (Mandatory)
Before any tool invocation:
```javascript
// In agent execution loop
function beforeToolCall(toolName, args) {
  // Verify environment matches session fingerprint
  const envMatch = verifyEnvironmentFingerprint()
  if (!envMatch) {
    // Environment changed mid-session → hard fail or restart
    throw new Error('Runtime guard: environment mismatch detected')
  }
  
  // Never trust cached tool results across sessions
  return { allow: true, fingerprint: generateFingerprint() }
}
```

### 3. Compression Guard (Critical)
Before adding verification receipts to compress buffer:
```javascript
function filterReceiptForCompression(receipt) {
  // Check if receipt contains stale environment markers
  const hasStaleEnv = /\b(node_version|python_path|npm_registry)\b/.test(receipt.result_detail)
  
  // Redact or remove stale artifacts before compression
  if (hasStaleEnv) {
    report.warn(`Excluding stale artifact from compress buffer: ${receipt.id}`)
    return false
  }
  
  return true
}
```

### 4. State Drift Detection (Post-Compression)
After each `compress` operation:
```javascript
function detectStateDrift(compressedBuffer) {
  const fingerprints = computeFingerprints(compressedBuffer.receipts)
  
  // Check for new environment markers that weren't in last fingerprint
  const driftMarkers = [
    /\b(node_version:.*?)(?!\b)/,
    /\b(python_path:.*?)(?!\b)/, 
    /\b(npm_registry:.*?)(?!\b)/
  ]
  
  for (const marker of driftMarkers) {
    const matches = marker.exec(compressedBuffer.receipts)
    if (matches && !lastFingerprint.includes(matches[0])) {
      report.error(`State drift detected: ${matches[0]}`)
      // Either revert compression or flag for manual review
      return { drifted: true, marker: matches[0] }
    }
  }
  
  lastFingerprint = fingerprints
  return { drifted: false }
}
```

## Enforcement Points

### Memory Write (ohc_save)
```javascript
// In openhermes-memory MCP server
function putMemoryObject(obj) {
  // Check for stale environment markers before persisting
  if (hasStaleEnvironmentMarker(obj.content)) {
    obj.content = redactStaleMarkers(obj.content)
    obj.stale = true
  }
}
```

### Compress Event
```javascript
// In OpenHermes's built-in dynamic-context-pruning plugin
function onCompress() {
  const compressBuffer = buildSummary()
  // Filter out stale artifacts before adding to buffer
  const filteredBuffer = compressBuffer.filter(receipt => 
    !hasStaleEnvironmentMarker(receipt.result_detail)
  )
  return filteredBuffer
}
```

### Session Resume (Recovery) 
On session resume or checkpoint recovery:
```javascript
// Load all active memory objects
const loadedObjects = loadMemory()
// Immediately re-verify environment fingerprint for each receipt
const safeObjects = loadedObjects.map(obj => ({
  ...obj,
  summary: redactStaleEnvironmentFromSummary(obj.summary)
}))
```

## Fail-Safe Mechanisms

### 1. Pattern Mismatch / False Negatives
**What if a new stale marker pattern emerges?**
- Add to `staleMarkers` array immediately (no deployment cycle needed)
- Run retrospective scan on last 30 days of memory objects
- Flag affected objects for manual review + redaction

### 2. Over-Redaction / False Positives  
**What if legitimate data gets blocked?**
- Allow explicit bypass via constraint: `enforce_runtime_guards: false` (rare use case)
- Log all rejections to audit trail for review
- Provide CLI command: `/openhermes-audit` for staleness checks

### 3. Memory Corruption During Redaction
**What if redaction process itself fails?**
- Fall back to raw receipts (`opencode.db`) with full pattern matching
- Never silently skip redaction — always log and fail-closed

## Configuration & Overrides

| Config | Default | Override |
|--------|---------|----------|
| `enforce_runtime_guards` | true | Constraint or environment variable |
| `stale_marker_patterns_path` | rules/state-drift.md | Custom JSON/YAML file |
| `retrospective_scan_days` | 30 | 7-90 |
| `allow_bypass_paths` | [] (empty) | List of paths always excluded from filtering |

## Compliance & Audit

Every redacted memory object must include:
```json
{
  "redacted_at": "2026-05-09T07:30:00Z",
  "redaction_version": "1.0.0",
  "patterns_applied": ["node_version", "python_path", ...],
  "original_checksum": "sha256(original_content)"
}
```

This allows:
- Forensic reconstruction of what was redacted
- Verification that no legitimate data was accidentally blocked
- Audit trail for compliance requirements (SOC2, HIPAA, PCI)

## Integration with Other Rules

- `rules/verification.md`: Add "stale: true" to verification receipt schema  
- `rules/state-drift.md`: Hash computation must exclude stale markers
- `commands/doctor.md`: Include fingerprint and staleness checks in the doctor workflow

---

**Status**: Active (enforcement: hard)  
**Scope**: Global  
**Created**: 2026-05-09T07:31:00Z  
**Author**: agent (auto-generated via gap analysis)
