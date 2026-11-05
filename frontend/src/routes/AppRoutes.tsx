import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Helper for lazy loading named exports
const lazyNamed = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ [key: string]: any }>,
  name: string
) => React.lazy(() => factory().then((mod) => ({ default: mod[name] })));

// Layouts
const AdminLayout = lazyNamed(() => import('../components/layout/AdminLayout'), 'AdminLayout');
const SuperAdminLayout = lazyNamed(() => import('../components/layout/SuperAdminLayout'), 'SuperAdminLayout');
const CustomerLayout = lazyNamed(() => import('../components/layout/CustomerLayout'), 'CustomerLayout');

// Public pages
const ShopLandingPage = lazyNamed(() => import('../pages/public/ShopLandingPage'), 'ShopLandingPage');
const ProductDetailPage = lazyNamed(() => import('../pages/public/ProductDetailPage'), 'ProductDetailPage');
const CartPage = lazyNamed(() => import('../pages/public/CartPage'), 'CartPage');
const LoginPage = lazyNamed(() => import('../pages/public/LoginPage'), 'LoginPage');
const RegisterPage = lazyNamed(() => import('../pages/public/RegisterPage'), 'RegisterPage');
const ForgotPasswordPage = lazyNamed(() => import('../pages/public/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyNamed(() => import('../pages/public/ResetPasswordPage'), 'ResetPasswordPage');
const NotFoundPage = lazyNamed(() => import('../pages/public/NotFoundPage'), 'NotFoundPage');

// Customer pages
const CheckoutPage = lazyNamed(() => import('../pages/customer/CheckoutPage'), 'CheckoutPage');
const OrderConfirmationPage = lazyNamed(() => import('../pages/customer/OrderConfirmationPage'), 'OrderConfirmationPage');
const CustomerOrdersPage = lazyNamed(() => import('../pages/customer/CustomerOrdersPage'), 'CustomerOrdersPage');
const CustomerAddressesPage = lazyNamed(() => import('../pages/customer/CustomerAddressesPage'), 'CustomerAddressesPage');
const CustomerProfilePage = lazyNamed(() => import('../pages/customer/CustomerProfilePage'), 'CustomerProfilePage');

// Shop Admin pages
const ShopDashboardPage = lazyNamed(() => import('../pages/shop-admin/ShopDashboardPage'), 'ShopDashboardPage');
const ProductsListPage = lazyNamed(() => import('../pages/shop-admin/ProductsListPage'), 'ProductsListPage');
const ProductEditorPage = lazyNamed(() => import('../pages/shop-admin/ProductEditorPage'), 'ProductEditorPage');
const CategoriesPage = lazyNamed(() => import('../pages/shop-admin/CategoriesPage'), 'CategoriesPage');
const ShopOrdersPage = lazyNamed(() => import('../pages/shop-admin/ShopOrdersPage'), 'ShopOrdersPage');
const ShopOrderDetailPage = lazyNamed(() => import('../pages/shop-admin/ShopOrderDetailPage'), 'ShopOrderDetailPage');
const ShopSettingsPage = lazyNamed(() => import('../pages/shop-admin/ShopSettingsPage'), 'ShopSettingsPage');
const ShopSubscriptionPage = lazyNamed(() => import('../pages/shop-admin/ShopSubscriptionPage'), 'ShopSubscriptionPage');
const ShopProfilePage = lazyNamed(() => import('../pages/shop-admin/ShopProfilePage'), 'ShopProfilePage');
const ShopAppearancePage = lazyNamed(() => import('../pages/shop-admin/ShopAppearancePage'), 'ShopAppearancePage');
const ShopCustomersPage = lazyNamed(() => import('../pages/shop-admin/ShopCustomersPage'), 'ShopCustomersPage');
const AccountSettingsPage = lazyNamed(() => import('../pages/shop-admin/AccountSettingsPage'), 'AccountSettingsPage');

// Super Admin pages
const SuperDashboardPage = lazyNamed(() => import('../pages/super-admin/SuperDashboardPage'), 'SuperDashboardPage');
const ShopsListPage = lazyNamed(() => import('../pages/super-admin/ShopsListPage'), 'ShopsListPage');
const CreateShopPage = lazyNamed(() => import('../pages/super-admin/CreateShopPage'), 'CreateShopPage');
const ShopDetailPage = lazyNamed(() => import('../pages/super-admin/ShopDetailPage'), 'ShopDetailPage');
const ShopAdminsPage = lazyNamed(() => import('../pages/super-admin/ShopAdminsPage'), 'ShopAdminsPage');
const PlatformOrdersPage = lazyNamed(() => import('../pages/super-admin/PlatformOrdersPage'), 'PlatformOrdersPage');
const PlatformSettingsPage = lazyNamed(() => import('../pages/super-admin/PlatformSettingsPage'), 'PlatformSettingsPage');
const SubscriptionPlansPage = lazyNamed(() => import('../pages/super-admin/SubscriptionPlansPage'), 'SubscriptionPlansPage');
const SubscriptionAssignmentsPage = lazyNamed(() => import('../pages/super-admin/SubscriptionAssignmentsPage'), 'SubscriptionAssignmentsPage');
const SubscriptionPaymentsPage = lazyNamed(() => import('../pages/super-admin/SubscriptionPaymentsPage'), 'SubscriptionPaymentsPage');
const RevenueReportsPage = lazyNamed(() => import('../pages/super-admin/RevenueReportsPage'), 'RevenueReportsPage');
const ProductFormTemplatesListPage = lazyNamed(() => import('../pages/super-admin/ProductFormTemplatesListPage'), 'ProductFormTemplatesListPage');
const ProductFormBuilderPage = lazyNamed(() => import('../pages/super-admin/ProductFormBuilderPage'), 'ProductFormBuilderPage');
const AuditLogsPage = lazyNamed(() => import('../pages/super-admin/AuditLogsPage'), 'AuditLogsPage');

const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      <span className="text-xs font-medium text-slate-400">Loading view...</span>
    </div>
  </div>
);

/**
 * RootEntry component:
 * When a visitor opens '/', show the login page first unless they already have a valid authenticated session.
 * After login, redirect users according to their verified role:
 * - Super Admin → /superadmin/dashboard
 * - Shop Admin → /admin/dashboard
 * - Customer → /my-account/orders
 */
const RootEntry: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (user.role === 'super_admin') {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  if (user.role === 'shop_admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/my-account/orders" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* ==================================================== */}
        {/* 1. ENTRY & AUTHENTICATION ROUTES                     */}
        {/* ==================================================== */}
        <Route path="/" element={<RootEntry />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ==================================================== */}
        {/* 2. CUSTOMER PORTAL (/my-account)                     */}
        {/* ==================================================== */}
        <Route path="/my-account" element={<CustomerLayout />}>
          <Route index element={<Navigate to="/my-account/orders" replace />} />
          <Route path="orders" element={<CustomerOrdersPage />} />
          <Route path="addresses" element={<CustomerAddressesPage />} />
          <Route path="profile" element={<CustomerProfilePage />} />
        </Route>
        {/* Backward compatible aliases */}
        <Route path="/account" element={<Navigate to="/my-account/orders" replace />} />
        <Route path="/account/*" element={<Navigate to="/my-account/orders" replace />} />

        {/* ==================================================== */}
        {/* 3. SHOP ADMIN DASHBOARD & MANAGEMENT (/admin)        */}
        {/* ==================================================== */}
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<ShopDashboardPage />} />
          <Route path="products" element={<ProductsListPage />} />
          <Route path="products/new" element={<ProductEditorPage />} />
          <Route path="products/create" element={<ProductEditorPage />} />
          <Route path="products/:id/edit" element={<ProductEditorPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="orders" element={<ShopOrdersPage />} />
          <Route path="orders/:id" element={<ShopOrderDetailPage />} />
          <Route path="customers" element={<ShopCustomersPage />} />
          <Route path="profile" element={<ShopProfilePage />} />
          <Route path="appearance" element={<ShopAppearancePage />} />
          <Route path="settings" element={<ShopSettingsPage />} />
          <Route path="shop-settings" element={<ShopSettingsPage />} />
          <Route path="account" element={<AccountSettingsPage />} />
          <Route path="subscription" element={<ShopSubscriptionPage />} />
        </Route>

        {/* ==================================================== */}
        {/* 4. SUPER ADMIN HQ DASHBOARD (/superadmin)           */}
        {/* ==================================================== */}
        <Route path="/superadmin/login" element={<LoginPage />} />
        <Route path="/superadmin" element={<SuperAdminLayout />}>
          <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
          <Route path="dashboard" element={<SuperDashboardPage />} />
          <Route path="shops" element={<ShopsListPage />} />
          <Route path="shops/new" element={<CreateShopPage />} />
          <Route path="shops/create" element={<CreateShopPage />} />
          <Route path="shops/:id" element={<ShopDetailPage />} />
          <Route path="admins" element={<ShopAdminsPage />} />
          <Route path="subscriptions" element={<Navigate to="/superadmin/subscriptions/plans" replace />} />
          <Route path="subscriptions/plans" element={<SubscriptionPlansPage />} />
          <Route path="subscriptions/assignments" element={<SubscriptionAssignmentsPage />} />
          <Route path="subscriptions/payments" element={<SubscriptionPaymentsPage />} />
          <Route path="payments" element={<SubscriptionPaymentsPage />} />
          <Route path="reports" element={<RevenueReportsPage />} />
          <Route path="reports/revenue" element={<RevenueReportsPage />} />
          <Route path="product-form-builder" element={<ProductFormTemplatesListPage />} />
          <Route path="product-form-builder/:templateId" element={<ProductFormBuilderPage />} />
          <Route path="orders" element={<PlatformOrdersPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="settings" element={<PlatformSettingsPage />} />
          <Route path="platform-settings" element={<PlatformSettingsPage />} />
        </Route>

        {/* ==================================================== */}
        {/* 5. DYNAMIC WHOLESALE SHOP SLUG CATALOGUES            */}
        {/* ==================================================== */}
        <Route path="/:shopSlug" element={<ShopLandingPage />} />
        <Route path="/:shopSlug/products" element={<ShopLandingPage />} />
        <Route path="/:shopSlug/cart" element={<CartPage />} />
        <Route path="/:shopSlug/product/:productSlug" element={<ProductDetailPage />} />
        <Route path="/:shopSlug/checkout" element={<CheckoutPage />} />
        <Route path="/:shopSlug/order/:orderId/confirmation" element={<OrderConfirmationPage />} />

        {/* ==================================================== */}
        {/* 6. CATCH-ALL 404                                     */}
        {/* ==================================================== */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};
