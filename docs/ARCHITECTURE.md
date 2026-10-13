# WholesaleFlow — Multi-Tenant Architecture & Technical Design

## 1. Multi-Tenant Isolation Model

WholesaleFlow implements a **Shared Database, Discriminator Scoped (SaaS)** multi-tenant architecture. Every wholesale tenant operates an isolated digital storefront under its unique URL slug (e.g. `https://yourcatalogue.com/abc-wholesale`).

```
                              ┌────────────────────────┐
                              │     Super Admin        │
                              │ (Platform Level Scope) │
                              └───────────┬────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
     ┌────────────────────────┐                      ┌────────────────────────┐
     │ Shop Admin (Tenant A)  │                      │ Shop Admin (Tenant B)  │
     │  Assigned to: Shop A   │                      │  Assigned to: Shop B   │
     └────────────┬───────────┘                      └────────────┬───────────┘
                  │                                               │
      ┌───────────┴───────────┐                       ┌───────────┴───────────┐
      │  Products (Shop A)    │                       │  Products (Shop B)    │
      │  Categories (Shop A)  │                       │  Categories (Shop B)  │
      │  Orders (Shop A)      │                       │  Orders (Shop B)      │
      │  Cart (Shop A only)   │                       │  Cart (Shop B only)   │
      └───────────────────────┘                       └───────────────────────┘
```

### Security Enforcement Rules
1. **Query Scoping**: Every product, category, order, and setting operation enforces `shopId: targetShopId` at the database query level via `requireShopAccess` middleware.
2. **Preventing IDOR / BOLA**: Modifying an `id` parameter in a URL or payload without possessing ownership of the target tenant results in immediate `403 Forbidden` response.
3. **Cart Separation Guarantee**: A cart belongs strictly to one shop. Cross-supplier ordering is blocked. Adding an item from supplier B while possessing items from supplier A triggers a conflict interceptor asking the buyer to either clear and switch or cancel.
4. **Authoritative Server Calculations**: Client-submitted totals, discounts, or unit prices are never trusted. The backend fetches active products from MongoDB, evaluates MOQ, checks stock, and calculates line totals on the server.

---

## 2. Order Lifecycle & Database-First State Machine

```
   [Customer Reviews Cart]
              │
              ▼
    [Completes Checkout]
              │
              ▼
   [Server Validates Lines] ──(Validates SKU, MOQ, and decrements stock atomically)
              │
              ▼
     [Saves to MongoDB]     ──(Generates immutable snapshots & WC-2026-XXXXXX)
              │
              ▼
   [Handoff to WhatsApp]    ──(Opens wa.me URL with prefilled order text)
              │
              ▼
  [Buyer Presses 'Send']    ──(Wholesaler receives notification)
              │
              ▼
  [Shop Admin Confirms]     ──(Updates status to Confirmed, Packed, Shipped)
              │
              ▼
 [Shop Admin Records Pay]   ──(Records manual NEFT/Bank payment & invoice)
```

### Status Transitions
- **Order Statuses**: `pending` → `confirmed` → `processing` → `ready_for_dispatch` → `shipped` → `delivered` (or `cancelled` with reason).
- **Payment Statuses**: `unpaid` → `partially_paid` → `paid` → `refunded`.

---

## 3. WhatsApp Integration Architecture
WhatsApp ordering utilizes the official click-to-chat protocol (`https://wa.me/{normalizedNumber}?text={encodedSummary}`).
1. The phone number is normalized to E.164 (e.g. `+91 98765-43210` -> `919876543210`).
2. Order items, SKU numbers, quantities, wholesale rates, and delivery details are compiled into a formatted markdown text block.
3. The order is stored in MongoDB before the WhatsApp URL is handed to the client.
4. If a popup blocker or browser limitation halts automatic opening, the buyer has a persistent **Open WhatsApp Desk** and **Copy Order Text** fallback on the confirmation page.
