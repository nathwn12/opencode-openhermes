---
name: oh-refactor
description: "Surgical, behavior-preserving code refactoring. Extract functions, eliminate duplication, improve type safety, remove dead code, simplify conditionals. Use when code is hard to maintain, functions are too long, code smells accumulate, or user asks to clean up/improve/refactor code."
tier: 3
benefits-from: [oh-investigate, oh-review]
triggers:
  - "refactor"
  - "clean up"
  - "improve this code"
  - "code smell"
  - "make this better"
  - "extract method"
  - "reduce duplication"
  - "fix this mess"
  - "technical debt"
  - "god function"
  - "long method"
  - "nested conditionals"
route:
  pass: oh-gauntlet
  fail: oh-planner
  blocker: surface
---

# oh-refactor

Improve code structure without changing external behavior. Gradual evolution, not revolution.

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

## Common Code Smells & Fixes (top 4)

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
- function calculateUserDiscount(user) {
-   if (user.membership === 'gold') return user.total * 0.2;
- }
- function calculateOrderDiscount(order) {
-   if (order.user.membership === 'gold') return order.total * 0.2;
- }
+ function getDiscountRate(membership) {
+   return { gold: 0.2, silver: 0.1 }[membership] || 0;
+ }
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
- class Order {
-   calculateDiscount(user) {
-     if (user.membershipLevel === 'gold') return this.total * 0.2;
-     if (user.accountAge > 365) return this.total * 0.1;
-   }
- }
+ class User {
+   getDiscountRate(orderTotal) {
+     const rates = { gold: 0.2, silver: 0.1 };
+     return rates[this.membershipLevel] || 0;
+   }
+ }
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

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-review (post-refactor gate) |
| behavior unclear | → oh-investigate |
| test gap found | → oh-builder (TDD mode) |
| blocker | → surface |
