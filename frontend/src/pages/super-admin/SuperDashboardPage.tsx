import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Users,
  ShoppingBag,
  TrendingUp,
  Package,
  PlusCircle,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const SuperDashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlatformStats = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/super-admin/dashboard');
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlatformStats();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const { metrics, recentShops, recentOrders } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Platform Control HQ
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Super Admin Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Platform-wide governance across wholesale tenants, orders, and administrative access.
          </p>
        </div>

        <Link to="/superadmin/shops/new">
          <Button variant="primary" size="sm" icon={<PlusCircle className="w-4 h-4" />}>
            Provision New Shop
          </Button>
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Suppliers</span>
            <Store className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.totalShops}</p>
          <p className="text-[11px] text-emerald-600 font-medium">
            {metrics.activeShops} active / {metrics.inactiveShops} inactive
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Platform Orders</span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.totalOrders}</p>
          <p className="text-[11px] text-slate-400">Total lifetime platform orders</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Platform Volume</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            ₹{metrics.totalRevenue.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-400">Excludes cancelled orders</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Users</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.totalCustomers + metrics.totalShopAdmins}</p>
          <p className="text-[11px] text-slate-400">
            {metrics.totalCustomers} buyers, {metrics.totalShopAdmins} shop admins
          </p>
        </div>
      </div>

      {/* Two Column: Recent Shops & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Shops */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Shops</h2>
            <Link to="/superadmin/shops" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {recentShops.map((s: any) => (
              <div
                key={s._id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <span className="font-semibold text-slate-900 text-xs block">{s.name}</span>
                  <span className="font-mono text-[10px] text-slate-400 block">/{s.slug}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={s.status} />
                  <Link
                    to={`/${s.slug}`}
                    target="_blank"
                    className="p-1 rounded text-slate-400 hover:text-slate-600"
                    title="Open public catalogue"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Platform Orders
            </h2>
            <Link to="/superadmin/orders" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {recentOrders.map((ord: any) => (
              <div
                key={ord._id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                    <span className="text-slate-500 font-medium">({ord.shopId?.name})</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    {ord.customerSnapshot?.name}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-bold text-slate-900 block">
                    ₹{ord.grandTotal.toLocaleString('en-IN')}
                  </span>
                  <Badge status={ord.orderStatus} type="order" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
