import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { IShopSubscription, ISubscriptionPlan, IShop } from '../../types';
import { Button } from '../../components/common/Button';

export const SubscriptionAssignmentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSubForPayment, setSelectedSubForPayment] = useState<IShopSubscription | null>(null);

  // Assign Form
  const [selectedShopId, setSelectedShopId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [assignStatus, setAssignStatus] = useState('active');

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState<number>(2999);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [extendDays, setExtendDays] = useState<number>(30);
  const [paymentNotes, setPaymentNotes] = useState('');

  // Fetch subscriptions
  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: ['subscription-assignments'],
    queryFn: async () => {
      const res = await api.get('/subscriptions/assignments');
      return res.data?.data?.assignments as IShopSubscription[];
    },
  });

  // Fetch shops
  const { data: shopsData } = useQuery({
    queryKey: ['all-shops-for-sub'],
    queryFn: async () => {
      const res = await api.get('/super-admin/shops?limit=100');
      return res.data?.data?.shops as IShop[];
    },
  });

  // Fetch plans
  const { data: plansData } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const res = await api.get('/subscriptions/plans');
      return res.data?.data?.plans as ISubscriptionPlan[];
    },
  });

  // Assign Plan Mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/subscriptions/assign', {
        shopId: selectedShopId,
        planId: selectedPlanId,
        endDate: customEndDate ? new Date(customEndDate) : undefined,
        status: assignStatus,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Subscription plan assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['subscription-assignments'] });
      setIsAssignModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to assign plan');
    },
  });

  // Record Payment Mutation
  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSubForPayment) return;
      const res = await api.post('/subscriptions/record-payment', {
        subscriptionId: selectedSubForPayment._id,
        amount: paymentAmount,
        paymentMethod,
        referenceNumber: paymentRef,
        extendDays,
        notes: paymentNotes,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Payment recorded and subscription renewed!');
      queryClient.invalidateQueries({ queryKey: ['subscription-assignments'] });
      setIsPaymentModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    },
  });

  const assignments = assignmentsData || [];
  const filteredAssignments = assignments.filter((sub) => {
    const shopName = (sub.shopId as any)?.name || '';
    const planName = (sub.planId as any)?.name || '';
    const matchesSearch =
      shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      planName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
              <Receipt className="w-3 h-3" /> Shop Billing & Licenses
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Subscription Assignments
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage active shop subscriptions, extend validity, and record verified manual payments.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            if (shopsData && shopsData.length > 0) setSelectedShopId(shopsData[0]._id);
            if (plansData && plansData.length > 0) setSelectedPlanId(plansData[0]._id);
            setIsAssignModalOpen(true);
          }}
        >
          Assign / Change Plan
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by shop name or plan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs bg-transparent focus:outline-none placeholder-slate-400 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Wholesale Shop</th>
                <th className="py-3 px-4">Assigned Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Total Payments</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Loading subscription assignments...
                  </td>
                </tr>
              ) : filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No matching shop subscriptions found.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((sub) => {
                  const shop = sub.shopId as any;
                  const plan = sub.planId as any;
                  const payments = sub.payments || [];
                  const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

                  const endDate = sub.endDate ? new Date(sub.endDate) : null;
                  const isExpired = endDate && endDate < new Date();

                  return (
                    <tr key={sub._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{shop?.name || 'Unnamed Shop'}</div>
                        <div className="text-[11px] text-slate-400">/{shop?.slug}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{plan?.name || 'Starter Plan'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          ₹{plan?.price || 0} / {plan?.billingInterval || 'mo'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            sub.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : sub.status === 'trialing'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : sub.status === 'suspended'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isExpired ? 'Expired' : sub.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="py-3.5 px-4">
                        <div
                          className={`font-medium ${
                            isExpired ? 'text-rose-600 font-bold' : 'text-slate-800'
                          }`}
                        >
                          {endDate ? endDate.toLocaleDateString() : 'N/A'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        ₹{totalPaid.toLocaleString('en-IN')} ({payments.length})
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSubForPayment(sub);
                            setPaymentAmount(plan?.price || 2999);
                            setIsPaymentModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                        >
                          + Record Payment
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Plan Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Assign Plan to Shop</h3>
            <p className="text-xs text-slate-500 mb-4">
              Select the shop and the subscription plan to assign.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                assignMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Shop *</label>
                <select
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white"
                  required
                >
                  {(shopsData || []).map((shop) => (
                    <option key={shop._id} value={shop._id}>
                      {shop.name} (/{shop.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subscription Tier *
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white"
                  required
                >
                  {(plansData || []).map((plan) => (
                    <option key={plan._id} value={plan._id}>
                      {plan.name} — ₹{plan.price}/{plan.billingInterval}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={assignStatus}
                    onChange={(e) => setAssignStatus(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="trialing">Trialing</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom Expiry (Optional)
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAssignModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={assignMutation.isPending}
                >
                  Apply Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentModalOpen && selectedSubForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Record Subscription Payment</h3>
            <p className="text-xs text-slate-500 mb-4">
              Recording verified bank transfer, UPI, or cheque payment for{' '}
              <span className="font-bold text-slate-800">
                {(selectedSubForPayment.shopId as any)?.name}
              </span>
              .
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                paymentMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount Paid (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white"
                  >
                    <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="upi">UPI / QR Code</option>
                    <option value="cash">Cash Settlement</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transaction / UTR Ref
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-987123654"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full text-xs font-mono rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Extend Validity (Days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={extendDays}
                    onChange={(e) => setExtendDays(Number(e.target.value))}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Notes</label>
                <textarea
                  rows={2}
                  placeholder="Invoice number, billing contact, verified by..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={paymentMutation.isPending}
                >
                  Confirm & Renew
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
