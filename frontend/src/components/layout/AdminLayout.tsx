import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Users,
  Store,
  Palette,
  Settings,
  User,
  CreditCard,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/client';
import { IShop } from '../../types';

export const AdminLayout: React.FC = () => {
  const { user, logout, isShopAdmin, isSuperAdmin, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [shop, setShop] = useState<IShop | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const res = await api.get('/shop-admin/shop');
        if (res.data?.success && res.data?.data?.shop) {
          setShop(res.data.data.shop);
        }
      } catch {}
    };
    if (user) {
      fetchShop();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || (!isShopAdmin && !isSuperAdmin)) {
    return <Navigate to="/admin/login" replace />;
  }

  const primaryShop = user.assignedShopIds && user.assignedShopIds.length > 0 ? user.assignedShopIds[0] : null;
  const shopSlug = shop?.slug || (typeof primaryShop === 'object' ? primaryShop.slug : '');
  const publicShopUrl = `${window.location.origin}/${shopSlug}`;

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Categories', href: '/admin/categories', icon: Layers },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { name: 'Shop Profile', href: '/admin/profile', icon: Store },
    { name: 'Shop Appearance', href: '/admin/appearance', icon: Palette },
    { name: 'Shop Settings', href: '/admin/shop-settings', icon: Settings },
    { name: 'Account Settings', href: '/admin/account', icon: User },
    { name: 'Subscription', href: '/admin/subscription', icon: CreditCard },
  ];

  const handleCopyLink = () => {
    if (!shopSlug) return;
    navigator.clipboard.writeText(publicShopUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Shop Logo */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {shop?.logo ? (
              <img
                src={shop.logo}
                alt={shop.name}
                className="w-10 h-10 rounded-xl object-cover bg-white p-0.5 border border-slate-700 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold shrink-0 text-white shadow-sm">
                {shop?.name ? shop.name.charAt(0).toUpperCase() : <Store className="w-5 h-5" />}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-sm font-bold text-white block truncate leading-tight">
                {shop?.name || 'Shop Admin'}
              </span>
              <span className="text-[11px] text-blue-400 font-medium block truncate">
                {shop?.slug ? `/${shop.slug}` : 'Wholesale Dashboard'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Public Shop Shortcut */}
        {shopSlug && (
          <div className="p-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400 px-1 font-medium">
              <span>Public Catalogue</span>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                title="Copy link"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <Link
              to={`/${shopSlug}`}
              target="_blank"
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors border border-slate-700/50"
            >
              <span className="truncate">Open Storefront</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1.5" />
            </Link>
          </div>
        )}

        {/* User Account / Logout */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between bg-slate-950/40">
          <Link
            to="/admin/account"
            className="flex items-center gap-2.5 min-w-0 mr-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar for mobile */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 md:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-slate-800 text-sm">Shop Management Portal</span>
          <div className="w-8" />
        </header>

        {/* Dynamic Nested Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
