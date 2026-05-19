# oh-refactor — Deep Reference

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

## Workflow

### Phase 1: Prepare
Check test coverage (thin → write characterization tests). Commit current state. Create feature branch.

### Phase 2: Identify
Find code smell. Understand what code does. Plan smallest fix. If behavior unclear → delegate to oh-investigate.

### Phase 3: Refactor (small steps)
One change → run tests → commit → repeat until smell is gone.

### Phase 4: Verify
All tests pass. Manual smoke test if coverage missing. Performance unchanged or better. Diff shows structural changes only.

### Phase 5: Clean Up
Remove commented-out code, stale imports, dead paths. Update docs only if semantics changed. Final commit.

## Common Code Smells & Fixes (top 6)

### 1. Long Method
```diff
- async function processOrder(orderId) {
-   // 50 lines: fetch  // 30 lines: validate
-   // 40 lines: pricing // 30 lines: inventory
-   // 20 lines: shipment // 30 lines: notifications
- }
+ async function processOrder(orderId) {
+   const order = await fetchOrder(orderId);
+   validateOrder(order);
+   const pricing = calculatePricing(order);
+   const shipment = await createShipment(order);
+   await sendNotifications(order, pricing, shipment);
+   return { order, pricing, shipment };
+ }
```

### 2. Guard Clauses (Arrow Code)
```diff
- if (order) { if (order.user) { if (order.total > 0) { return processOrder(order); }}}
+ if (!order) return { error: 'No order' };
+ if (!order.user) return { error: 'No user' };
+ if (order.total <= 0) return { error: 'Invalid total' };
+ return processOrder(order);
```

### 3. Duplicated Code
```diff
- function calculateUserDiscount(user) { if (user.membership === 'gold') return user.total * 0.2; }
- function calculateOrderDiscount(order) { if (order.user.membership === 'gold') return order.total * 0.2; }
+ function getDiscountRate(membership) { return { gold: 0.2, silver: 0.1 }[membership] || 0; }
```

### 4. Magic Numbers → Constants
```diff
- if (user.status === 2) { }
- const discount = total * 0.15;
+ const UserStatus = { ACTIVE: 1, INACTIVE: 2 } as const;
+ const DISCOUNT_RATES = { PREMIUM: 0.15, VIP: 0.2 } as const;
```

### 5. Primitive Obsession
```diff
- function sendEmail(to, subject, body) { }
- sendEmail('user@example.com', 'Hello', '...');
+ class Email {
+   private constructor(public readonly value: string) {
+     if (!Email.isValid(value)) throw new Error('Invalid email');
+   }
+   static create(v: string) { return new Email(v); }
+   static isValid(e: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
+ }
```

### 6. Feature Envy
```diff
- class Order { calculateDiscount(user) { if (user.membershipLevel === 'gold') return this.total * 0.2; } }
+ class User { getDiscountRate(orderTotal) { const rates = { gold: 0.2, silver: 0.1 }; return rates[this.membershipLevel] || 0; } }
```

## Common Operations Reference

| Operation | What it does |
|-----------|-------------|
| Extract Method | Turn fragment into named function |
| Extract Class | Move related behavior to new class |
| Rename Method/Variable | Improve clarity |
| Introduce Parameter Object | Group related params |
| Guard Clauses | Early returns flatten nesting |
| Replace Magic Number | Named constants for literals |
| Consolidate Conditional | Combine duplicate conditions |

## Checklist

- [ ] Functions small (< 50 lines), single-purpose
- [ ] No duplicated code
- [ ] Descriptive names, no magic values
- [ ] No dead code, stale imports, commented-out code
- [ ] Clear module boundaries, no circular deps
- [ ] Types for all public APIs, no `any` without justification
- [ ] All tests pass, edge cases covered

## AI-Generated Code: What to Fix vs What to Skip

When refactoring AI-generated code, not every flagged pattern is a real problem.
Use these guidelines (sourced from `reference/design-blacklist.md` §Code Slop).

### What to fix (genuine quality improvements)
- **Empty catches around file ops** — replace with `safeUnlink()` (ignores ENOENT, rethrows EPERM/EIO). Swallowed EPERM = silent data loss.
- **Empty catches around process kills** — replace with `safeKill()` (ignores ESRCH, rethrows EPERM).
- **Redundant `return await`** — remove when no enclosing try block. Saves a microtask, signals intent.
- **Typed exception catches** — `catch (err) { if (!(err instanceof TypeError)) throw err }` over `catch {}` when the try block does URL parsing, JSON parsing, or DOM work.
- **Dead code, stale imports, commented-out code** — remove unconditionally.

### What NOT to fix (correct patterns that tools may flag)
- **String-matching on error messages** — `err.message.includes('closed')` is brittle. If a fire-and-forget operation can fail for any reason and you don't care, `catch {}` is correct.
- **Comments to exempt pass-through wrappers** — "alias for active session" above a method just to trip a linter rule is noise, not documentation.
- **Catch-and-log in extension/browser code** — browser extensions crash entirely on uncaught errors. If the catch logs and continues, that IS the right pattern.
- **Best-effort cleanup paths** — shutdown, emergency cleanup should swallow ALL errors. A cleanup path that throws means the rest of cleanup doesn't run.

### Guiding Principle
We are AI-coded and proud of it. The goal is code quality, not hiding. Accept
findings where the "sloppy" pattern is the correct engineering choice for the
context.

## Anti-patterns
- Refactoring without tests (behavior preservation is unverifiable)
- Mixing behavior changes with refactoring
- "While I'm here" scope creep
- Large batch refactors (commit between safe states)
