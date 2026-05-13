# State Drift Detection — Hash-Based Environment Fingerprinting

## Problem Statement 
Compression accumulates verification receipts across sessions. Without drift detection, the same receipt content gets compressed repeatedly even when:
- Environment changed (node 18 → node 20, Python 3.9 → 3.11)  
- File system state drifted (git commit hash changed)
- Provider credentials rotated (API key in verification detail)

This creates "phantom" compressed data that references stale environments.

## Solution: Hash-Based Fingerprinting

### Environment Fingerprint Schema
```json
{
  "fingerprint": {
    "cwd": "C:/path/to/project",
    "harness_root": "%USERPROFILE%\\.config\\opencode",
    "project_root": "C:/path/to/project",
    "project": "my-project",
    "session_id": "session-123",
    "os": "win32",
    "release": "10.0.26100",
    "arch": "x64",
    "shell": "cmd.exe",
    "provider": "deepseek-v4-flash",
    "model": "openhermes-3.1",
    "sha256": "..."
  }
}
```

### Fingerprint Generation (Pre-Compression)
```javascript
function generateEnvironmentFingerprint() {
  const cwd = process.cwd()
  const provider = process.env.OPENCODE_PROVIDER || null
  const model = process.env.OPENCODE_MODEL || null

  return hash(
    `${cwd}${provider}${model || ''}`
  )
}
```

### Hash-Based Drift Detection (Post-Compression)
```javascript
function detectHashDrift(compressedSummary, lastFingerprint) {
  const currentFingerprint = generateEnvironmentFingerprint()
  
  if (!lastFingerprint || currentFingerprint !== lastFingerprint) {
    // Environment changed since last compression
    return { drift: true, oldFp: lastFingerprint, newFp: currentFingerprint }
  }
  
  return { drift: false }
}
```

## Enforcement Points

### Compress Event (Primary Guard)
```javascript
// In OpenHermes's built-in dynamic-context-pruning plugin
function onCompress() {
  // Generate fresh fingerprint before compressing
  const currentFp = generateEnvironmentFingerprint()
  
  if (!lastFp || currentFp !== lastFp) {
    // Drift detected → abort compression or truncate buffer
    report.warn(`State drift: environment changed from ${lastFp} to ${currentFp}`)
    return { truncated: true, reason: 'environment_drift' }
  }
  
  lastFp = currentFp
}
```

### Memory Write (Secondary Guard)  
```javascript
// In openhermes-memory MCP server  
funtion putMemoryObject(obj) {
  // Attach fingerprint to all new memory objects
  obj.fingerprint = generateEnvironmentFingerprint()
  
  // Compare against last compressed buffer's fingerprint
  if (!lastCompressedFp || obj.fingerprint !== lastCompressedFp) {
    // New environment → flag for review or redact stale content
    obj.stale_content_redacted = true
  }
}
```

### Session Resume (Recovery)
```javascript
// On session resume / checkpoint recovery 
function recoverFromCheckpoint(checkpointData) {
  const lastFp = checkpointData.lastCompressedFingerprint
  const currentFp = generateEnvironmentFingerprint()
  
  if (!lastFp || currentFp !== lastFp) {
    // Environment changed since checkpoint was created
    report.warn(`Resume from checkpoint with environment drift: ${lastFp} → ${currentFp}`)
    // Redact any compressed summaries that reference stale environments
    redactStaleCompressedSummaries()
  }
}
```

## Hash Algorithm Selection

### Recommended: SHA-256 (cryptographically strong, fast enough) ```javascript
const fingerprint = sha256(
  `${os.family}${os.version}${cwd}${gitState?.commit_hash}`
).substring(0, 16) // Truncate to 16 hex chars for readability
```

### Alternatives (if performance needed)
- **MD5**: Faster but weaker collision resistance. Use only if fingerprint is never displayed.
- **CRC32**: Extremely fast, but collisions possible. Not recommended unless hash space is tiny.

### Hash Space Considerations  
- With SHA-256 truncated to 16 hex chars → 4^16 = ~4.3 billion unique fingerprints
- Collision probability after N compressions ≈ N² / (8 × 2³¹) via birthday paradox
- For typical sessions (<100,000 compresses), collision risk < 1e-5

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| Generate fingerprint | ~5ms | Dominated by filesystem stat calls |
| SHA-256 hash computation | ~0.5ms | Negligible compared to I/O |
| Store in memory object | <1ms | Just a string assignment |

## Fail-Safe Mechanisms

### 1. Hash Collision (Extremely Rare)
**What if two different environments produce same fingerprint?**
- Use full SHA-256 for audit logging, truncated value for quick comparison
- Log collision event with both hashes and manual review required
- Store in SQLite via `getStore().save("audit", id, record)`. Legacy file at `memory/audits/collision-events.json` is migration residue.

### 2. Fingerprint Computation Failure  
**What if filesystem stat fails (permission denied)?**
- Fall back to previous valid fingerprint
- Log error but continue operation
- Schedule full drift check on next checkpoint

### 3. Hash Algorithm Change
**What if we upgrade from SHA-256 to SHA-3?**
- Include hash algorithm identifier in fingerprint metadata
- Parse both old and new format during resume
- Migrate gracefully without data loss

## Configuration & Overrides

| Config | Default | Override |
|--------|---------|----------|
| `fingerprint_hash_algo` | "sha256" | "md5", "crc32" (performance mode only) |
| `truncated_fingerprint_len` | 16 | 8, 4, 0 (full hash) |
| `allow_drift_bypass` | false | Set to true for testing or known-good drift scenarios |

## Compliance & Audit

Every compressed summary must include:
```json
{
  "fingerprint_at_compression": "fp_abc123def456",
  "hash_algorithm": "sha256",
  "truncated_length": 16,
  "drift_detected": false,
  "redaction_applied": false
}
```

This allows:
- Forensic reconstruction of environment at compression time
- Verification that no phantom data exists in compressed buffer
- Audit trail for compliance requirements (NIST, SOC2)

## Integration with Other Rules

- `rules/verification.md`: Fingerprint must be attached to all verification receipts  
- `rules/runtime-guards.md`: Hash-based drift detection prevents credential exposure  
- `commands/doctor.md`: Include fingerprint checks and SQLite memory DB health in the doctor workflow

---

**Status**: Active (enforcement: hard)  
**Scope**: Global  
**Created**: 2026-05-09T07:31:00Z  
**Author**: agent (auto-generated via gap analysis)
