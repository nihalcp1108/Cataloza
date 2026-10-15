import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  Building2,
  ArrowUpDown,
  Download,
  Calendar,
} from 'lucide-react';
import { api } from '../../api/client';

export const SubscriptionPaymentsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['super-admin-payments', page, limit, statusFilter],
    queryFn: async () => {
      const params: any = { page, limit };
      if (statusFilter !== 'all') {
        params.paymentStatus = statusFilter;
      }
      const res = await api.get('/super-admin/subscriptions/payments', { params });
      return res.data?.data;
    },
  });

  const payments = data?.payments || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  // Client-side search filter for quick typing
  const filteredPayments = payments.filter((p: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.shopName?.toLowerCase().includes(term) ||
      p.shopSlug?.toLowerCase().includes(term) ||
      p.planName?.toLowerCase().includes(term) ||
      p.referenceNumber?.toLowerCase().includes(term) ||
      p.recordedBy?.toLowerCase().includes(term)
    );
  });

  // Export to CSV
  const exportToCSV = () => {
    if (!payments.length) return;
    const headers = ['Date', 'Shop Name', 'Shop Slug', 'Plan Name', 'Amount (INR)', 'Method', 'Status', 'Reference', 'Recorded By', 'Notes'];
    const rows = filteredPayments.map((p: any) => [
      p.paymentDate ? new Date(p.paymentDate).toISOString().split('T')[0] : '',
      `"${p.shopName || ''}"`,
      p.shopSlug || '',
      `"${p.planName || ''}"`,
      p.amount || 0,
      p.paymentMethod || '',
      p.paymentStatus || '',
      `"${p.referenceNumber || ''}"`,
      `"${p.recordedBy || ''}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cataloza_subscription_payments_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCollectedOnPage = filteredPayments
    .filter((p: any) => p.paymentStatus === 'paid')
    .reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);

  const pendingOnPage = filteredPayments
    .filter((p: any) => p.paymentStatus === 'pending')
    .reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> SaaS Financial Audit Log
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscription Payments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete transaction ledger of all Cataloza subscription plan fees collected from shops.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh payments"
          >
            <RotateCcw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportToCSV}
            disabled={filteredPayments.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Paid on Page</p>
            <p className="text-xl font-extrabold text-emerald-600 mt-1 font-mono">
              ₹{totalCollectedOnPage.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending on Page</p>
            <p className="text-xl font-extrabold text-amber-600 mt-1 font-mono">
              ₹{pendingOnPage.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Records</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1">
              {pagination.total} <span className="text-xs font-normal text-slate-400">transactions</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/60">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by shop, plan, UTR reference, recorded by..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs bg-transparent focus:outline-none placeholder-slate-400 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-none"
          >
            <option value="all">All Payment Statuses</option>
            <option value="paid">Paid (Collected)</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Wholesale Shop</th>
                <th className="py-3 px-4">Subscription Plan</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reference / UTR</th>
                <th className="py-3 px-4">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                      <span>Loading subscription payments ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-14 text-slate-400">
                    <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No subscription payments found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Payments will appear here when recorded during shop creation or renewals.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p: any) => {
                  const isPaid = p.paymentStatus === 'paid';
                  const isPending = p.paymentStatus === 'pending';
                  const isRefunded = p.paymentStatus === 'refunded';

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        }) : '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{p.shopName || 'Unknown Shop'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">/{p.shopSlug}</div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {p.planName || 'Standard Plan'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`font-bold font-mono ${isPaid ? 'text-emerald-700' : isRefunded ? 'text-rose-600' : 'text-slate-800'}`}>
                          {isRefunded ? '-' : ''}₹{(p.amount || 0).toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 uppercase text-[11px] font-semibold text-slate-600">
                        {p.paymentMethod ? p.paymentMethod.replace('_', ' ') : '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isPending
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : isRefunded
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isPaid && <CheckCircle2 className="w-3 h-3" />}
                          {isPending && <Clock className="w-3 h-3" />}
                          {p.paymentStatus || 'unknown'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 select-all">
                          {p.referenceNumber || 'N/A'}
                        </span>
                        {p.notes && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]" title={p.notes}>
                            {p.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        {p.recordedBy || 'System / Admin'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
