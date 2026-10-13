# WholesaleFlow — Multi-Tenant Wholesale Catalogue & WhatsApp Ordering SaaS

A production-grade, multi-tenant B2B commerce platform built with the MERN stack (TypeScript, MongoDB, Express, React, Node.js). Allows independent wholesale distributors to publish live public wholesale rates, manage stock, enforce minimum order quantities (MOQ), configure dynamic product attributes, manage subscription plans, and process orders with authoritative database-first recording and prefilled WhatsApp communication.

---

## 1. Project Overview & Multi-Tenant Architecture

**WholesaleFlow** provides a unified platform where wholesale suppliers operate independent digital storefronts under dedicated slugs:
- `https://yourcatalogue.com/abc-wholesale`
- `https://yourcatalogue.com/kerala-distributors`
- `https://yourcatalogue.com/xyz-traders`

### Core Roles & Dashboards
1. **Super Admin (`/superadmin/dashboard`)**:
   - Oversees the entire platform with real MongoDB statistics.
   - Creates and manages wholesale shops (suspend, reactivate, replace admin).
   - Manages subscription plans (Starter, Pro, Enterprise), assigns plans to shops, and records manual payments.
   - **Dynamic Product Form Builder**: Builds versioned, reusable custom field schemas (draft, publish, assign to shops, or set as platform default).
   - Manages platform orders, audit logs, and system settings.
2. **Shop Admin (`/admin/dashboard`)**:
   - Strictly tenant-scoped to assigned wholesale shops.
   - Manages product catalogue using the effective published form schema (base typed fields + dynamic custom fields).
   - Enforces plan quota restrictions (e.g., product limits, feature flags).
   - Manages product categories, shop profile/branding, and WhatsApp numbers.
   - Processes orders, updates fulfillment/payment states, adds internal notes, and downloads invoices.
   - Views subscription status, plan limits, and usage progress.
3. **Customer (`/my-account`)**:
   - Browses active public shop catalogues and views wholesale prices without mandatory login.
   - Maintains a single-shop cart (cross-shop cart mixing strictly prevented).
   - Places orders with server-side price/MOQ recalculation.
   - Launches prefilled WhatsApp click-to-chat with complete order line breakdowns.
   - Manages saved delivery addresses, profile, order history, and downloads official PDF invoices.

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18 with Vite & TypeScript
- **Styling**: Tailwind CSS with sleek modern typography (Inter), responsive design, and glassmorphic micro-animations
- **Routing**: React Router v6 with strict role-based access control and RootEntry redirection
- **State Management**: TanStack Query (React Query)
- **Forms & Validation**: React Hook Form with Zod
- **HTTP Client**: Axios with guest session tracking & auto-refresh interceptors
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

### Backend
- **Runtime**: Node.js & Express with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (Access Tokens + HttpOnly Refresh Cookies)
- **Password Security**: Bcrypt salt-hashing (12 rounds)
- **Validation**: Universal Zod schema validation middleware supporting `ZodSchema` / `ZodEffects`
- **Security Headers & Protection**: Helmet, CORS allowlisting, Express Rate Limit
- **Invoices**: Server-side PDF generation via PDFKit
- **Media**: Cloudinary integration with zero-dependency Base64 fallback

---

## 3. Database Architecture & Models

| Model | Collection | Description |
|---|---|---|
| `User` | `users` | Multi-role user accounts (`super_admin`, `shop_admin`, `customer`), password hash, `mustChangePassword` flag, and assigned shop IDs. |
| `Shop` | `shops` | Wholesale supplier store details, unique slug, theme colours, WhatsApp number, status (`active`, `inactive`, `suspended`), subscription reference, and assigned template. |
| `SubscriptionPlan` | `subscriptionplans` | Pricing tiers (`PLAN_STARTER`, `PLAN_PRO`, `PLAN_ENTERPRISE`), billing interval, product limits (`maxProducts`), feature flags, and trial days. |
| `ShopSubscription` | `shopsubscriptions` | Active shop subscription status (`trialing`, `active`, `past_due`, `expired`, `suspended`), cycle dates, and manual payment history. |
| `ProductFormTemplate`| `productformtemplates`| Template metadata, platform default flag, assigned shops, draft and published version references. |
| `ProductFormVersion` | `productformversions` | Immutable form version schema containing array of 20+ field type configurations, validation rules, regex, and visibility flags. |
| `Product` | `products` | Core typed fields (SKU, price, MOQ, category, images) + `customFields: Record<string, any>` and `formVersionId`. |
| `Category` | `categories` | Shop-scoped category taxonomies with product association safety checks. |
| `Order` | `orders` | Immutable order snapshot, customer delivery address, items, subtotal, tax, grand total, order status, and payment status. |
| `Cart` | `carts` | Tenant-isolated shopping cart scoped by `shopId` and session/customer token. |
| `Address` | `addresses` | Customer delivery addresses with default selection flag. |
| `AuditLog` | `auditlogs` | Traceable platform administrative actions and security events. |
| `PlatformSetting` | `platformsettings` | Global platform settings, maintenance mode, currency, and support details. |

---

## 4. Super Admin Bootstrap & Security

The platform includes a dedicated bootstrap script that securely provisions the first Super Admin without printing passwords or risking account overwrites.

### Environment Configuration
Configure the following in `backend/.env`:
```env
SUPER_ADMIN_EMAIL=nihal@admin.com
SUPER_ADMIN_INITIAL_PASSWORD=YourSecureInitialPasswordHere123!
```

### Execution
Run the bootstrap script explicitly:
```bash
cd backend
npm run bootstrap:admin
```

### Bootstrap Security Guarantees:
- Validates that both `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_INITIAL_PASSWORD` are provided in the environment.
- Refuses unsafe account promotion if the email already belongs to a customer or non-admin user.
- If the Super Admin already exists, preserves the account without duplicate records or overwriting credentials.
- Never prints or logs the plaintext password.
- Sets `mustChangePassword: true`, forcing the Super Admin to update their password upon first login via the frontend modal.
- Provisions default platform settings, subscription tiers, and the platform default product form template.

---

## 5. Dynamic Product Form Builder

The Dynamic Product Form Builder empowers the Super Admin to define the exact product schema required for wholesale distributors.

### Supported Field Types (20+):
- Single-line Text, Multiline Text, Number, Decimal, Wholesale Price
- Dropdown / Select, Multi-select, Radio Buttons, Checkbox, Boolean Toggle
- Date, URL, Email, Phone, Single Image, Multiple Images
- SKU / Product Code, Unit of Measurement (UOM), Minimum Order Quantity (MOQ)
- Stock Quantity, Product Variants

### Field Attributes:
- Stable `fieldKey`, display `label`, placeholder, help text
- `required` flag, default value, min/max length, min/max value, step
- `visibleOnCard` (pills on catalogue cards), `visibleOnDetails` (specifications table)
- `searchable`, `filterable`, `isPublic` (private internal fields are never exposed to anonymous visitors)
- Display order and Shop Admin editability

### Hybrid Storage & Schema Resolution:
1. Essential operational fields (`name`, `sku`, `price`, `images`, `categoryId`, `moq`) are typed on the `Product` document.
2. Custom attributes are validated server-side by `ProductFormService.validateCustomFields()` and stored in `product.customFields`.
3. The effective schema is resolved deterministically: **Shop-Specific Published Template** → **Platform Default Published Template** → Base Fields.

---

## 6. Subscription Management & Limit Enforcement

### Plans Provisioned:
1. **Starter Wholesale (`PLAN_STARTER`)**: 50 products, 10 categories, 1 admin, manual WhatsApp orders, standard PDF invoices.
2. **Professional Distributor (`PLAN_PRO`)**: 500 products, 50 categories, 5 admins, custom form fields permitted, advanced analytics.
3. **Enterprise Wholesale (`PLAN_ENTERPRISE`)**: Unlimited products, categories, and admins; full custom form builder access and priority support.

### Enforcement:
- The backend `SubscriptionService.canAddProduct(shopId)` service checks shop status and product quotas before permitting product creation.
- If a shop is suspended or product limit is reached, HTTP 403 Forbidden is returned with clear quota exhaustion messaging.
- Super Admin can record manual offline payments (cheque, bank wire, cash) with reference numbers, dates, and amounts.

---

## 7. Local Installation & Development

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: MongoDB Atlas or local MongoDB instance (`mongodb://localhost:27017/wholesale_catalogue`)

### 2. Install Dependencies
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 3. Configure Environment Files
**Backend (`backend/.env`):**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/wholesale_catalogue
FRONTEND_URL=http://localhost:5173
PUBLIC_APP_URL=http://localhost:5173
API_BASE_URL=http://localhost:5000/api/v1
JWT_ACCESS_SECRET=dev_jwt_access_secret_wholesale_platform_123
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_SECRET=dev_jwt_refresh_secret_wholesale_platform_456
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
SUPER_ADMIN_EMAIL=nihal@admin.com
SUPER_ADMIN_INITIAL_PASSWORD=Admin@2026Secure!
```

**Frontend (`frontend/.env`):**
```env
VITE_API_BASE_URL=/api/v1
```

### 4. Bootstrap Super Admin
```bash
cd backend
npm run bootstrap:admin
```

### 5. Start Servers
**Backend:**
```bash
cd backend
npm run dev
# Or for production: npm start (automatically compiles TS via prestart)
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173/` in your browser.

---

## 8. Role-Based Login Credentials & Testing

| Role | Email | Password | Destination |
|---|---|---|---|
| **Super Admin** | `nihal@admin.com` | Configured in `backend/.env` | `/superadmin/dashboard` |
| **Shop Admin** | Created via Super Admin | Provisioned during shop creation | `/admin/dashboard` |
| **Customer** | Registered via `/register` | User chosen password | `/my-account/orders` |

---

## 9. Production Deployment Guidelines

- **Frontend Target**: Vercel (`npm run build` → `dist/`)
- **Backend Target**: Railway / Render (`npm start` → executes `node dist/server.js`)
- **Database**: MongoDB Atlas M10+ Cluster
- **Media Storage**: Cloudinary (configured via `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)
- **Build Issue Fixed**: `Cannot find module 'backend/dist/server.js'` has been permanently resolved by configuring `rootDir: "./src"`, `include: ["src/**/*"]` in `backend/tsconfig.json`, and adding `"prestart": "npm run build"`.
