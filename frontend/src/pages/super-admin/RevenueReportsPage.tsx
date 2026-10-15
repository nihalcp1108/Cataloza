import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  Download,
  Filter,
  Calendar,
  CreditCard,
  Building2,
  PieChart as PieIcon,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api } from '../../api/client';
import { ISubscriptionPlan, IShop } from '../../types';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];

export const RevenueReportsPage: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedShopId, setSelectedShopId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  // Fetch plans for dropdown
  const { data: plansData } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const res = await api.get('/subscriptions/plans');
      return res.data?.data?.plans as ISubscriptionPlan[];
    },
  });

  // Fetch shops for dropdown
  const { data: shopsData } = useQuery({
    queryKey: ['all-shops-for-reports'],
    queryFn: async () => {
      const res = await api.get('/super-admin/shops?limit=100');
      return res.data?.data?.shops as IShop[];
    },
  });

  // Fetch Revenue Report Analytics
  const { data: reportData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['super-admin-revenue-reports', startDate, endDate, selectedPlanId, selectedShopId, paymentStatus],
    queryFn: async () => {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedPlanId) params.planId = selectedPlanId;
      if (selectedShopId) params.shopId = selectedShopId;
      if (paymentStatus) params.paymentStatus = paymentStatus;

      const res = await api.get('/super-admin/reports/revenue', { params });
      return res.data?.data;
    },
  });

  const summary = reportData?.summary || {
    totalRevenue: 0,
    pendingAmount: 0,
    refundedAmount: 0,
    totalCount: 0,
  };

  const byPlan = reportData?.byPlan || [];
  const byShop = reportData?.byShop || [];
  const byMethod = reportData?.byMethod || [];
  const allPayments = reportData?.exportRecords || reportData?.allPayments || [];

  // Export CSV
  const exportCSV = () => {
    if (!allPayments.length) return;
    const headers = [
      'Date',
      'Shop Name',
      'Shop Slug',
      'Plan Name',
      'Amount',
      'Currency',
      'Method',
      'Status',
      'Reference',
      'Notes',
    ];
    const rows = allPayments.map((p: any) => [
      p.paymentDate ? new Date(p.paymentDate).toISOString().split('T')[0] : '',
      `"${p.shopName || ''}"`,
      p.shopSlug || '',
      `"${p.planName || ''}"`,
      p.amount || 0,
      p.currency || 'INR',
      p.paymentMethod || '',
      p.paymentStatus || '',
      `"${p.referenceNumber || ''}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cataloza_revenue_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedPlanId('');
    setSelectedShopId('');
    setPaymentStatus('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
              <BarChart3 className="w-3 h-3" /> Financial Analytics & Audits
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscription Revenue Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict SaaS subscription fee metrics excluding individual shop wholesale sales orders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
            title="Refresh Report"
          >
            <RotateCcw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportCSV}
            disabled={allPayments.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export Financial CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Filter Report Parameters</span>
          </div>
          {(startDate || endDate || selectedPlanId || selectedShopId || paymentStatus) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-indigo-600 hover:underline font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Subscription Plan</label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="">All Subscription Plans</option>
              {(plansData || []).map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} (₹{p.price})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Target Shop</label>
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="">All Wholesale Shops</option>
              {(shopsData || []).map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} (/{s.slug})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="">All Statuses (Active)</option>
              <option value="paid">Paid Only</option>
              <option value="pending">Pending Invoices Only</option>
              <option value="refunded">Refunded Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net SaaS Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 font-mono mt-2">
            ₹{summary.totalRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Confirmed received subscription fees</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Invoices</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 font-mono mt-2">
            ₹{summary.pendingAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Unpaid subscription dues</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Refunded Amount</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-600 font-mono mt-2">
            ₹{summary.refundedAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Deducted from net total</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Transactions</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {summary.totalCount} <span className="text-xs font-normal text-slate-400">payments</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Matching current criteria</div>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Plan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Revenue by Subscription Plan</h3>
              <p className="text-xs text-slate-400">Distribution across active subscription tiers</p>
            </div>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>

          {byPlan.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No plan revenue recorded yet.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byPlan} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Revenue by Payment Method */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Revenue by Payment Channel</h3>
              <p className="text-xs text-slate-400">Bank Transfer, UPI, Cheque, or Cash settlements</p>
            </div>
            <PieIcon className="w-4 h-4 text-emerald-500" />
          </div>

          {byMethod.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No payment channels recorded yet.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byMethod.map((m: any) => ({
                      name: (m._id || 'other').replace('_', ' ').toUpperCase(),
                      value: m.revenue,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {byMethod.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Top Contributing Shops Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Subscription Revenue by Shop</h3>
            <p className="text-xs text-slate-400">
              Verified Cataloza licensing revenue received from each wholesale dealer
            </p>
          </div>
          <Building2 className="w-4 h-4 text-slate-400" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Wholesale Shop</th>
                <th className="py-3 px-4">Shop Slug</th>
                <th className="py-3 px-4">Transactions</th>
                <th className="py-3 px-4 text-right">Net Subscription Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {byShop.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400">
                    No shop payments in the selected period.
                  </td>
                </tr>
              ) : (
                byShop.map((s: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{s._id || 'Unknown Shop'}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">/{s.shopSlug}</td>
                    <td className="py-3 px-4 text-slate-600">{s.count} recorded payments</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                      ₹{s.revenue.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
