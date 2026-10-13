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
} from 'lucide-react';
import { api } from '../../api/client';
import { IShop } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Pagination } from '../../components/common/Pagination';
import { TableRowSkeleton } from '../../components/common/LoadingSkeleton';

export const ShopsListPage: React.FC = () => {
  const [shops, setShops] = useState<IShop[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const fetchShops = async () => {
    try {
      setIsLoading(true);
      const params: any = { page, limit: 10 };
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

  const handleCopyLink = (shop: IShop) => {
    const fullUrl = shop.publicUrl || `${window.location.origin}/${shop.slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(shop.slug);
    toast.success(`Copied link for ${shop.name}!`);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const handleToggleStatus = async (shop: IShop) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Wholesale Shops</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage multi-tenant wholesale suppliers, assigned administrators, and public URLs.
          </p>
        </div>

        <Link to="/superadmin/shops/new">
          <Button variant="primary" icon={<PlusCircle className="w-4 h-4" />}>
            Create New Shop
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search shops by name, slug, or WhatsApp number..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="text-xs text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
        >
          <option value="">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Shop Name & URL Slug</th>
                <th className="py-3 px-4">WhatsApp / Phone</th>
                <th className="py-3 px-4">Assigned Admin</th>
                <th className="py-3 px-4">Products</th>
                <th className="py-3 px-4">Orders</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
              ) : shops.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No shops found.
                  </td>
                </tr>
              ) : (
                shops.map((shop) => (
                  <tr key={shop._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{shop.name}</span>
                      <span className="font-mono text-[10px] text-indigo-600 block">/{shop.slug}</span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      +{shop.whatsappNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      {shop.admins && shop.admins.length > 0 ? (
                        <div>
                          <span className="font-semibold text-slate-800 block">{shop.admins[0].name}</span>
                          <span className="text-[11px] text-slate-400 block">{shop.admins[0].email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No admin assigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {shop.productCount || 0}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {shop.orderCount || 0}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge status={shop.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleCopyLink(shop)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          title="Copy public URL"
                        >
                          {copiedSlug === shop.slug ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        <Link
                          to={`/${shop.slug}`}
                          target="_blank"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          title="Open public catalogue"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleToggleStatus(shop)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            shop.status === 'active'
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={shop.status === 'active' ? 'Deactivate Shop' : 'Activate Shop'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
