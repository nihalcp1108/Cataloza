# WholesaleFlow — REST API Reference (v1)

Base URL: `/api/v1`

All responses follow the standardized JSON structure:
```json
{
  "success": true,
  "message": "Optional human-readable confirmation",
  "data": { ... },
  "errors": [ ... ]
}
```

---

## 1. Authentication (`/api/v1/auth`)

### `POST /auth/register`
Creates a new customer account.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "name": "Deepak Patel",
    "email": "customer@retailer.com",
    "phone": "+919876543210",
    "password": "Password@123",
    "confirmPassword": "Password@123"
  }
  ```
- **Response**: `201 Created` with `{ user, accessToken }` and sets HttpOnly cookies.

### `POST /auth/login`
Authenticates user (customer or shop_admin). If `cpnihal35@gmail.com` logs in, triggers two-step verification challenge.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "admin@abcwholesale.com",
    "password": "Password@123456"
  }
  ```
- **Response**: `200 OK` with `{ user, accessToken }` or `{ requiresOtp: true, challengeId }` for Super Admin.

### `POST /auth/super-admin/login`
Step 1: Super Admin two-step authentication initiation. Validates password and sends 6-digit OTP to `cpnihal35@gmail.com`.
- **Access**: Public (restricted to normalized email `cpnihal35@gmail.com`)
- **Request Body**:
  ```json
  {
    "email": "cpnihal35@gmail.com",
    "password": "SuperAdminPassword"
  }
  ```
- **Response**: `200 OK` with `{ requiresOtp: true, challengeId, email: "cpnihal35@gmail.com", expiresInSeconds: 300 }`.

### `POST /auth/super-admin/verify-otp`
Step 2: Super Admin OTP verification. Verifies cryptographic hash of the 6-digit code.
- **Access**: Public with valid `challengeId`
- **Request Body**:
  ```json
  {
    "challengeId": "32-byte-hex-string",
    "otp": "123456"
  }
  ```
- **Response**: `200 OK` with `{ user, accessToken }` and sets HttpOnly cookies.

### `POST /auth/super-admin/resend-otp`
Resends fresh 6-digit code to `cpnihal35@gmail.com` (enforces 60s cooldown, max 3 resends).
- **Access**: Public with valid `challengeId`
- **Request Body**: `{ "challengeId": "..." }`
- **Response**: `200 OK` with `{ expiresInSeconds: 300 }`.

### `POST /auth/setup-admin-password`
Configures password for invited Shop Admin using secure token.
- **Access**: Public with valid invitation token
- **Request Body**:
  ```json
  {
    "token": "invitation-token-hex",
    "password": "NewStrongPassword123!",
    "confirmPassword": "NewStrongPassword123!"
  }
  ```
- **Response**: `200 OK` with `{ user, accessToken }`.

### `POST /auth/logout`
Clears access and refresh session cookies.
- **Access**: Public

### `GET /auth/me`
Fetches authenticated user profile and assigned shop IDs.
- **Access**: Authenticated

### `POST /auth/refresh`
Issues fresh access token using HttpOnly refresh cookie.
- **Access**: Public

### `POST /auth/forgot-password`
Initiates password recovery token generation.
- **Access**: Public

### `POST /auth/reset-password`
Resets user password with valid token.
- **Access**: Public

---

## 2. Public Catalogue (`/api/v1/public`)

### `GET /public/landing`
Returns platform overview, statistics, and featured active wholesale suppliers.
- **Access**: Public

### `GET /public/shops/:slug`
Fetches public shop profile, categories, and featured bulk products.
- **Access**: Public
- **Error Responses**: `404 Not Found` if shop does not exist; `403 Forbidden` if shop is inactive.

### `GET /public/shops/:slug/products`
Retrieves paginated and filtered wholesale catalogue for the specified shop.
- **Access**: Public
- **Query Parameters**:
  - `page` (number, default: 1)
  - `limit` (number, default: 12)
  - `search` (string: product name, SKU, or keyword)
  - `categoryId` (string ObjectId)
  - `minPrice` / `maxPrice` (number)
  - `inStock` (boolean)
  - `sortBy` (`newest` | `featured` | `price_asc` | `price_desc` | `name`)

### `GET /public/shops/:slug/products/:productSlug`
Retrieves product details and related items from the same supplier.
- **Access**: Public

---

## 3. Shop Cart (`/api/v1/shops/:slug/cart`)

### `GET /shops/:slug/cart`
Fetches current cart items, validating prices and MOQ against real-time database state.
- **Access**: Public (Guest or Authenticated via `X-Session-Id` header)

### `POST /shops/:slug/cart/items`
Adds line item to shop cart. **Enforces single-shop cart isolation.**
- **Access**: Public
- **Request Body**:
  ```json
  {
    "productId": "66123...",
    "variantName": "Case of 24",
    "quantity": 5,
    "forceClearPrevious": false
  }
  ```
- **Conflict Handling**: Returns `409 Conflict` with `code: DIFFERENT_SHOP_CART` if the cart already holds items from another supplier.

### `PATCH /shops/:slug/cart/items`
Updates line item quantity.

### `DELETE /shops/:slug/cart/items`
Removes line item.

### `DELETE /shops/:slug/cart`
Clears cart.

---

## 4. Checkout & Orders (`/api/v1/shops/:slug/checkout`)

### `POST /shops/:slug/checkout`
Executes authoritative database-first order calculation and creates immutable snapshots before returning WhatsApp handoff payload.
- **Access**: Authenticated Customer
- **Request Body**:
  ```json
  {
    "deliveryAddress": {
      "fullName": "Deepak Patel",
      "phone": "+919820011223",
      "businessName": "Patel Supermarket",
      "street": "Plot 18, Phase 2, Industrial Area",
      "city": "Pune",
      "state": "Maharashtra",
      "postalCode": "411001",
      "country": "India"
    },
    "customerNotes": "Please ship via V-Trans depot delivery",
    "idempotencyKey": "idem_1712983719"
  }
  ```
- **Response**: `201 Created` with:
  ```json
  {
    "success": true,
    "data": {
      "order": { "orderNumber": "WC-2026-000123", ... },
      "whatsappHandoff": {
        "normalizedPhone": "919876543210",
        "whatsappUrl": "https://wa.me/919876543210?text=...",
        "messageText": "Hello ABC Wholesale, ..."
      }
    }
  }
  ```

---

## 5. Customer Profile & Orders (`/api/v1/customers`)

- `GET /customers/me` — Customer profile
- `PATCH /customers/me` — Update name or phone
- `GET /customers/me/addresses` — Saved addresses
- `POST /customers/me/addresses` — Add address
- `DELETE /customers/me/addresses/:id` — Delete address
- `GET /customers/me/orders` — Customer order history
- `GET /customers/me/orders/:id` — Order details (tenant customer scoped)
- `GET /customers/me/orders/:id/invoice` — Download PDF invoice

---

## 6. Shop Admin Operations (`/api/v1/shop-admin`)
*Strictly restricted to users with `shop_admin` or `super_admin` role assigned to the tenant shop.*

- `GET /shop-admin/dashboard` — Shop revenue, orders by status, best-sellers
- `GET /shop-admin/shop` — Authorized shop profile
- `PATCH /shop-admin/shop` — Update shop settings & WhatsApp number
- `GET /shop-admin/products` — Filtered products list
- `POST /shop-admin/products` — Create product (enforces unique SKU per shop)
- `GET /shop-admin/products/:id` — Product detail
- `PATCH /shop-admin/products/:id` — Update product
- `DELETE /shop-admin/products/:id` — Delete product
- `GET /shop-admin/categories` — Categories list
- `POST /shop-admin/categories` — Create category
- `DELETE /shop-admin/categories/:id` — Delete category (safe check: rejects if products assigned)
- `GET /shop-admin/orders` — Shop orders list
- `GET /shop-admin/orders/:id` — Order details
- `PATCH /shop-admin/orders/:id/status` — Update order status (`pending`, `confirmed`, `shipped`, etc.)
- `PATCH /shop-admin/orders/:id/payment` — Update manual payment record (`unpaid`, `paid`, reference)
- `POST /shop-admin/orders/:id/notes` — Add internal shop notes
- `GET /shop-admin/orders/:id/invoice` — Download shop invoice PDF
- `POST /shop-admin/upload` — Multipart image upload (Cloudinary + fallback)

---

## 7. Super Admin Management (`/api/v1/super-admin`)
*Strictly restricted to users with `super_admin` role.*

- `GET /super-admin/dashboard` — Platform-wide KPIs & order metrics
- `GET /super-admin/shops` — List all shops with metrics
- `POST /super-admin/shops` — Create shop and provision initial Shop Admin account atomically
- `GET /super-admin/shops/:id` — Shop details
- `GET /super-admin/shops/:id/details` — Complete shop detail overview across all tabs (products, categories, orders, subscriptions, admins, logs)
- `PATCH /super-admin/shops/:id` — Update shop configuration
- `PATCH /super-admin/shops/:id/toggle-status` — Activate/deactivate shop
- `PATCH /super-admin/shops/:id/suspend` — Suspend shop with reason
- `PATCH /super-admin/shops/:id/reactivate` — Reactivate suspended shop
- `GET /super-admin/admins` — List all shop administrators
- `POST /super-admin/admins` — Create and assign shop admin
- `GET /super-admin/orders` — Platform-wide order oversight
- `GET /super-admin/audit-logs` — Platform audit logs query
- `GET /super-admin/settings` — Platform system settings
- `PATCH /super-admin/settings` — Update platform settings

---

## 8. Dynamic Product Form Builder (`/api/v1/forms`)

- `GET /forms/effective` — Fetch effective published form (defaults or unassigned)
- `GET /forms/effective/:shopId` — Fetch effective published form for specific shop (shop-specific published → platform default published)
- `GET /forms/templates` — List all product form templates (Super Admin)
- `POST /forms/templates` — Create a new form template (Super Admin)
- `GET /forms/templates/:id` — Get template with published and latest draft versions (Super Admin)
- `PATCH /forms/templates/:id` — Update template metadata (Super Admin)
- `POST /forms/templates/:id/duplicate` — Duplicate template into a new draft (Super Admin)
- `POST /forms/templates/:id/draft` — Save draft fields (center canvas fields, validation rules) (Super Admin)
- `POST /forms/templates/:id/publish` — Publish draft as a new immutable version (Super Admin)
- `POST /forms/assign` — Assign template to one or more shops (Super Admin)

---

## 9. Subscription Management (`/api/v1/subscriptions`)

- `GET /subscriptions/plans` — Public list of active subscription plans
- `GET /subscriptions/shop/:shopId` — Get active subscription details, limits, and real-time usage (Shop Admin / Super Admin)
- `POST /subscriptions/plans` — Create subscription plan (Super Admin)
- `PATCH /subscriptions/plans/:id` — Update subscription plan (Super Admin)
- `DELETE /subscriptions/plans/:id` — Deactivate / delete subscription plan (Super Admin)
- `GET /subscriptions/assignments` — List all shop subscriptions (Super Admin)
- `POST /subscriptions/assign` — Assign or change subscription plan for a shop (Super Admin)
- `POST /subscriptions/record-payment` — Record manual payment transaction (Super Admin)

