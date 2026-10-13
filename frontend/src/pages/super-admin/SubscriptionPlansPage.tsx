import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Plus,
  Check,
  X,
  Edit2,
  Sparkles,
  Layers,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { ISubscriptionPlan } from '../../types';
import { Button } from '../../components/common/Button';

export const SubscriptionPlansPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ISubscriptionPlan | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(999);
  const [currency, setCurrency] = useState('INR');
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [trialDays, setTrialDays] = useState(14);
  const [maxProducts, setMaxProducts] = useState(50);
  const [maxCategories, setMaxCategories] = useState(10);
  const [allowCustomProductFields, setAllowCustomProductFields] = useState(false);
  const [allowAnalytics, setAllowAnalytics] = useState(false);
  const [allowExportInvoices, setAllowExportInvoices] = useState(true);
  const [featuresStr, setFeaturesStr] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const res = await api.get('/subscriptions/plans');
      return res.data?.data?.plans as ISubscriptionPlan[];
    },
  });

  const openCreateModal = () => {
    setEditingPlan(null);
    setName('');
    setCode('');
    setDescription('');
    setPrice(999);
    setCurrency('INR');
    setBillingInterval('monthly');
    setTrialDays(14);
    setMaxProducts(50);
    setMaxCategories(10);
    setAllowCustomProductFields(false);
    setAllowAnalytics(false);
    setAllowExportInvoices(true);
    setFeaturesStr('Up to 50 active products\n10 categories\nWhatsApp ordering\nStandard PDF invoices');
    setIsModalOpen(true);
  };

  const openEditModal = (plan: ISubscriptionPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setCode(plan.code);
    setDescription(plan.description);
    setPrice(plan.price);
    setCurrency(plan.currency);
    setBillingInterval(plan.billingInterval);
    setTrialDays(plan.trialDays);
    setMaxProducts(plan.maxProducts);
    setMaxCategories(plan.maxCategories);
    setAllowCustomProductFields(plan.allowCustomProductFields);
    setAllowAnalytics(plan.allowAnalytics);
    setAllowExportInvoices(plan.allowExportInvoices);
    setFeaturesStr((plan.features || []).join('\n'));
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const features = featuresStr
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name,
        code,
        description,
        price,
        currency,
        billingInterval,
        trialDays,
        maxProducts,
        maxCategories,
        allowCustomProductFields,
        allowAnalytics,
        allowExportInvoices,
        features,
      };

      if (editingPlan) {
        return api.patch(`/subscriptions/plans/${editingPlan._id}`, payload);
      } else {
        return api.post('/subscriptions/plans', payload);
      }
    },
    onSuccess: () => {
      toast.success(editingPlan ? 'Plan updated successfully' : 'Plan created successfully');
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save plan');
    },
  });

  const plans = data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> Monetization Architecture
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Subscription Plans & Tiers
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure wholesale plan pricing, catalog limits, and premium feature permissions.
          </p>
        </div>

        <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
          Create Subscription Tier
        </Button>
      </div>

      {/* Plans Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <CreditCard className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No subscription plans found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Initialize your platform tiers to start offering wholesale subscriptions.
          </p>
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            Create Initial Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const isUnlimited = plan.maxProducts === -1;

            return (
              <div
                key={plan._id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                      {plan.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditModal(plan)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 min-h-[32px] line-clamp-2">
                    {plan.description || 'Commercial tier for wholesale suppliers.'}
                  </p>

                  <div className="mt-4 mb-6 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">
                      ₹{plan.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-500 uppercase font-semibold">
                      / {plan.billingInterval}
                    </span>
                  </div>

                  {/* Core Limits Summary */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 mb-6 text-xs text-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Max Products</span>
                      <span className="font-bold text-slate-900">
                        {isUnlimited ? 'Unlimited' : `${plan.maxProducts} products`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Max Categories</span>
                      <span className="font-bold text-slate-900">
                        {plan.maxCategories === -1 ? 'Unlimited' : `${plan.maxCategories} categories`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Custom Form Fields</span>
                      <span className="font-bold">
                        {plan.allowCustomProductFields ? (
                          <span className="text-emerald-600">Included</span>
                        ) : (
                          <span className="text-slate-400">Locked</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Free Trial Days</span>
                      <span className="font-bold text-slate-900">{plan.trialDays} days</span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Included Features
                    </h4>
                    {(plan.features || []).map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    Enforced at API Gateway
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {editingPlan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Configure parameters that control shop capacity and feature authorizations.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Professional"
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. PLAN_PRO"
                    className="w-full text-xs font-mono rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Target supplier business type..."
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Interval</label>
                  <select
                    value={billingInterval}
                    onChange={(e) => setBillingInterval(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one-time">One-time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trial Days</label>
                  <input
                    type="number"
                    min={0}
                    value={trialDays}
                    onChange={(e) => setTrialDays(Number(e.target.value))}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Products (-1 for Unlimited)
                  </label>
                  <input
                    type="number"
                    value={maxProducts}
                    onChange={(e) => setMaxProducts(Number(e.target.value))}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Categories (-1 for Unlimited)
                  </label>
                  <input
                    type="number"
                    value={maxCategories}
                    onChange={(e) => setMaxCategories(Number(e.target.value))}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowCustomProductFields}
                    onChange={(e) => setAllowCustomProductFields(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-xs text-slate-700">
                    Allow Dynamic Custom Product Form Builder specifications
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowAnalytics}
                    onChange={(e) => setAllowAnalytics(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-xs text-slate-700">Allow Advanced Sales Analytics</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bullet Features (One per line)
                </label>
                <textarea
                  rows={4}
                  value={featuresStr}
                  onChange={(e) => setFeaturesStr(e.target.value)}
                  placeholder="Feature line 1&#10;Feature line 2&#10;Feature line 3"
                  className="w-full text-xs font-mono rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={saveMutation.isPending}>
                  {editingPlan ? 'Save Plan Changes' : 'Create Plan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
