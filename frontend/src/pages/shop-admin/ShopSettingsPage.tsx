import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Store, MessageCircle, Phone, MapPin, Palette, Clock, Save } from 'lucide-react';
import { api } from '../../api/client';
import { IShop } from '../../types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const ShopSettingsPage: React.FC = () => {
  const [shop, setShop] = useState<IShop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset } = useForm<any>();

  useEffect(() => {
    const fetchShop = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/shop-admin/shop');
        if (res.data?.success) {
          const s = res.data.data.shop;
          setShop(s);
          reset({
            name: s.name,
            description: s.description || '',
            contactPhone: s.contactPhone || '',
            whatsappNumber: s.whatsappNumber,
            email: s.email || '',
            logo: s.logo || '',
            banner: s.banner || '',
            businessHours: s.businessHours || '',
            accentColor: s.accentColor || '#2563eb',
            street: s.address?.street || '',
            city: s.address?.city || '',
            state: s.address?.state || '',
            postalCode: s.address?.postalCode || '',
            country: s.address?.country || 'India',
          });
        }
      } catch {
        toast.error('Failed to load shop settings');
      } finally {
        setIsLoading(false);
      }
    };
    fetchShop();
  }, [reset]);

  const onSubmit = async (formData: any) => {
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        contactPhone: formData.contactPhone,
        whatsappNumber: formData.whatsappNumber,
        email: formData.email,
        logo: formData.logo,
        banner: formData.banner,
        businessHours: formData.businessHours,
        accentColor: formData.accentColor,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          country: formData.country,
        },
      };

      const res = await api.patch('/shop-admin/shop', payload);
      if (res.data?.success) {
        toast.success('Shop settings updated successfully');
        setShop(res.data.data.shop);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !shop) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Wholesale Shop Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your catalogue branding, depot address, and WhatsApp contact line.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Core Profile */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <Store className="w-4 h-4 text-blue-600" />
            Shop Identity & Slug
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Shop Name"
              required
              placeholder="e.g. ABC Wholesale Distributors"
              {...register('name')}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Shop Public Slug
              </label>
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-500">
                <span>/{shop.slug}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Slugs are permanent and managed by Super Admin.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Wholesale Business Description
            </label>
            <textarea
              rows={3}
              placeholder="Tell buyers about your product categories, distribution coverage, and MOQ policies..."
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100"
              {...register('description')}
            />
          </div>
        </div>

        {/* WhatsApp & Contacts */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            WhatsApp & Direct Communications
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="WhatsApp Ordering Number"
              required
              placeholder="919876543210 (Country code + digits)"
              helperText="Prefilled order summaries will be directed to this number."
              {...register('whatsappNumber')}
            />

            <Input
              label="Contact Phone"
              placeholder="+91 98765 43210"
              {...register('contactPhone')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Business Email"
              type="email"
              placeholder="orders@business.com"
              {...register('email')}
            />

            <Input
              label="Business Hours"
              placeholder="Mon - Sat: 8:30 AM - 7:30 PM"
              {...register('businessHours')}
            />
          </div>
        </div>

        {/* Depot / Warehouse Address */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            Warehouse / Dispatch Address
          </h2>

          <Input
            label="Street Address / Industrial Area"
            placeholder="Plot 42, Central Industrial Area, Sector 5"
            {...register('street')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="City" placeholder="City" {...register('city')} />
            <Input label="State" placeholder="State" {...register('state')} />
            <Input label="Postal Code" placeholder="Postal Code" {...register('postalCode')} />
          </div>
        </div>

        {/* Branding & Logo */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-600" />
            Shop Branding
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Logo URL"
              placeholder="https://.../logo.png"
              {...register('logo')}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Primary Brand Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                  {...register('accentColor')}
                />
                <input
                  type="text"
                  placeholder="#2563eb"
                  className="flex-1 text-xs rounded-lg border border-slate-300 p-2.5 font-mono uppercase"
                  {...register('accentColor')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSaving}
            icon={<Save className="w-4 h-4" />}
          >
            Save Shop Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
