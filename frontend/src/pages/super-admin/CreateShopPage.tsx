import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  Store,
  User,
  MessageCircle,
  MapPin,
  CheckCircle2,
  Copy,
  ExternalLink,
  CreditCard,
  Check,
  Percent,
  Sparkles,
  Layers,
  Calendar,
} from 'lucide-react';
import { api } from '../../api/client';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ISubscriptionPlan } from '../../types';

const reservedSlugs = [
  'admin',
  'superadmin',
  'login',
  'register',
  'cart',
  'checkout',
  'orders',
  'my-orders',
  'account',
  'profile',
  'api',
  'products',
  'categories',
  'settings',
  'dashboard',
  'auth',
  'privacy-policy',
  'terms',
  '404',
];

const createShopFormSchema = z.object({
  // Section A: Shop Details
  name: z.string().min(2, 'Shop name must be at least 2 characters').max(120),
  businessName: z.string().max(150).optional(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens (e.g. abc-wholesale)')
    .refine((s) => !reservedSlugs.includes(s), {
      message: 'This slug is reserved by the platform',
    }),
  businessCategory: z.string().optional(),
  description: z.string().max(1000).optional(),
  contactPhone: z.string().optional(),
  whatsappNumber: z
    .string()
    .min(7, 'WhatsApp number is required')
    .regex(/^\+?[1-9]\d{6,14}$/, 'Must be a valid international number with country code (e.g. 919876543210)'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  gstNumber: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('India'),
  accentColor: z.string().default('#2563eb'),

  // Section B: Shop Admin Details
  adminName: z.string().min(2, 'Admin full name is required'),
  adminEmail: z.string().email('Invalid admin email address').toLowerCase().trim(),
  adminPhone: z.string().optional(),
  adminPassword: z.string().min(8, 'Admin password must be at least 8 characters'),

  // Section C: Subscription Plan
  planId: z.string().min(1, 'Please select a subscription plan'),
  startDate: z.string().default(() => new Date().toISOString().split('T')[0]),

  // Section D: Payment Details
  discount: z.number().min(0).default(0),
  paymentStatus: z.enum(['paid', 'pending']).default('paid'),
  paymentMethod: z.enum(['bank_transfer', 'upi', 'cash', 'card', 'cheque', 'other']).default('bank_transfer'),
  transactionReference: z.string().optional(),
  paymentNotes: z.string().optional(),
});

type CreateShopFormData = z.infer<typeof createShopFormSchema>;

export const CreateShopPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdShopResult, setCreatedShopResult] = useState<any | null>(null);
  const [plans, setPlans] = useState<ISubscriptionPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateShopFormData>({
    resolver: zodResolver(createShopFormSchema),
    defaultValues: {
      accentColor: '#2563eb',
      country: 'India',
      paymentStatus: 'paid',
      paymentMethod: 'bank_transfer',
      discount: 0,
      startDate: new Date().toISOString().split('T')[0],
    },
  });

  const slugValue = watch('slug') || '';
  const selectedPlanId = watch('planId');
  const discountValue = Number(watch('discount')) || 0;
  const paymentStatusValue = watch('paymentStatus');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setIsLoadingPlans(true);
        const res = await api.get('/subscriptions/plans');
        if (res.data?.success) {
          const loadedPlans = res.data.data.plans || [];
          setPlans(loadedPlans);
          if (loadedPlans.length > 0 && !selectedPlanId) {
            setValue('planId', loadedPlans[0]._id);
          }
        }
      } catch {
        toast.error('Could not load subscription plans');
      } finally {
        setIsLoadingPlans(false);
      }
    };
    fetchPlans();
  }, [setValue, selectedPlanId]);

  const selectedPlan = plans.find((p) => p._id === selectedPlanId);
  const planPrice = selectedPlan?.price || 0;
  const finalPayable = Math.max(0, planPrice - discountValue);

  // Auto-generate slug when name changes if slug is empty
  const handleNameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!slugValue && e.target.value) {
      const generated = e.target.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setValue('slug', generated, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: CreateShopFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: data.name,
        businessName: data.businessName || data.name,
        slug: data.slug,
        description: data.description,
        businessCategory: data.businessCategory || 'Wholesale Distribution',
        gstNumber: data.gstNumber,
        contactPhone: data.contactPhone,
        whatsappNumber: data.whatsappNumber.replace(/[^0-9]/g, ''),
        email: data.email || undefined,
        address: {
          addressLine1: data.street,
          street: data.street,
          city: data.city,
          district: data.district,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
        },
        accentColor: data.accentColor,
        adminName: data.adminName,
        adminEmail: data.adminEmail,
        adminPhone: data.adminPhone,
        adminPassword: data.adminPassword,

        // Subscription & Payment Details
        planId: data.planId,
        billingAmount: finalPayable,
        discount: discountValue,
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod,
        transactionReference: data.transactionReference || `TXN-${Date.now()}`,
        paymentNotes: data.paymentNotes,
        startDate: data.startDate,
      };

      const res = await api.post('/super-admin/shops', payload);
      if (res.data?.success) {
        toast.success('Shop created, Subscription assigned, and Admin provisioned successfully!');
        setCreatedShopResult(res.data.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create shop');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdShopResult) {
    const publicUrl = `${window.location.origin}/${createdShopResult.shop.slug}`;
    const sub = createdShopResult.subscription;
    return (
      <div className="max-w-2xl mx-auto py-10 text-center">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900">Wholesale Shop & Subscription Live!</h2>
            <p className="text-xs text-slate-500 mt-1">
              {createdShopResult.shop.name} is now provisioned with an active subscription.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3 text-xs">
            <div>
              <span className="font-bold text-slate-700 block">Public Catalogue URL:</span>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
              >
                {publicUrl} <ExternalLink className="w-3.5 h-3.5 inline" />
              </a>
            </div>

            <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2">
              <div>
                <span className="font-bold text-slate-700 block">Subscription Plan:</span>
                <span className="text-slate-600 font-medium">
                  {sub?.planSnapshot?.name || 'Assigned Plan'} (₹{sub?.billingAmount?.toLocaleString('en-IN')})
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-700 block">Payment Status:</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                    sub?.paymentStatus === 'paid'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {sub?.paymentStatus?.toUpperCase() || 'PAID'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-700 block">Assigned Shop Administrator:</span>
              <span className="text-slate-600">
                {createdShopResult.admin.name} ({createdShopResult.admin.email})
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              icon={<Copy className="w-4 h-4" />}
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                toast.success('Public URL copied to clipboard!');
              }}
            >
              Copy Public URL
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => navigate('/superadmin/shops')}>
              View in Shops List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/superadmin/shops"
          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Provision Wholesale Shop</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure shop profile, assign subscription tier, record payment, and provision administrator.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* SECTION A — SHOP DETAILS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <Store className="w-4 h-4 text-indigo-600" />
            Section A — Shop & Business Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Shop Public Name"
              placeholder="e.g. ABC Ceramics & Hardware"
              error={errors.name?.message}
              {...register('name', { onBlur: handleNameBlur })}
            />

            <Input
              label="Registered Business / Legal Name"
              placeholder="e.g. ABC Distributors Pvt Ltd"
              error={errors.businessName?.message}
              {...register('businessName')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Unique Catalogue URL Slug"
              placeholder="e.g. abc-ceramics"
              helperText={`Final URL: ${window.location.origin}/${slugValue || 'your-slug'}`}
              error={errors.slug?.message}
              {...register('slug')}
            />

            <Input
              label="Business Category"
              placeholder="e.g. Building Materials, Textiles, Electronics"
              error={errors.businessCategory?.message}
              {...register('businessCategory')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Wholesale Business Description
            </label>
            <textarea
              rows={2}
              placeholder="Describe product categories, distribution territory, and minimum order policies..."
              className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="WhatsApp Ordering Number"
              placeholder="919876543210 (country code + digits)"
              helperText="Prefilled order bills will be sent to this line."
              error={errors.whatsappNumber?.message}
              {...register('whatsappNumber')}
            />

            <Input
              label="Contact Phone"
              placeholder="+91 98765 43210"
              {...register('contactPhone')}
            />

            <Input
              label="Business Email"
              type="email"
              placeholder="orders@business.com"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          {/* Address Details */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <span className="text-xs font-bold text-slate-700 block">Warehouse / Depot Address</span>
            <Input
              label="Street Address / Industrial Plot"
              placeholder="Plot 42, Central Industrial Area"
              {...register('street')}
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input label="City" placeholder="City" {...register('city')} />
              <Input label="District" placeholder="District" {...register('district')} />
              <Input label="State" placeholder="State" {...register('state')} />
              <Input label="PIN Code" placeholder="PIN Code" {...register('postalCode')} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="GST Number (Optional)"
                placeholder="29ABCDE1234F1Z5"
                {...register('gstNumber')}
              />
            </div>
          </div>
        </div>

        {/* SECTION B — SHOP ADMIN DETAILS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            Section B — Initial Shop Administrator
          </h2>

          <p className="text-xs text-slate-500">
            This account will be created with <strong className="text-slate-700">shop_admin</strong> privileges scoped exclusively to this dealer's catalogue.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Administrator Full Name"
              placeholder="e.g. Ramesh Sharma"
              error={errors.adminName?.message}
              {...register('adminName')}
            />

            <Input
              label="Admin Login Email"
              type="email"
              placeholder="admin@business.com"
              error={errors.adminEmail?.message}
              {...register('adminEmail')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Admin Password"
              type="password"
              placeholder="Min. 8 characters"
              error={errors.adminPassword?.message}
              {...register('adminPassword')}
            />

            <Input
              label="Admin Mobile Phone"
              placeholder="+91 98765 43210"
              {...register('adminPhone')}
            />
          </div>
        </div>

        {/* SECTION C — SUBSCRIPTION PLAN SELECTION (CRITICAL REQUIREMENT) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Section C — Cataloza Subscription Plan
            </h2>
            <span className="text-xs font-semibold text-indigo-600">Select Plan Tier</span>
          </div>

          {isLoadingPlans ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading subscription plans...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const isSelected = selectedPlanId === plan._id;
                return (
                  <div
                    key={plan._id}
                    onClick={() => setValue('planId', plan._id, { shouldValidate: true })}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all relative ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-sm ring-2 ring-indigo-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-900 block">{plan.name}</span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-black text-slate-900">
                        ₹{plan.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">
                        /{plan.billingInterval}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
                      <div>
                        • Up to {plan.maxProducts === -1 ? 'Unlimited' : plan.maxProducts} Products
                      </div>
                      <div>
                        • Up to {plan.maxCategories === -1 ? 'Unlimited' : plan.maxCategories} Categories
                      </div>
                      {plan.features?.slice(0, 2).map((feat, i) => (
                        <div key={i}>• {feat}</div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {errors.planId && (
            <p className="text-xs text-rose-600 font-medium">{errors.planId.message}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Input
              label="Subscription Start Date"
              type="date"
              {...register('startDate')}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Calculated Expiry & Renewal
              </label>
              <div className="text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-medium">
                {selectedPlan?.billingInterval === 'yearly'
                  ? 'Valid for 1 Year from activation'
                  : selectedPlan?.billingInterval === 'quarterly'
                  ? 'Valid for 3 Months from activation'
                  : 'Valid for 1 Month from activation'}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION D — PAYMENT DETAILS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            Section D — Subscription Payment Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Plan Amount
              </label>
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-900">
                ₹{planPrice.toLocaleString('en-IN')}
              </div>
            </div>

            <div>
              <Input
                label="Discount (₹)"
                type="number"
                placeholder="0"
                min={0}
                {...register('discount', { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Final Payable Amount
              </label>
              <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-black text-emerald-800">
                ₹{finalPayable.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Collection Status
              </label>
              <select
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 font-semibold"
                {...register('paymentStatus')}
              >
                <option value="paid">✅ Payment Received & Confirmed (Increases Revenue)</option>
                <option value="pending">⏳ Payment Pending (Does NOT count in revenue yet)</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-400">
                Unpaid invoices are strictly kept out of platform revenue until confirmed.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Method
              </label>
              <select
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                {...register('paymentMethod')}
              >
                <option value="bank_transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="upi">UPI (GPay, PhonePe, Paytm)</option>
                <option value="cash">Cash Collection</option>
                <option value="card">Credit / Debit Card</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Transaction Reference / UTR Number"
              placeholder="e.g. UTR-9824028402"
              {...register('transactionReference')}
            />

            <Input
              label="Payment / Accounting Notes"
              placeholder="e.g. Annual dealership contract signed"
              {...register('paymentNotes')}
            />
          </div>
        </div>

        {/* SECTION E — REVIEW & SUBMIT */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400">
              Ready to Provision Shop
            </h3>
            <p className="text-xs text-slate-300">
              {watch('name') || 'New Shop'} will be created with the{' '}
              <strong className="text-white">{selectedPlan?.name || 'Selected'} Plan</strong> (₹
              {finalPayable.toLocaleString('en-IN')}).
            </p>
            <p className="text-[11px] text-slate-400">
              Payment Status:{' '}
              <span className="font-bold text-white uppercase">{paymentStatusValue}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link to="/superadmin/shops" className="flex-1 sm:flex-none">
              <Button type="button" variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
            >
              Provision Shop & Plan
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
