import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Package,
  Layers,
  ShoppingBag,
  CreditCard,
  History,
  FileCode2,
  Users,
  Settings,
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';

export const ShopDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-shop-detail', id],
    queryFn: async () => {
      const res = await api.get(`/super-admin/shops/${id}/details`);
      return res.data?.data;
    },
    enabled: Boolean(id),
  });

  const suspendMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch(`/super-admin/shops/${id}/suspend`, {
        reason: 'Suspended via Super Admin Console',
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Shop suspended successfully');
      queryClient.invalidateQueries({ queryKey: ['super-admin-shop-detail', id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to suspend shop');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch(`/super-admin/shops/${id}/reactivate`, {});
      return res.data;
    },
    onSuccess: () => {
      toast.success('Shop reactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['super-admin-shop-detail', id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reactivate shop');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-100 rounded-2xl" />
        <div className="h-96 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  const shop = data?.shop;
  const admins = data?.admins || [];
  const products = data?.products || [];
  const categories = data?.categories || [];
  const orders = data?.orders || [];
  const subscription = data?.subscription;
  const auditLogs = data?.auditLogs || [];
  const stats = data?.stats || { productCount: 0, orderCount: 0 };
  const publicUrl = data?.publicUrl || '';

  const isSuspended = shop?.status === 'suspended';

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success('Shop catalogue URL copied to clipboard!');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Store },
    { id: 'profile', label: 'Business Profile', icon: Settings },
    { id: 'products', label: `Products (${stats.productCount})`, icon: Package },
    { id: 'categories', label: `Categories (${categories.length})`, icon: Layers },
    { id: 'orders', label: `Orders (${stats.orderCount})`, icon: ShoppingBag },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'admins', label: `Admins (${admins.length})`, icon: UserCheck },
    { id: 'activity', label: 'Activity Log', icon: History },
  ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/superadmin/shops"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{shop?.name}</h1>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                  shop?.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isSuspended
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {shop?.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{publicUrl}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" icon={<Copy className="w-4 h-4" />} onClick={copyUrl}>
            Copy URL
          </Button>

          <a href={publicUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" icon={<ExternalLink className="w-4 h-4" />}>
              Open Catalogue
            </Button>
          </a>

          {isSuspended ? (
            <Button
              variant="primary"
              size="sm"
              isLoading={reactivateMutation.isPending}
              onClick={() => reactivateMutation.mutate()}
            >
              Reactivate Shop
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-rose-600 hover:bg-rose-50 border-rose-200"
              isLoading={suspendMutation.isPending}
              onClick={() => {
                if (confirm(`Are you sure you want to suspend "${shop?.name}"? Catalogue access will be blocked.`)) {
                  suspendMutation.mutate();
                }
              }}
            >
              Suspend Shop
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200/80">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Products</h3>
            <p className="text-2xl font-black text-slate-900">{stats.productCount}</p>
            <p className="text-xs text-slate-500">Live wholesale catalog items</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Orders</h3>
            <p className="text-2xl font-black text-slate-900">{stats.orderCount}</p>
            <p className="text-xs text-slate-500">Processed order records</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Subscription Tier</h3>
            <p className="text-xl font-bold text-slate-900">{subscription?.planId?.name || 'Starter Wholesale'}</p>
            <p className="text-xs text-slate-500">Status: {subscription?.status || 'Active'}</p>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 max-w-2xl">
          <h3 className="text-sm font-bold text-slate-900">Commercial Contact & Identity</h3>
          <div className="space-y-3 text-xs text-slate-700 divide-y divide-slate-100">
            <div className="pt-2 flex justify-between">
              <span className="text-slate-400">Business Phone:</span>
              <span className="font-semibold">{shop?.contactPhone || 'N/A'}</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-400">WhatsApp Dispatch Line:</span>
              <span className="font-semibold">{shop?.whatsappNumber || 'N/A'}</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-400">Official Email:</span>
              <span className="font-semibold">{shop?.email || 'N/A'}</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-400">Operating Hours:</span>
              <span className="font-semibold">{shop?.businessHours || 'N/A'}</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-400">Physical Address:</span>
              <span className="font-semibold text-right max-w-xs">
                {shop?.address?.street}, {shop?.address?.city}, {shop?.address?.state} - {shop?.address?.postalCode}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800">Recent Products in this Shop</h3>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {products.length === 0 ? (
              <p className="p-6 text-center text-slate-400">No products uploaded yet.</p>
            ) : (
              products.map((p: any) => (
                <div key={p._id} className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">{p.name}</span>
                    <div className="text-[11px] text-slate-400 font-mono">SKU: {p.sku}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">₹{p.price?.toLocaleString('en-IN')}</span>
                    <div className="text-[10px] text-slate-400">{p.isActive ? 'Active' : 'Inactive'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800">Recent Orders for this Shop</h3>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {orders.length === 0 ? (
              <p className="p-6 text-center text-slate-400">No orders recorded yet.</p>
            ) : (
              orders.map((o: any) => (
                <div key={o._id} className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 font-mono">{o.orderNumber}</span>
                    <div className="text-[11px] text-slate-400">
                      {o.deliveryAddress?.fullName || 'Customer'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">₹{o.grandTotal?.toLocaleString('en-IN')}</span>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">{o.orderStatus}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'admins' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4 max-w-xl">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Assigned Shop Administrators
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {admins.map((a: any) => (
              <div key={a._id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">{a.name}</div>
                  <div className="text-[11px] text-slate-400">{a.email}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Audit Activity Log
          </h3>
          <div className="divide-y divide-slate-100 text-xs font-mono">
            {auditLogs.length === 0 ? (
              <p className="py-6 text-center text-slate-400 font-sans">No recorded audit logs.</p>
            ) : (
              auditLogs.map((log: any) => (
                <div key={log._id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-blue-600">{log.action}</span>
                    <span className="text-slate-400 text-[11px] ml-2">by {log.actorId?.email || 'System'}</span>
                  </div>
                  <span className="text-slate-400 text-[10px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
