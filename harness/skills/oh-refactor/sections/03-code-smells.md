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
