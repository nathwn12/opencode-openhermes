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

Improve code structure and readability **without changing external behavior**. Refactoring is gradual evolution, not revolution.

## When to Use

- Code is hard to understand or maintain
- Functions/classes are too large
- Code smells need addressing
- Adding features is difficult due to code structure
- User asks "clean up this code", "refactor this", "improve this"
- Technical debt has accumulated to the point it slows development

## Refactoring Principles

### Golden Rules

1. **Behavior is preserved** — Refactoring doesn't change what the code does, only how. If the goal changes behavior, that's a feature, not a refactor.
2. **Small steps** — Make one change, verify, commit, repeat. Never batch refactoring changes.
3. **Tests are essential** — Without a fast, reliable test, you're not refactoring, you're editing blind. Write tests first if they don't exist.
4. **One thing at a time** — Never mix refactoring with feature changes in the same commit.
5. **Commit between safe states** — Commit before starting, commit after each green test run.

### When NOT to Refactor

- Code that works and will never change again
- Critical production code without tests (add tests first)
- Under a tight deadline with no test safety net
- "Just because" — every refactor needs a clear purpose

## Workflow

### Phase 1: Prepare

1. **Check test coverage** — run existing tests. If coverage is thin, write characterization tests that lock down current behavior before touching anything.
2. **Commit current state** — `git commit` so you can diff and revert cleanly.
3. **Create a feature branch** — isolate refactoring work from other changes.

### Phase 2: Identify

1. Find the code smell to address (see [Code Smells](#common-code-smells--fixes) below).
2. Understand what the code actually does — trace all code paths.
3. Plan the smallest refactoring that makes the problem better.
4. If behavior is unclear, delegate to `oh-investigate` before refactoring.

### Phase 3: Refactor (small steps)

1. Make one small change.
2. Run tests.
3. Commit if tests pass.
4. Repeat until the smell is gone.

### Phase 4: Verify

1. All tests pass.
2. Manual smoke test if full coverage is missing.
3. Performance unchanged or improved.
4. Diff shows only structural changes — no logic changes.

### Phase 5: Clean Up

1. Remove commented-out code, stale imports, dead paths.
2. Update inline docs only if behavior semantics changed.
3. Final commit.
4. Optionally route to `oh-review` for post-refactor quality gate.

## Common Code Smells & Fixes

### 1. Long Method/Function

```diff
# BAD: 200-line function that does everything
- async function processOrder(orderId) {
-   // 50 lines: fetch order
-   // 30 lines: validate order
-   // 40 lines: calculate pricing
-   // 30 lines: update inventory
-   // 20 lines: create shipment
-   // 30 lines: send notifications
- }

# GOOD: Broken into focused functions
+ async function processOrder(orderId) {
+   const order = await fetchOrder(orderId);
+   validateOrder(order);
+   const pricing = calculatePricing(order);
+   await updateInventory(order);
+   const shipment = await createShipment(order);
+   await sendNotifications(order, pricing, shipment);
+   return { order, pricing, shipment };
+ }
```

### 2. Duplicated Code

```diff
# BAD: Same logic in multiple places
- function calculateUserDiscount(user) {
-   if (user.membership === 'gold') return user.total * 0.2;
-   if (user.membership === 'silver') return user.total * 0.1;
-   return 0;
- }
- function calculateOrderDiscount(order) {
-   if (order.user.membership === 'gold') return order.total * 0.2;
-   if (order.user.membership === 'silver') return order.total * 0.1;
-   return 0;
- }

# GOOD: Extract common logic
+ function getMembershipDiscountRate(membership) {
+   const rates = { gold: 0.2, silver: 0.1 };
+   return rates[membership] || 0;
+ }
+ function calculateUserDiscount(user) {
+   return user.total * getMembershipDiscountRate(user.membership);
+ }
+ function calculateOrderDiscount(order) {
+   return order.total * getMembershipDiscountRate(order.user.membership);
+ }
```

### 3. Large Class/Module (God Object)

```diff
# BAD: God object that knows too much
- class UserManager {
-   createUser() { /* ... */ }
-   updateUser() { /* ... */ }
-   deleteUser() { /* ... */ }
-   sendEmail() { /* ... */ }
-   generateReport() { /* ... */ }
-   handlePayment() { /* ... */ }
-   validateAddress() { /* ... */ }
- }

# GOOD: Single responsibility per class
+ class UserService {
+   create(data) { /* ... */ }
+   update(id, data) { /* ... */ }
+   delete(id) { /* ... */ }
+ }
+ class EmailService {
+   send(to, subject, body) { /* ... */ }
+ }
+ class ReportService {
+   generate(type, params) { /* ... */ }
+ }
+ class PaymentService {
+   process(amount, method) { /* ... */ }
+ }
```

### 4. Long Parameter List

```diff
# BAD: Too many parameters
- function createUser(email, password, name, age, address, city, country, phone) { }

# GOOD: Group related parameters
+ interface UserData {
+   email: string;
+   password: string;
+   name: string;
+   age?: number;
+   address?: Address;
+   phone?: string;
+ }
+ function createUser(data: UserData) { }
```

### 5. Feature Envy

```diff
# BAD: Method uses another object's data more than its own
- class Order {
-   calculateDiscount(user) {
-     if (user.membershipLevel === 'gold') return this.total * 0.2;
-     if (user.accountAge > 365) return this.total * 0.1;
-     return 0;
-   }
- }

# GOOD: Move logic to the object that owns the data
+ class User {
+   getDiscountRate(orderTotal) {
+     if (this.membershipLevel === 'gold') return 0.2;
+     if (this.accountAge > 365) return 0.1;
+     return 0;
+   }
+ }
+ class Order {
+   calculateDiscount(user) {
+     return this.total * user.getDiscountRate(this.total);
+   }
+ }
```

### 6. Primitive Obsession

```diff
# BAD: Using primitives for domain concepts
- function sendEmail(to, subject, body) { }
- sendEmail('user@example.com', 'Hello', '...');

# GOOD: Use domain types
+ class Email {
+   private constructor(public readonly value: string) {
+     if (!Email.isValid(value)) throw new Error('Invalid email');
+   }
+   static create(value: string) { return new Email(value); }
+   static isValid(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
+ }
```

### 7. Magic Numbers/Strings

```diff
# BAD: Unexplained values
- if (user.status === 2) { }
- const discount = total * 0.15;

# GOOD: Named constants
+ const UserStatus = { ACTIVE: 1, INACTIVE: 2, SUSPENDED: 3 } as const;
+ const DISCOUNT_RATES = { STANDARD: 0.1, PREMIUM: 0.15, VIP: 0.2 } as const;
+ if (user.status === UserStatus.INACTIVE) { }
+ const discount = total * DISCOUNT_RATES.PREMIUM;
```

### 8. Nested Conditionals (Arrow Code)

```diff
# BAD: Arrow code
- function process(order) {
-   if (order) {
-     if (order.user) {
-       if (order.user.isActive) {
-         if (order.total > 0) {
-           return processOrder(order);
-         } else { return { error: 'Invalid total' }; }
-       } else { return { error: 'User inactive' }; }
-     } else { return { error: 'No user' }; }
-   } else { return { error: 'No order' }; }
- }

# GOOD: Guard clauses / early returns
+ function process(order) {
+   if (!order) return { error: 'No order' };
+   if (!order.user) return { error: 'No user' };
+   if (!order.user.isActive) return { error: 'User inactive' };
+   if (order.total <= 0) return { error: 'Invalid total' };
+   return processOrder(order);
+ }
```

### 9. Dead Code

```diff
# BAD: Unused code lingers
- function oldImplementation() { }
- const DEPRECATED_VALUE = 5;
- import { unusedThing } from './somewhere';

# GOOD: Remove it
+ // Delete unused functions, imports, commented-out code
+ // Git history has everything you need
```

### 10. Inappropriate Intimacy

```diff
# BAD: One class reaches deep into another
- class OrderProcessor {
-   process(order) {
-     order.user.profile.address.street;  // Too intimate
-   }
- }

# GOOD: Ask, don't tell
+ class OrderProcessor {
+   process(order) {
+     order.getShippingAddress();  // Order knows how to get it
+     order.save();
+   }
+ }
```

## Extract Method Refactoring

```diff
# Before: One long function
- function printReport(users) {
-   console.log('USER REPORT');
-   console.log('============');
-   console.log(`Total users: ${users.length}`);
-   console.log('ACTIVE USERS');
-   const active = users.filter(u => u.isActive);
-   active.forEach(u => console.log(`- ${u.name} (${u.email})`));
-   console.log(`Active: ${active.length}`);
-   console.log('INACTIVE USERS');
-   const inactive = users.filter(u => !u.isActive);
-   inactive.forEach(u => console.log(`- ${u.name} (${u.email})`));
-   console.log(`Inactive: ${inactive.length}`);
- }

# After: Extracted methods
+ function printReport(users) {
+   printHeader('USER REPORT');
+   console.log(`Total users: ${users.length}\n`);
+   printUserSection('ACTIVE USERS', users.filter(u => u.isActive));
+   printUserSection('INACTIVE USERS', users.filter(u => !u.isActive));
+ }
+ function printHeader(title) {
+   const line = '='.repeat(title.length);
+   console.log(title); console.log(line); console.log('');
+ }
+ function printUserSection(title, users) {
+   console.log(title);
+   console.log('-'.repeat(title.length));
+   users.forEach(u => console.log(`- ${u.name} (${u.email})`));
+   console.log(`${title.split(' ')[0]}: ${users.length}`);
+ }
```

## Design Patterns for Refactoring

### Strategy Pattern

Replace conditional branching with composable strategies:

```diff
- function calculateShipping(order, method) {
-   if (method === 'standard') return order.total > 50 ? 0 : 5.99;
-   else if (method === 'express') return order.total > 100 ? 9.99 : 14.99;
-   else if (method === 'overnight') return 29.99;
- }

+ interface ShippingStrategy { calculate(order: Order): number; }
+ class StandardShipping implements ShippingStrategy {
+   calculate(order: Order) { return order.total > 50 ? 0 : 5.99; }
+ }
+ class ExpressShipping implements ShippingStrategy {
+   calculate(order: Order) { return order.total > 100 ? 9.99 : 14.99; }
+ }
+ function calculateShipping(order: Order, strategy: ShippingStrategy) {
+   return strategy.calculate(order);
+ }
```

### Guard Clauses

Replace nested conditions with early returns. This is the single highest-ROI refactoring pattern — it flattens deeply nested code immediately.

## Common Refactoring Operations

| Operation | Description |
|---|---|
| Extract Method | Turn code fragment into named function |
| Extract Class | Move related behavior to new class |
| Inline Method | Move method body back to single caller |
| Rename Method/Variable | Improve clarity |
| Introduce Parameter Object | Group related parameters |
| Replace Conditional with Polymorphism | Dispatch by type instead of if/switch |
| Replace Magic Number with Constant | Named constants for literals |
| Decompose Conditional | Break complex conditions into named predicates |
| Consolidate Conditional | Combine duplicate conditions |
| Replace Nested Conditional with Guard Clauses | Early returns |
| Replace Inheritance with Delegation | Composition over inheritance |

## Refactoring Checklist

### Code Quality
- [ ] Functions are small (< 50 lines)
- [ ] Functions do one thing
- [ ] No duplicated code
- [ ] Descriptive names (variables, functions, classes)
- [ ] No magic numbers/strings
- [ ] Dead code removed

### Structure
- [ ] Related code is together
- [ ] Clear module boundaries
- [ ] Dependencies flow in one direction
- [ ] No circular dependencies

### Type Safety
- [ ] Types defined for all public APIs
- [ ] No `any` types without justification
- [ ] Nullable types explicitly marked

### Testing
- [ ] Refactored code is tested
- [ ] Tests cover edge cases
- [ ] All tests pass

## Routing

| Outcome | Route |
|---|---|
| pass | -> oh-review (post-refactor quality gate) |
| behavior unclear | -> oh-investigate (diagnose before refactoring) |
| test gap found | -> oh-builder TDD mode (add characterization tests first) |
| blocker | -> surface to user |
