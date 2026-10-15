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
  Users,
  Settings,
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  RefreshCw,
  PlusCircle,
  KeyRound,
  ShieldCheck,
  X,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';

export const ShopDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Modals state
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedAdminForPassword, setSelectedAdminForPassword] = useState<any>(null);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);

  // Renewal form state
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewMonths, setRenewMonths] = useState(1);
  const [renewAmount, setRenewAmount] = useState<number | string>('');
  const [renewPaymentStatus, setRenewPaymentStatus] = useState('paid');
  const [renewPaymentMethod, setRenewPaymentMethod] = useState('bank_transfer');
  const [renewReference, setRenewReference] = useState('');
  const [renewNotes, setRenewNotes] = useState('');

  // Record payment form state
  const [recordAmount, setRecordAmount] = useState<number | string>('');
  const [recordPaymentMethod, setRecordPaymentMethod] = useState('bank_transfer');
  const [recordPaymentStatus, setRecordPaymentStatus] = useState('paid');
  const [recordReference, setRecordReference] = useState('');
  const [recordNotes, setRecordNotes] = useState('');
  const [recordExtendDays, setRecordExtendDays] = useState(0);

  // Fetch shop full details
  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-shop-detail', id],
    queryFn: async () => {
      const res = await api.get(`/super-admin/shops/${id}/details`);
      return res.data?.data;
    },
    enabled: Boolean(id),
  });

  // Fetch all subscription plans for renewal options
  const { data: plansData } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const res = await api.get('/subscriptions/plans');
      return res.data?.data?.plans || [];
    },
  });

  const availablePlans: any[] = plansData || [];

  // Suspend / Reactivate Shop
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

  // Renewal Mutation
  const renewMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        shopId: id,
        planId: renewPlanId || data?.subscription?.planId?._id,
        durationMonths: Number(renewMonths),
        amount: Number(renewAmount),
        paymentStatus: renewPaymentStatus,
        paymentMethod: renewPaymentMethod,
        referenceNumber: renewReference,
        notes: renewNotes,
      };
      const res = await api.post('/super-admin/subscriptions/renew', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Subscription renewed successfully!');
      setIsRenewModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['super-admin-shop-detail', id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to renew subscription');
    },
  });

  // Record Payment Mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        subscriptionId: data?.subscription?._id,
        amount: Number(recordAmount),
        paymentMethod: recordPaymentMethod,
        paymentStatus: recordPaymentStatus,
        referenceNumber: recordReference,
        notes: recordNotes,
        extendDays: Number(recordExtendDays),
      };
      const res = await api.post('/super-admin/subscriptions/payments', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Subscription payment recorded successfully!');
      setIsRecordPaymentModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['super-admin-shop-detail', id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    },
  });

  // Reset Admin Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(
        `/super-admin/admins/${selectedAdminForPassword?._id}/reset-password`,
        { newPassword: newAdminPassword }
      );
      return res.data;
    },
    onSuccess: () => {
      toast.success('Admin password reset successfully!');
      setIsResetPasswordModalOpen(false);
      setNewAdminPassword('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse py-8">
        <div className="h-24 bg-white rounded-2xl border border-slate-200" />
        <div className="h-96 bg-white rounded-2xl border border-slate-200" />
      </div>
    );
  }

  const shop = data?.shop;
  const admins = data?.admins || [];
  const products = data?.products || [];
  const categories = data?.categories || [];
  const orders = data?.orders || [];
  const customers = data?.customers || [];
  const subscription = data?.subscription;
  const stats = data?.stats || { productCount: 0, orderCount: 0, customerCount: 0, totalShopOrderValue: 0 };
  const publicUrl = data?.publicUrl || `${window.location.origin}/${shop?.slug}`;

  const isSuspended = shop?.status === 'suspended';

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success('Shop catalogue URL copied to clipboard!');
  };

  const tabs = [
    { id: 'overview', label: '1. Overview', icon: Store },
    { id: 'profile', label: '2. Shop Profile', icon: Settings },
    { id: 'admins', label: `3. Shop Admins (${admins.length})`, icon: UserCheck },
    { id: 'subscription', label: '4. Subscription', icon: CreditCard },
    { id: 'products', label: `5. Products (${stats.productCount})`, icon: Package },
    { id: 'orders', label: `6. Orders (${stats.orderCount})`, icon: ShoppingBag },
    { id: 'customers', label: `7. Customers (${stats.customerCount})`, icon: Users },
    { id: 'payments', label: `8. Payment History (${subscription?.payments?.length || 0})`, icon: History },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Breadcrumb Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/superadmin/shops"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center gap-3">
            {shop?.logo ? (
              <img
                src={shop.logo}
                alt={shop.name}
                className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-sm"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-sm"
                style={{ backgroundColor: shop?.accentColor || '#4f46e5' }}
              >
                {shop?.name?.charAt(0).toUpperCase()}
              </div>
            )}
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
              <p className="text-xs text-slate-400 font-mono mt-0.5">/{shop?.slug}</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={copyUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Store Link
          </button>

          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold hover:bg-indigo-100 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Public Store
          </a>

          {isSuspended ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => reactivateMutation.mutate()}
              isLoading={reactivateMutation.isPending}
              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              Reactivate Shop
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm(`Are you sure you want to suspend "${shop?.name}"?`)) {
                  suspendMutation.mutate();
                }
              }}
              isLoading={suspendMutation.isPending}
              className="text-rose-700 border-rose-200 hover:bg-rose-50"
            >
              Suspend Shop
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex space-x-2 whitespace-nowrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: OVERVIEW                                           */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Products
              </span>
              <span className="text-2xl font-black text-slate-900 block">{stats.productCount}</span>
              <span className="text-[11px] text-slate-400">In wholesale catalogue</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Buyers
              </span>
              <span className="text-2xl font-black text-slate-900 block">{stats.customerCount}</span>
              <span className="text-[11px] text-slate-400">Guest & direct buyers</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Customer Orders
              </span>
              <span className="text-2xl font-black text-slate-900 block">{stats.orderCount}</span>
              <span className="text-[11px] text-slate-400">Placed on this catalogue</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Shop Wholesale GMV
              </span>
              <span className="text-2xl font-black text-slate-900 block">
                ₹{stats.totalShopOrderValue.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium block">
                Shop sales (Excluded from SaaS revenue)
              </span>
            </div>
          </div>

          {/* Subscription Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Active Subscription Tier
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {subscription?.planId?.name || subscription?.planSnapshot?.name || 'Standard Wholesale Plan'}
              </h3>
              <p className="text-xs text-slate-500">
                Price: ₹
                {(subscription?.planId?.price || subscription?.billingAmount || 0).toLocaleString('en-IN')} /{' '}
                {subscription?.planId?.billingInterval || 'period'} • Expiry:{' '}
                {subscription?.endDate ? new Date(subscription.endDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                icon={<CreditCard className="w-4 h-4" />}
                onClick={() => {
                  setRecordAmount(subscription?.planId?.price || 0);
                  setIsRecordPaymentModalOpen(true);
                }}
              >
                Record Payment
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={() => {
                  setRenewPlanId(subscription?.planId?._id || '');
                  setRenewAmount(subscription?.planId?.price || 0);
                  setIsRenewModalOpen(true);
                }}
              >
                Renew / Change Plan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: SHOP PROFILE                                       */}
      {/* ========================================================= */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
            <Store className="w-4 h-4 text-indigo-600" />
            Dealer Commercial & Address Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div>
              <span className="font-semibold text-slate-400 uppercase tracking-wider block">Shop Name</span>
              <span className="text-sm font-bold text-slate-900 block mt-0.5">{shop.name}</span>
            </div>

            <div>
              <span className="font-semibold text-slate-400 uppercase tracking-wider block">Legal Business Name</span>
              <span className="text-sm font-bold text-slate-900 block mt-0.5">
                {shop.businessName || shop.name}
              </span>
            </div>

            <div>
              <span className="font-semibold text-slate-400 uppercase tracking-wider block">Business Category</span>
              <span className="text-sm text-slate-800 block mt-0.5">
                {shop.businessCategory || 'Wholesale Supplier'}
              </span>
            </div>

            <div>
              <span className="font-semibold text-slate-400 uppercase tracking-wider block">GST Number</span>
              <span className="text-sm font-mono text-slate-800 block mt-0.5">
                {shop.gstNumber || 'Not Provided'}
              </span>
            </div>

            <div>
              <span className="font-semibold text-slate-400 uppercase tracking-wider block">WhatsApp Direct Desk</span>
              <span className="text-sm font-mono text-slate-800 block mt-0.5">
                {shop.whatsappNumber}
              </span>
            </div>

            <div>
              <span className="font-semibold text-slate-400 uppercase tracking-wider block">Contact Phone / Email</span>
              <span className="text-sm text-slate-800 block mt-0.5">
                {shop.contactPhone || 'N/A'} • {shop.email || 'N/A'}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <span className="font-semibold text-slate-400 uppercase tracking-wider block text-xs">
              Warehouse / Dispatch Address
            </span>
            <p className="text-xs text-slate-700 mt-1">
              {[
                shop.address?.addressLine1 || shop.address?.street,
                shop.address?.city,
                shop.address?.district,
                shop.address?.state,
                shop.address?.postalCode,
                shop.address?.country,
              ]
                .filter(Boolean)
                .join(', ') || 'No warehouse address entered.'}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <span className="font-semibold text-slate-400 uppercase tracking-wider block text-xs">
              Business Description
            </span>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {shop.description || 'No description provided.'}
            </p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SHOP ADMINS                                        */}
      {/* ========================================================= */}
      {activeTab === 'admins' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Assigned Shop Administrators
              </h2>
              <p className="text-xs text-slate-400">Managers authorized to run this shop catalogue</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Name & Role</th>
                  <th className="py-2.5 px-3">Login Email</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.map((adm: any) => (
                  <tr key={adm._id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block">{adm.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase">Shop Admin</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">{adm.email}</td>
                    <td className="py-3 px-3 text-slate-600">{adm.phone || '—'}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          adm.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {adm.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(adm.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<KeyRound className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setSelectedAdminForPassword(adm);
                          setIsResetPasswordModalOpen(true);
                        }}
                      >
                        Reset Password
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: SUBSCRIPTION                                       */}
      {/* ========================================================= */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
                  Subscription Tier
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                  {subscription?.planId?.name || subscription?.planSnapshot?.name || 'Custom Wholesale Tier'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setRenewPlanId(subscription?.planId?._id || '');
                    setRenewAmount(subscription?.planId?.price || 0);
                    setIsRenewModalOpen(true);
                  }}
                >
                  Renew / Change Plan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<CreditCard className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setRecordAmount(subscription?.planId?.price || 0);
                    setIsRecordPaymentModalOpen(true);
                  }}
                >
                  Record Payment
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block">
                  Status
                </span>
                <span className="text-sm font-black uppercase text-emerald-600 block mt-1">
                  {subscription?.status || 'Active'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block">
                  Billing Interval
                </span>
                <span className="text-sm font-bold text-slate-900 block mt-1 uppercase">
                  {subscription?.planId?.billingInterval || 'Monthly'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block">
                  Active Since
                </span>
                <span className="text-sm font-bold text-slate-900 block mt-1">
                  {subscription?.startDate ? new Date(subscription.startDate).toLocaleDateString() : '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block">
                  Expiry / Renewal Date
                </span>
                <span className="text-sm font-bold text-slate-900 block mt-1">
                  {subscription?.endDate ? new Date(subscription.endDate).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>

            {/* Plan Limits */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Configured Plan Limits & Privileges
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900 block">Product Quota</span>
                  <span>{subscription?.planId?.maxProducts === -1 ? 'Unlimited' : `${stats.productCount} / ${subscription?.planId?.maxProducts || 50}`}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900 block">Category Quota</span>
                  <span>{subscription?.planId?.maxCategories === -1 ? 'Unlimited' : `${categories.length} / ${subscription?.planId?.maxCategories || 10}`}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900 block">Administrator Accounts</span>
                  <span>{subscription?.planId?.maxAdmins === -1 ? 'Unlimited' : `${admins.length} / ${subscription?.planId?.maxAdmins || 1}`}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: PRODUCTS (THIS SHOP ONLY)                          */}
      {/* ========================================================= */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Wholesale Product Catalogue ({products.length} showing)
              </h2>
              <p className="text-xs text-slate-400">Products belonging exclusively to this shop</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Wholesale Price</th>
                  <th className="py-2.5 px-3">Stock Status</th>
                  <th className="py-2.5 px-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No products added by this shop yet.
                    </td>
                  </tr>
                ) : (
                  products.map((p: any) => (
                    <tr key={p._id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-semibold text-slate-900">{p.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{p.sku}</td>
                      <td className="py-3 px-3 text-slate-600">{p.categoryId?.name || 'General'}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">₹{p.price?.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                          {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: ORDERS (THIS SHOP ONLY — ZERO ON MAIN DASHBOARD)   */}
      {/* ========================================================= */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Shop Product Orders ({orders.length} showing)
              </h2>
              <p className="text-xs text-slate-400">
                Wholesale customer orders received by this shop (Inspected here in Shop Details only)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Order No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer Details</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3">Bill Total</th>
                  <th className="py-2.5 px-3">Fulfillment</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No customer orders placed in this shop yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord: any) => (
                    <tr key={ord._id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{ord.orderNumber}</td>
                      <td className="py-3 px-3 text-slate-500">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900 block">
                          {ord.deliveryAddress?.fullName || ord.customerSnapshot?.name}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {ord.deliveryAddress?.phone || ord.customerSnapshot?.phone}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {ord.items?.length || 0} item(s)
                      </td>
                      <td className="py-3 px-3 font-black text-slate-900">
                        ₹{ord.grandTotal?.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3">
                        <Badge status={ord.orderStatus} type="order" />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => setSelectedOrderDetails(ord)}
                        >
                          View Bill
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: CUSTOMERS (THIS SHOP ONLY)                         */}
      {/* ========================================================= */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Wholesale Buyers Directory ({customers.length} buyers)
              </h2>
              <p className="text-xs text-slate-400">Buyers who have submitted orders to this shop</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Customer / Buyer</th>
                  <th className="py-2.5 px-3">Phone Number</th>
                  <th className="py-2.5 px-3">Business Name</th>
                  <th className="py-2.5 px-3">Total Orders</th>
                  <th className="py-2.5 px-3">Total Spent</th>
                  <th className="py-2.5 px-3">Last Order Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No customer records yet for this shop.
                    </td>
                  </tr>
                ) : (
                  customers.map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-bold text-slate-900">{c.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">{c.phone}</td>
                      <td className="py-3 px-3 text-slate-600">{c.businessName || '—'}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{c.totalOrders}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">₹{c.totalSpent.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-slate-500">
                        {new Date(c.lastOrderDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 8: PAYMENTS & HISTORY (SUBSCRIPTION REVENUE HISTORY)  */}
      {/* ========================================================= */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Cataloza Platform Subscription Payments
              </h2>
              <p className="text-xs text-slate-400">
                Financial records of plan payments received from this dealer
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<PlusCircle className="w-3.5 h-3.5" />}
              onClick={() => {
                setRecordAmount(subscription?.planId?.price || 0);
                setIsRecordPaymentModalOpen(true);
              }}
            >
              Record Payment
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Plan Name</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Payment Method</th>
                  <th className="py-2.5 px-3">Reference / UTR</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!subscription?.payments || subscription.payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No subscription payments recorded for this shop yet.
                    </td>
                  </tr>
                ) : (
                  subscription.payments.map((p: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 text-slate-700">
                        {new Date(p.paymentDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">{p.planName || 'Plan Fee'}</td>
                      <td className="py-3 px-3 font-black text-slate-900">
                        ₹{p.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 uppercase text-slate-600 font-semibold">
                        {p.paymentMethod?.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">{p.referenceNumber || '—'}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {p.paymentStatus?.toUpperCase() || 'PAID'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{p.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: RENEW / CHANGE SUBSCRIPTION PLAN                 */}
      {/* ========================================================= */}
      <Modal
        isOpen={isRenewModalOpen}
        onClose={() => setIsRenewModalOpen(false)}
        title="Renew or Upgrade Subscription Plan"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Subscription Plan</label>
            <select
              value={renewPlanId}
              onChange={(e) => {
                setRenewPlanId(e.target.value);
                const p = availablePlans.find((plan) => plan._id === e.target.value);
                if (p) setRenewAmount(p.price);
              }}
              className="w-full rounded-xl border border-slate-300 p-2.5 bg-white font-semibold"
            >
              <option value="">-- Keep Current Plan --</option>
              {availablePlans.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} (₹{p.price.toLocaleString('en-IN')} / {p.billingInterval})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Duration (Months)</label>
              <Input
                type="number"
                min={1}
                value={renewMonths}
                onChange={(e) => setRenewMonths(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Billing Amount (₹)</label>
              <Input
                type="number"
                min={0}
                value={renewAmount}
                onChange={(e) => setRenewAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Status</label>
              <select
                value={renewPaymentStatus}
                onChange={(e) => setRenewPaymentStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 bg-white font-bold"
              >
                <option value="paid">✅ Confirmed Paid</option>
                <option value="pending">⏳ Pending Payment</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={renewPaymentMethod}
                onChange={(e) => setRenewPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 bg-white"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Transaction UTR / Reference</label>
            <Input
              value={renewReference}
              onChange={(e) => setRenewReference(e.target.value)}
              placeholder="e.g. UTR-98240284"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes</label>
            <Input
              value={renewNotes}
              onChange={(e) => setRenewNotes(e.target.value)}
              placeholder="Contract extension details"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsRenewModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => renewMutation.mutate()}
              isLoading={renewMutation.isPending}
            >
              Confirm Subscription Renewal
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: RECORD MANUAL PAYMENT                            */}
      {/* ========================================================= */}
      <Modal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        title="Record Subscription Payment"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Amount (₹)</label>
              <Input
                type="number"
                min={0}
                value={recordAmount}
                onChange={(e) => setRecordAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Extend Expiry (Days)</label>
              <Input
                type="number"
                min={0}
                value={recordExtendDays}
                onChange={(e) => setRecordExtendDays(Number(e.target.value))}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Status</label>
              <select
                value={recordPaymentStatus}
                onChange={(e) => setRecordPaymentStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 bg-white font-bold"
              >
                <option value="paid">✅ Paid (Increases Platform Revenue)</option>
                <option value="pending">⏳ Pending Payment</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={recordPaymentMethod}
                onChange={(e) => setRecordPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 bg-white"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reference / UTR Number</label>
            <Input
              value={recordReference}
              onChange={(e) => setRecordReference(e.target.value)}
              placeholder="e.g. UTR-98240284"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Accounting Notes</label>
            <Input
              value={recordNotes}
              onChange={(e) => setRecordNotes(e.target.value)}
              placeholder="e.g. Cheque clearance / Bank deposit"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsRecordPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => recordPaymentMutation.mutate()}
              isLoading={recordPaymentMutation.isPending}
            >
              Save Payment Record
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 3: RESET ADMIN PASSWORD                             */}
      {/* ========================================================= */}
      <Modal
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        title={`Reset Password for ${selectedAdminForPassword?.name}`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-500">
            Enter a new password for <strong className="text-slate-800">{selectedAdminForPassword?.email}</strong>. Previous login tokens and active sessions will be invalidated immediately.
          </p>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Password (Min 8 chars)</label>
            <Input
              type="password"
              value={newAdminPassword}
              onChange={(e) => setNewAdminPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsResetPasswordModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => resetPasswordMutation.mutate()}
              isLoading={resetPasswordMutation.isPending}
            >
              Update Password
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 4: ORDER DETAILS VIEW BILL                          */}
      {/* ========================================================= */}
      <Modal
        isOpen={Boolean(selectedOrderDetails)}
        onClose={() => setSelectedOrderDetails(null)}
        title={`Order Details: ${selectedOrderDetails?.orderNumber}`}
      >
        {selectedOrderDetails && (
          <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block font-semibold">Buyer Name</span>
                <span className="font-bold text-slate-900 block">
                  {selectedOrderDetails.deliveryAddress?.fullName || selectedOrderDetails.customerSnapshot?.name}
                </span>
                <span className="text-slate-500 font-mono">
                  {selectedOrderDetails.deliveryAddress?.phone || selectedOrderDetails.customerSnapshot?.phone}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-semibold">Order Total</span>
                <span className="text-base font-black text-slate-900 block">
                  ₹{selectedOrderDetails.grandTotal?.toLocaleString('en-IN')}
                </span>
                <Badge status={selectedOrderDetails.orderStatus} type="order" />
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-800 block mb-2">Delivery Address</span>
              <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {[
                  selectedOrderDetails.deliveryAddress?.addressLine1 || selectedOrderDetails.deliveryAddress?.street,
                  selectedOrderDetails.deliveryAddress?.city,
                  selectedOrderDetails.deliveryAddress?.district,
                  selectedOrderDetails.deliveryAddress?.state,
                  selectedOrderDetails.deliveryAddress?.postalCode,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-800 block mb-2">Items Ordered</span>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {selectedOrderDetails.items?.map((item: any, i: number) => (
                  <div key={i} className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900 block">{item.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {item.quantity} x ₹{item.price} • SKU: {item.sku || 'N/A'}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900">
                      ₹{(item.quantity * item.price).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedOrderDetails(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
