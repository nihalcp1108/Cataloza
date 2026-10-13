import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Public pages
import { ShopLandingPage } from '../pages/public/ShopLandingPage';
import { ProductDetailPage } from '../pages/public/ProductDetailPage';
import { LoginPage } from '../pages/public/LoginPage';
import { RegisterPage } from '../pages/public/RegisterPage';
import { ForgotPasswordPage } from '../pages/public/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/public/ResetPasswordPage';
import { NotFoundPage } from '../pages/public/NotFoundPage';

// Customer pages & layout
import { CustomerLayout } from '../components/layout/CustomerLayout';
import { CheckoutPage } from '../pages/customer/CheckoutPage';
import { OrderConfirmationPage } from '../pages/customer/OrderConfirmationPage';
import { CustomerOrdersPage } from '../pages/customer/CustomerOrdersPage';
import { CustomerAddressesPage } from '../pages/customer/CustomerAddressesPage';
import { CustomerProfilePage } from '../pages/customer/CustomerProfilePage';

// Layouts
import { AdminLayout } from '../components/layout/AdminLayout';
import { SuperAdminLayout } from '../components/layout/SuperAdminLayout';

// Shop Admin pages
import { ShopDashboardPage } from '../pages/shop-admin/ShopDashboardPage';
import { ProductsListPage } from '../pages/shop-admin/ProductsListPage';
import { ProductEditorPage } from '../pages/shop-admin/ProductEditorPage';
import { CategoriesPage } from '../pages/shop-admin/CategoriesPage';
import { ShopOrdersPage } from '../pages/shop-admin/ShopOrdersPage';
import { ShopOrderDetailPage } from '../pages/shop-admin/ShopOrderDetailPage';
import { ShopSettingsPage } from '../pages/shop-admin/ShopSettingsPage';
import { ShopSubscriptionPage } from '../pages/shop-admin/ShopSubscriptionPage';

// Super Admin pages
import { SuperDashboardPage } from '../pages/super-admin/SuperDashboardPage';
import { ShopsListPage } from '../pages/super-admin/ShopsListPage';
import { CreateShopPage } from '../pages/super-admin/CreateShopPage';
import { ShopDetailPage } from '../pages/super-admin/ShopDetailPage';
import { ShopAdminsPage } from '../pages/super-admin/ShopAdminsPage';
import { PlatformOrdersPage } from '../pages/super-admin/PlatformOrdersPage';
import { PlatformSettingsPage } from '../pages/super-admin/PlatformSettingsPage';
import { SubscriptionPlansPage } from '../pages/super-admin/SubscriptionPlansPage';
import { SubscriptionAssignmentsPage } from '../pages/super-admin/SubscriptionAssignmentsPage';
import { ProductFormTemplatesListPage } from '../pages/super-admin/ProductFormTemplatesListPage';
import { ProductFormBuilderPage } from '../pages/super-admin/ProductFormBuilderPage';
import { AuditLogsPage } from '../pages/super-admin/AuditLogsPage';

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
        <Route path="shop-settings" element={<ShopSettingsPage />} />
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
      <Route path="/:shopSlug/product/:productSlug" element={<ProductDetailPage />} />
      <Route path="/:shopSlug/checkout" element={<CheckoutPage />} />
      <Route path="/:shopSlug/order/:orderId/confirmation" element={<OrderConfirmationPage />} />

      {/* ==================================================== */}
      {/* 6. CATCH-ALL 404                                     */}
      {/* ==================================================== */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
