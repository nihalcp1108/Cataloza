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
} from 'lucide-react';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const ShopDashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/shop-admin/dashboard');
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { metrics, recentOrders, topProducts } = data;

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Shop Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time analytics, order velocity, and inventory oversight for your wholesale business.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/admin/products/new">
            <Button variant="primary" size="sm">
              Add New Product
            </Button>
          </Link>
          <Link to="/admin/orders">
            <Button variant="outline" size="sm">
              View All Orders
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            ₹{metrics.totalRevenue.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-400">Excludes cancelled orders</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.totalOrders}</p>
          <p className="text-[11px] text-blue-600 font-medium">
            {metrics.pendingOrders} pending confirmation
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Products</span>
            <Package className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {metrics.activeProducts}{' '}
            <span className="text-xs font-normal text-slate-400">/ {metrics.totalProducts}</span>
          </p>
          <p className="text-[11px] text-slate-400">Published in public catalogue</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed Dispatches</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.completedOrders}</p>
          <p className="text-[11px] text-rose-500 font-medium">{metrics.cancelledOrders} cancelled</p>
        </div>
      </div>

      {/* Two Column Section: Recent Orders & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Orders</h2>
            <Link to="/admin/orders" className="text-xs font-semibold text-blue-600 hover:underline">
              View all
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No orders received yet.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((ord: any) => (
                <Link
                  key={ord._id}
                  to={`/admin/orders/${ord._id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{ord.orderNumber}</span>
                      <Badge status={ord.orderStatus} type="order" />
                    </div>
                    <p className="text-xs text-slate-500">{ord.customerSnapshot?.name}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 block">
                      ₹{ord.grandTotal.toLocaleString('en-IN')}
                    </span>
                    <Badge status={ord.paymentStatus} type="payment" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Best Selling Products */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Best-Selling Products
            </h2>
            <Link to="/admin/products" className="text-xs font-semibold text-blue-600 hover:underline">
              Manage inventory
            </Link>
          </div>

          {topProducts.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No sales recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p: any, i: number) => (
                <div
                  key={p._id || i}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">{p.name}</h3>
                    <p className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 block">{p.unitsSold} units sold</span>
                    <span className="text-[11px] text-emerald-600 font-medium">
                      ₹{p.revenue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
