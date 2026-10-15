import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Package,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Users,
  Store,
  Layers,
  Sparkles,
  DollarSign,
  AlertCircle,
  Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const ShopDashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/shop-admin/dashboard');
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch {
        toast.error('Failed to load dashboard metrics');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const handleCopyShopLink = () => {
    if (!data?.shop?.slug) return;
    const url = `${window.location.origin}/${data.shop.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Public catalogue link copied!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (isLoading || !data) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { metrics, recentOrders, recentCustomers, topProducts, shop } = data;
  const publicShopUrl = shop?.slug ? `${window.location.origin}/${shop.slug}` : '';

  return (
    <div className="space-y-8 pb-12">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Store className="w-6 h-6 text-blue-600" />
            {shop?.name || 'Shop'} Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time wholesale analytics, order processing velocity, customer directory, and catalogue overview.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyShopLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied' : 'Copy Shop Link'}</span>
          </button>

          {publicShopUrl && (
            <a
              href={publicShopUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <span>Open Storefront</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          )}

          <Link to="/admin/products/new">
            <Button variant="primary" size="sm">
              + Quick Add Product
            </Button>
          </Link>
          <Link to="/admin/orders">
            <Button variant="outline" size="sm">
              View All Orders
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Order Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Order Value</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            ₹{metrics.totalOrderValue.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-400">All submitted wholesale customer requests</p>
        </div>

        {/* Confirmed / Completed Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Confirmed Sales</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">
            ₹{metrics.confirmedSales.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium">
            Confirmed, dispatched & delivered revenue
          </p>
        </div>

        {/* Total Orders with Pending Notice */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.totalOrders}</p>
          <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {metrics.pendingOrders} pending confirmation
          </p>
        </div>

        {/* Total Buyers / Customers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Wholesale Buyers</span>
            <Users className="w-4 h-4 text-violet-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.totalCustomers}</p>
          <Link to="/admin/customers" className="text-[11px] text-blue-600 hover:underline font-medium block">
            View customer directory →
          </Link>
        </div>
      </div>

      {/* Secondary Status Pipeline Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Pending</span>
            <span className="text-lg font-black text-slate-900 leading-tight">{metrics.pendingOrders}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Confirmed</span>
            <span className="text-lg font-black text-slate-900 leading-tight">{metrics.confirmedOrders}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Delivered</span>
            <span className="text-lg font-black text-slate-900 leading-tight">{metrics.deliveredOrders}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Cancelled</span>
            <span className="text-lg font-black text-slate-900 leading-tight">{metrics.cancelledOrders}</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column: Recent Orders & Recent Buyers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Orders (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Orders</h2>
            </div>
            <Link to="/admin/orders" className="text-xs font-semibold text-blue-600 hover:underline">
              View all orders
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-slate-400 py-10 text-center">No orders received yet.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((ord: any) => (
                <Link
                  key={ord._id}
                  to={`/admin/orders/${ord._id}`}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-slate-50 transition-all group"
                >
                  <div className="space-y-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-blue-600">
                        {ord.orderNumber}
                      </span>
                      <Badge status={ord.orderStatus} type="order" />
                    </div>
                    <p className="text-xs text-slate-600 truncate">
                      {ord.customerSnapshot?.name || 'Guest Buyer'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-slate-900 block">
                      ₹{ord.grandTotal.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                      {ord.paymentStatus}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Buyers Directory (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Buyers</h2>
            </div>
            <Link to="/admin/customers" className="text-xs font-semibold text-blue-600 hover:underline">
              Full directory
            </Link>
          </div>

          {!recentCustomers || recentCustomers.length === 0 ? (
            <p className="text-xs text-slate-400 py-10 text-center">No customer records yet.</p>
          ) : (
            <div className="space-y-3">
              {recentCustomers.map((c: any) => (
                <div
                  key={c.phone || c._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="min-w-0 pr-2">
                    <h3 className="text-xs font-bold text-slate-900 truncate">{c.name || 'Anonymous Buyer'}</h3>
                    <p className="text-[11px] text-slate-500 font-mono truncate">{c.phone}</p>
                    {c.businessName && (
                      <p className="text-[10px] text-slate-400 truncate">{c.businessName}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-slate-900 block">{c.orderCount} orders</span>
                    <span className="text-[11px] text-emerald-600 font-medium">
                      ₹{c.totalSpent.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Catalogue & Inventory Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              Product Catalogue
            </h3>
            <Link to="/admin/products" className="text-xs font-semibold text-blue-600 hover:underline">
              Manage
            </Link>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{metrics.activeProducts}</span>
            <span className="text-xs text-slate-400">active of {metrics.totalProducts} total products</span>
          </div>
          <p className="text-xs text-slate-500">
            Organized across <span className="font-bold text-slate-800">{metrics.totalCategories}</span> wholesale categories.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Top Wholesale Performers
            </h3>
            <Link to="/admin/products" className="text-xs font-semibold text-blue-600 hover:underline">
              Inventory
            </Link>
          </div>
          {!topProducts || topProducts.length === 0 ? (
            <p className="text-xs text-slate-400 pt-2">No product performance data recorded yet.</p>
          ) : (
            <div className="space-y-2 pt-1">
              {topProducts.slice(0, 2).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 truncate pr-2">{p.name}</span>
                  <span className="font-mono text-emerald-600 font-bold shrink-0">{p.unitsSold} units</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
