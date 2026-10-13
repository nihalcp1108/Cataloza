import React, { useState } from 'react';
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
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../api/client';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

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
  name: z.string().min(2, 'Shop name must be at least 2 characters').max(120),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens (e.g. abc-wholesale)')
    .refine((s) => !reservedSlugs.includes(s), {
      message: 'This slug is reserved by the platform',
    }),
  description: z.string().max(1000).optional(),
  contactPhone: z.string().optional(),
  whatsappNumber: z
    .string()
    .min(7, 'WhatsApp number is required')
    .regex(/^\+?[1-9]\d{6,14}$/, 'Must be a valid international number with country code (e.g. 919876543210)'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('India'),
  accentColor: z.string().default('#2563eb'),
  adminName: z.string().min(2, 'Admin full name is required'),
  adminEmail: z.string().email('Invalid admin email address').toLowerCase().trim(),
  adminPhone: z.string().optional(),
  adminPassword: z.string().min(8, 'Admin password must be at least 8 characters'),
});

type CreateShopFormData = z.infer<typeof createShopFormSchema>;

export const CreateShopPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdShopResult, setCreatedShopResult] = useState<any | null>(null);

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
    },
  });

  const slugValue = watch('slug') || '';

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
        slug: data.slug,
        description: data.description,
        contactPhone: data.contactPhone,
        whatsappNumber: data.whatsappNumber.replace(/[^0-9]/g, ''),
        email: data.email || undefined,
        address: {
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
        },
        accentColor: data.accentColor,
        adminName: data.adminName,
        adminEmail: data.adminEmail,
        adminPhone: data.adminPhone,
        adminPassword: data.adminPassword,
      };

      const res = await api.post('/super-admin/shops', payload);
      if (res.data?.success) {
        toast.success('Shop created and Shop Admin provisioned successfully!');
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
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h2 className="text-2xl font-black text-slate-900">Wholesale Shop Created!</h2>
          <p className="text-xs text-slate-500">
            {createdShopResult.shop.name} is now live and isolated under its assigned administrator.
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
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

            <div className="pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-700 block">Assigned Shop Admin:</span>
              <span className="text-slate-600">{createdShopResult.admin.name} ({createdShopResult.admin.email})</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              icon={<Copy className="w-4 h-4" />}
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                toast.success('URL copied to clipboard!');
              }}
            >
              Copy Public URL
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => navigate('/superadmin/shops')}>
              Go to Shops List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/superadmin/shops" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Provision New Wholesale Shop</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Atomically creates a tenant shop and provisions its initial Shop Administrator account.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Shop Information */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <Store className="w-4 h-4 text-indigo-600" />
            Shop Information & Unique URL Slug
          </h2>

          <Input
            label="Shop Name"
            placeholder="e.g. ABC Wholesale Distributors"
            error={errors.name?.message}
            {...register('name', { onBlur: handleNameBlur })}
          />

          <div>
            <Input
              label="Unique Shop Slug"
              placeholder="e.g. abc-wholesale"
              helperText={`Final URL: ${window.location.origin}/${slugValue || 'your-slug'}`}
              error={errors.slug?.message}
              {...register('slug')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Business Description
            </label>
            <textarea
              rows={3}
              placeholder="Primary wholesale categories, territory coverage, MOQ overview..."
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="WhatsApp Ordering Number"
              placeholder="919876543210 (with country code)"
              helperText="Prefilled order messages will be sent to this line."
              error={errors.whatsappNumber?.message}
              {...register('whatsappNumber')}
            />

            <Input
              label="Contact Phone"
              placeholder="+91 98765 43210"
              {...register('contactPhone')}
            />
          </div>

          <Input
            label="Business Email (Optional)"
            type="email"
            placeholder="orders@supplier.com"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        {/* Warehouse / Depot Address */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            Depot / Dispatch Address
          </h2>

          <Input
            label="Street Address / Plot"
            placeholder="Plot 42, Central Industrial Area"
            {...register('street')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="City" placeholder="City" {...register('city')} />
            <Input label="State" placeholder="State" {...register('state')} />
            <Input label="Postal Code" placeholder="Postal Code" {...register('postalCode')} />
          </div>
        </div>

        {/* Initial Shop Administrator Account */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            Initial Shop Administrator Account
          </h2>

          <p className="text-xs text-slate-500">
            This account will be created with <span className="font-semibold text-slate-700">shop_admin</span> role and assigned exclusively to this shop.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Admin Full Name"
              placeholder="e.g. Ramesh Sharma"
              error={errors.adminName?.message}
              {...register('adminName')}
            />

            <Input
              label="Admin Email"
              type="email"
              placeholder="admin@supplier.com"
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

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Link to="/superadmin/shops">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting}>
            Provision Shop & Administrator
          </Button>
        </div>
      </form>
    </div>
  );
};
