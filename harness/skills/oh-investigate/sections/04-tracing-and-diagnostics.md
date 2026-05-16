## Root Cause Tracing

Bugs manifest deep in call stacks. Fixing at the symptom treats the wrong layer. **Trace backward through the call chain to find the original trigger.**

1. **Observe symptom** — Error at point of failure.
2. **Find immediate cause** — What code directly produces this error?
3. **What called this?** — Step one level up the call chain.
4. **Keep tracing up** — What value was passed? Where from?
5. **Find original trigger** — Root source of bad state. Fix here, not at symptom.

**Stack trace instrumentation:**
```
const stack = new Error().stack;
console.error('DEBUG <component>:', { directory, cwd, stack });
```
Use `console.error()` (logger may be suppressed in tests). Grep output. **Never fix just where the error appears** — trace back and add validation at each layer.

## Multi-Component Diagnostics

**In multi-component systems (CI → build → signing, API → service → database), add instrumentation at each boundary BEFORE proposing fixes:**

- Log data entering and exiting each component
- Verify environment/config propagation across layers
- Check state at each layer

Run once to gather evidence, identify the failing component, THEN investigate it.

**Example (build pipeline):** Layer 1 (workflow → secrets?), Layer 2 (build → env vars?), Layer 3 (signing → keychain?), Layer 4 (actual signing). Reveals which layer fails in one pass.
