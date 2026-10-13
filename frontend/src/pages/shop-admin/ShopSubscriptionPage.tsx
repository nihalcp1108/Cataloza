import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Package,
  Layers,
  Sparkles,
  PhoneCall,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../api/client';
import { IShopSubscriptionDetails } from '../../types';

export const ShopSubscriptionPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['my-shop-subscription'],
    queryFn: async () => {
      const res = await api.get('/shop-admin/subscription');
      return res.data?.data as IShopSubscriptionDetails;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-100 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-100 rounded-2xl" />
          <div className="h-64 bg-slate-100 rounded-2xl md:col-span-2" />
        </div>
      </div>
    );
  }

  const sub = data?.subscription;
  const plan = data?.plan;
  const usage = data?.usage || { productCount: 0, maxProducts: 50, categoryCount: 0, maxCategories: 10 };
  const permissions = data?.permissions;
  const daysRemaining = data?.daysRemaining ?? 0;
  const status = data?.status || 'active';

  const productPercent =
    usage.maxProducts === -1 ? 15 : Math.min(100, Math.round((usage.productCount / usage.maxProducts) * 100));

  const isNearLimit = usage.maxProducts !== -1 && usage.productCount >= usage.maxProducts * 0.8;
  const isExpired = status === 'expired';
  const isSuspended = status === 'suspended';

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if Warning */}
      {isSuspended ? (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Wholesale Shop Suspended</h4>
            <p className="text-xs mt-0.5 text-rose-700">
              Your storefront and catalogue modifications have been temporarily locked by platform administration. Contact support to resolve compliance requirements.
            </p>
          </div>
        </div>
      ) : isExpired ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3">
          <Clock className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Subscription License Expired</h4>
            <p className="text-xs mt-0.5 text-amber-700">
              Your subscription period ended. Adding new products is disabled until payment is recorded for renewal.
            </p>
          </div>
        </div>
      ) : null}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <CreditCard className="w-3 h-3" /> Shop License & Capacity
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Subscription & Usage Limits
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Review active tier capacity, quota utilization, and payment history.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Active Plan Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
              {plan?.code || 'COMMERCIAL_TIER'}
            </span>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : status === 'trialing'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {status}
            </span>
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900">{plan?.name || 'Starter Wholesale'}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {plan?.description || 'Active wholesale merchant subscription.'}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-baseline gap-1">
            <span className="text-3xl font-black text-slate-900">
              ₹{(plan?.price || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500 font-semibold uppercase">
              / {plan?.billingInterval || 'month'}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Next Renewal / Expiry</span>
              </span>
              <span className="font-bold text-slate-900">
                {sub?.endDate ? new Date(sub.endDate).toLocaleDateString() : 'Active'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Validity Remaining</span>
              </span>
              <span className="font-bold text-slate-900">
                {isExpired ? '0 days (Expired)' : `${daysRemaining} days`}
              </span>
            </div>
          </div>

          {/* Contact Support for Upgrade */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
              <PhoneCall className="w-4 h-4 text-blue-600" />
              <span>Need to upgrade product limits?</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Contact your platform administrator or account representative to upgrade to Professional or Enterprise tiers.
            </p>
          </div>
        </div>

        {/* Capacity & Quotas Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              Live Quota Utilization
            </h3>

            {/* Products Quota */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-blue-600" />
                  Product Catalog Capacity
                </span>
                <span className="font-semibold text-slate-600">
                  {usage.productCount} / {usage.maxProducts === -1 ? 'Unlimited' : usage.maxProducts}{' '}
                  used
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isNearLimit ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${productPercent}%` }}
                />
              </div>
              {isNearLimit && (
                <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Approaching plan capacity limit.
                </p>
              )}
            </div>

            {/* Categories Quota */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Product Categories
                </span>
                <span className="font-semibold text-slate-600">
                  {usage.categoryCount} / {usage.maxCategories === -1 ? 'Unlimited' : usage.maxCategories}{' '}
                  created
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full"
                  style={{
                    width: `${
                      usage.maxCategories === -1
                        ? 20
                        : Math.min(100, (usage.categoryCount / usage.maxCategories) * 100)
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Feature Authorizations */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 mb-3">Feature Authorizations</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-slate-700">Authoritative WhatsApp Checkout</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-slate-700">Commercial PDF Invoices</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  {permissions?.allowCustomProductFields ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                  <span className="text-slate-700">
                    Custom Dynamic Form Specifications{' '}
                    {!permissions?.allowCustomProductFields && '(Pro Plan)'}
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  {permissions?.allowAnalytics ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                  <span className="text-slate-700">
                    Advanced Sales Metrics {!permissions?.allowAnalytics && '(Pro Plan)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recorded Payments History */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>Recorded Payment Settlements</span>
              <span className="text-xs text-slate-400 font-normal">
                Verified by Platform Administration
              </span>
            </h3>

            {(sub?.payments || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No recorded payments on file for this subscription.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {(sub?.payments || []).map((pay: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">
                        ₹{pay.amount?.toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">
                          ({pay.paymentMethod})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Ref: {pay.referenceNumber || 'N/A'}
                      </div>
                    </div>
                    <div className="text-slate-500 font-medium">
                      {pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
