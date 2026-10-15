import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Users,
  TrendingUp,
  PlusCircle,
  ExternalLink,
  ShieldAlert,
  CreditCard,
  Clock,
  AlertCircle,
  Calendar,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export const SuperDashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    fetchPlatformStats();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="text-xs text-slate-500 font-medium">Aggregating Cataloza subscription metrics...</p>
      </div>
    );
  }

  const { metrics, charts, recentShops, recentPayments, expiringSubscriptions, attentionShops } = data;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Cataloza SaaS Platform HQ
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Subscription & Platform Revenue Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track multi-tenant wholesale dealer subscriptions, received revenue, and recurring MRR.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPlatformStats}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Data
          </Button>
          <Link to="/superadmin/shops/new">
            <Button variant="primary" size="sm" icon={<PlusCircle className="w-4 h-4" />}>
              Add New Shop
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Shops */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Shops</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{metrics.totalShops}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                {metrics.activeShops} active
              </span>
              <span className="text-[11px] text-slate-400">
                {metrics.inactiveShops} inactive / {metrics.suspendedShops} suspended
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Subscriptions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Subscriptions</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{metrics.activeSubscriptions}</p>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span>{metrics.expiringIn30Days} expiring within 30 days</span>
            </p>
          </div>
        </div>

        {/* Card 3: Total Subscription Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Subscription Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              ₹{metrics.totalSubscriptionRevenue.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              Confirmed plan payments collected
            </p>
          </div>
        </div>

        {/* Card 4: Monthly Subscription Revenue & MRR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Monthly Revenue (MRR)
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              ₹{metrics.monthlySubscriptionRevenue.toLocaleString('en-IN')}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px]">
              <span className="text-slate-500">MRR:</span>
              <span className="font-bold text-indigo-600">₹{metrics.mrr.toLocaleString('en-IN')}/mo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Quick Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">
            Pending Payments
          </span>
          <span className="text-base font-black text-slate-900 mt-0.5 block">
            ₹{metrics.pendingSubscriptionPayments.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
            Expired Subscriptions
          </span>
          <span className="text-base font-black text-slate-900 mt-0.5 block">
            {metrics.expiredSubscriptions}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">
            Expiring in 7 Days
          </span>
          <span className="text-base font-black text-slate-900 mt-0.5 block">
            {metrics.expiringIn7Days}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
            Expiring in 30 Days
          </span>
          <span className="text-base font-black text-slate-900 mt-0.5 block">
            {metrics.expiringIn30Days}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Shop Admins
          </span>
          <span className="text-base font-black text-slate-900 mt-0.5 block">
            {metrics.totalShopAdmins}
          </span>
        </div>
      </div>

      {/* Revenue & Growth Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Subscription Revenue Trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Monthly Subscription Revenue
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Actual subscription payments received across the last 6 months
              </p>
            </div>
            <Link to="/superadmin/reports" className="text-xs font-semibold text-indigo-600 hover:underline">
              Full Report
            </Link>
          </div>

          <div className="h-64 w-full">
            {charts?.revenueTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.revenueTrend}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No historical payment data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Subscription Plan Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Shops by Plan
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Active tier distribution</p>
            </div>
            <Link to="/superadmin/subscriptions/plans" className="text-xs font-semibold text-indigo-600 hover:underline">
              Plans
            </Link>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {charts?.plansDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.plansDistribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {charts.plansDistribution.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [`${value} shop(s)`, name]} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">No active plan assignments.</p>
            )}
          </div>
        </div>
      </div>

      {/* Two Column: Recent Shops & Recent Subscription Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recently Registered Shops */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Recently Registered Shops
              </h2>
              <p className="text-xs text-slate-400">New wholesale dealers onboarded to Cataloza</p>
            </div>
            <Link to="/superadmin/shops" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {recentShops?.length > 0 ? (
              recentShops.map((s: any) => {
                const planName = s.subscriptionId?.planId?.name || 'Plan Not Assigned';
                return (
                  <div
                    key={s._id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <Link
                        to={`/superadmin/shops/${s._id}`}
                        className="font-bold text-slate-900 text-xs hover:text-indigo-600 block"
                      >
                        {s.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-slate-400">/{s.slug}</span>
                        <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                          {planName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge status={s.status} />
                      <Link
                        to={`/superadmin/shops/${s._id}`}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No shops registered yet.</p>
            )}
          </div>
        </div>

        {/* Recent Subscription Payments */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Recent Subscription Payments
              </h2>
              <p className="text-xs text-slate-400">Live feed of received plan fees</p>
            </div>
            <Link to="/superadmin/payments" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {recentPayments?.length > 0 ? (
              recentPayments.map((p: any) => (
                <div
                  key={p._id || p.referenceNumber}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{p.shopName}</span>
                      <span className="text-slate-400 text-[11px]">({p.planName || 'Plan Fee'})</span>
                    </div>
                    <p className="text-slate-400 text-[10px] mt-0.5">
                      {new Date(p.paymentDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      • {p.paymentMethod?.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-black text-slate-900 block">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </span>
                    <span
                      className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        p.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-700'
                          : p.paymentStatus === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {p.paymentStatus?.toUpperCase() || 'PAID'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                No subscription payments recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Two Column: Expiring Soon & Shops Requiring Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Expiring Soon */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                Subscriptions Expiring Soon
              </h2>
              <p className="text-xs text-slate-400">Requires renewal within the next 30 days</p>
            </div>
            <Link
              to="/superadmin/subscriptions/assignments"
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Manage
            </Link>
          </div>

          <div className="space-y-3">
            {expiringSubscriptions?.length > 0 ? (
              expiringSubscriptions.map((sub: any) => {
                const daysLeft = Math.ceil(
                  (new Date(sub.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={sub._id}
                    className="flex items-center justify-between p-3 rounded-xl border border-amber-100 bg-amber-50/30 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{sub.shopId?.name}</span>
                      <span className="text-[11px] text-slate-500">
                        {sub.planId?.name} • Expiry: {new Date(sub.endDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                      </span>
                      <Link
                        to={`/superadmin/shops/${sub.shopId?._id}`}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Renew
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                All subscriptions are in good standing!
              </p>
            )}
          </div>
        </div>

        {/* Attention Shops */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                Shops Requiring Attention
              </h2>
              <p className="text-xs text-slate-400">Overdue subscriptions or pending payments</p>
            </div>
            <Link to="/superadmin/shops" className="text-xs font-semibold text-indigo-600 hover:underline">
              Resolve
            </Link>
          </div>

          <div className="space-y-3">
            {attentionShops?.length > 0 ? (
              attentionShops.map((sub: any) => (
                <div
                  key={sub._id}
                  className="flex items-center justify-between p-3 rounded-xl border border-rose-100 bg-rose-50/20 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">{sub.shopId?.name}</span>
                    <span className="text-[11px] text-slate-500">
                      {sub.planId?.name || 'Plan'} • Status:{' '}
                      <strong className="uppercase text-rose-600">{sub.status}</strong>
                    </span>
                  </div>

                  <div className="text-right">
                    <Link
                      to={`/superadmin/shops/${sub.shopId?._id}`}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold transition-colors"
                    >
                      Resolve
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                No shops currently require urgent attention.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
