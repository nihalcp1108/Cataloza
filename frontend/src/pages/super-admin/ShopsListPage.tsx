import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Store,
  PlusCircle,
  Search,
  ExternalLink,
  Copy,
  Check,
  Power,
  Users,
  CreditCard,
  Calendar,
  Filter,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../api/client';
import { IShop, ISubscriptionPlan } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Pagination } from '../../components/common/Pagination';
import { TableRowSkeleton } from '../../components/common/LoadingSkeleton';

export const ShopsListPage: React.FC = () => {
  const [shops, setShops] = useState<any[]>([]);
  const [plans, setPlans] = useState<ISubscriptionPlan[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Load plans for filter
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await api.get('/subscriptions/plans');
        if (res.data?.success) {
          setPlans(res.data.data.plans || []);
        }
      } catch {}
    };
    fetchPlans();
  }, []);

  const fetchShops = async () => {
    try {
      setIsLoading(true);
      const params: any = { page, limit: 12 };
      if (search) params.search = search;
      if (status) params.status = status;

      const res = await api.get('/super-admin/shops', { params });
      if (res.data?.success) {
        setShops(res.data.data.shops);
        setPagination(res.data.data.pagination);
      }
    } catch {
      setShops([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, [page, search, status]);

  const handleCopyLink = (shop: any) => {
    const fullUrl = shop.publicUrl || `${window.location.origin}/${shop.slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(shop.slug);
    toast.success(`Copied catalogue URL for ${shop.name}!`);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const handleToggleStatus = async (shop: any) => {
    try {
      const res = await api.patch(`/super-admin/shops/${shop._id}/toggle-status`);
      if (res.data?.success) {
        toast.success(`Shop is now ${res.data.data.shop.status}`);
        fetchShops();
      }
    } catch {
      toast.error('Failed to change shop status');
    }
  };

  // Client-side filter for plan and payment if needed
  const filteredShops = shops.filter((s) => {
    if (planFilter && s.subscription?.planName !== planFilter) return false;
    if (paymentFilter && s.subscription?.paymentStatus !== paymentFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Wholesale Shops Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Governing all dealer catalogues, subscriptions, assigned administrators, and public stores.
          </p>
        </div>

        <Link to="/superadmin/shops/new">
          <Button variant="primary" icon={<PlusCircle className="w-4 h-4" />}>
            Add New Shop
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search shops by name, slug, phone, or city..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="text-xs text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
          >
            <option value="">All Shop Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="suspended">Suspended Only</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="text-xs text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
          >
            <option value="">All Plans</option>
            {plans.map((p) => (
              <option key={p._id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Payment Status Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="text-xs text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
          >
            <option value="">All Payments</option>
            <option value="paid">Paid Confirmed</option>
            <option value="pending">Pending Payment</option>
          </select>
        </div>
      </div>

      {/* Shops Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Shop Identity</th>
                <th className="py-3 px-4">Admin & Contact</th>
                <th className="py-3 px-4">Subscription Plan</th>
                <th className="py-3 px-4">Expiry / Renewal</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
              ) : filteredShops.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No shops found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredShops.map((shop) => {
                  const sub = shop.subscription;
                  const primaryAdmin = shop.admins?.[0];
                  const isSuspended = shop.status === 'suspended';

                  return (
                    <tr key={shop._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Shop Identity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {shop.logo ? (
                            <img
                              src={shop.logo}
                              alt={shop.name}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs"
                              style={{ backgroundColor: shop.accentColor || '#4f46e5' }}
                            >
                              {shop.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <Link
                              to={`/superadmin/shops/${shop._id}`}
                              className="font-bold text-slate-900 hover:text-indigo-600 block text-xs"
                            >
                              {shop.name}
                            </Link>
                            <span className="font-mono text-[10px] text-slate-400 block">/{shop.slug}</span>
                            {shop.businessCategory && (
                              <span className="text-[10px] text-slate-500 block">{shop.businessCategory}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Admin & Contact */}
                      <td className="py-3.5 px-4">
                        {primaryAdmin ? (
                          <>
                            <span className="font-semibold text-slate-900 block">{primaryAdmin.name}</span>
                            <span className="text-[11px] text-slate-500 block">{primaryAdmin.email}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">No admin assigned</span>
                        )}
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          WA: {shop.whatsappNumber}
                        </span>
                      </td>

                      {/* Subscription Plan */}
                      <td className="py-3.5 px-4">
                        {sub ? (
                          <div>
                            <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px] inline-block">
                              {sub.planName}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 uppercase">
                              Status: <strong>{sub.status}</strong>
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold inline-block">
                            Plan Not Assigned
                          </span>
                        )}
                      </td>

                      {/* Expiry / Renewal */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {sub?.endDate ? (
                          <div>
                            <span className="font-medium text-slate-900 block">
                              {new Date(sub.endDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(sub.endDate) < new Date() ? (
                                <strong className="text-rose-600">Expired</strong>
                              ) : (
                                'Valid'
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sub?.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {sub?.paymentStatus === 'paid' ? 'PAID' : 'PENDING'}
                        </span>
                      </td>

                      {/* Shop Status */}
                      <td className="py-3.5 px-4">
                        <Badge status={shop.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCopyLink(shop)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Copy Public URL"
                          >
                            {copiedSlug === shop.slug ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          <a
                            href={shop.publicUrl || `/${shop.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="Open Storefront Catalogue"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          <Link
                            to={`/superadmin/shops/${shop._id}`}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 font-bold transition-colors"
                            title="View Full Shop Details & Subscription"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => handleToggleStatus(shop)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              shop.status === 'active'
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={shop.status === 'active' ? 'Deactivate Shop' : 'Activate Shop'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(p) => setPage(p)}
        />
      </div>
    </div>
  );
};
