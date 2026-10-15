import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { 
  Store, 
  MessageCircle, 
  Phone, 
  MapPin, 
  Clock, 
  Save, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle,
  Send,
  HelpCircle
} from 'lucide-react';
import { api } from '../../api/client';
import { IShop } from '../../types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const ShopSettingsPage: React.FC = () => {
  const [shop, setShop] = useState<IShop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isSavingWhatsApp, setIsSavingWhatsApp] = useState(false);

  // WhatsApp specific states
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappCheckoutEnabled, setWhatsappCheckoutEnabled] = useState(true);

  const { register, handleSubmit, reset } = useForm<any>();

  useEffect(() => {
    fetchShop();
  }, []);

  const fetchShop = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/shop-admin/shop');
      if (res.data?.success) {
        const s: IShop = res.data.data.shop;
        setShop(s);
        setWhatsappNumber(s.whatsappNumber || '');
        setWhatsappCheckoutEnabled(s.whatsappCheckoutEnabled !== false);
        reset({
          name: s.name,
          description: s.description || '',
          contactPhone: s.contactPhone || '',
          email: s.email || '',
          businessHours: s.businessHours || '',
          gstNumber: s.gstNumber || '',
          street: s.address?.addressLine1 || s.address?.street || '',
          city: s.address?.city || '',
          district: s.address?.district || '',
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

  const handleGeneralSubmit = async (formData: any) => {
    setIsSavingGeneral(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        contactPhone: formData.contactPhone,
        email: formData.email,
        businessHours: formData.businessHours,
        gstNumber: formData.gstNumber,
        address: {
          addressLine1: formData.street,
          street: formData.street,
          city: formData.city,
          district: formData.district,
          state: formData.state,
          postalCode: formData.postalCode,
          country: formData.country,
        },
      };

      const res = await api.patch('/shop-admin/shop', payload);
      if (res.data?.success) {
        toast.success('Shop settings saved successfully');
        setShop(res.data.data.shop);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleSaveWhatsApp = async () => {
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    if (!cleanNumber || cleanNumber.length < 10) {
      toast.error('Please enter a valid WhatsApp phone number with country code (e.g. 919876543210)');
      return;
    }

    setIsSavingWhatsApp(true);
    try {
      const res = await api.patch('/shop-admin/shop/whatsapp', {
        whatsappNumber: cleanNumber,
        whatsappCheckoutEnabled,
      });

      if (res.data?.success) {
        toast.success('WhatsApp Order Settings updated successfully');
        setShop(res.data.data.shop);
        setWhatsappNumber(res.data.data.shop.whatsappNumber);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update WhatsApp settings');
    } finally {
      setIsSavingWhatsApp(false);
    }
  };

  // Preview message generation
  const cleanDigits = whatsappNumber.replace(/\D/g, '');
  const sampleMessage = `🛍️ *NEW WHOLESALE ORDER: ORD-84920*
Store: ${shop?.name || 'My Wholesale Store'}
----------------------------------
Customer: Acme Retail Stores
Phone: +91 98765 43210
Delivery: 124 Market Road, Hubli, Karnataka - 580020

*ITEMS ORDERED:*
• 10x Heavy Duty Cotton Bags (M) @ ₹140 = ₹1,400
• 5x Premium Canvas Pouches @ ₹220 = ₹1,100

*TOTAL VALUE: ₹2,500*
Payment Mode: Pay on Delivery / Account Invoice
----------------------------------
Please confirm stock availability and dispatch schedule.`;

  const testWhatsAppUrl = cleanDigits
    ? `https://wa.me/${cleanDigits}?text=${encodeURIComponent('Hello! Testing WhatsApp ordering connection for ' + (shop?.name || 'my shop') + ' via Cataloza.')}`
    : '#';

  if (isLoading || !shop) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Shop & WhatsApp Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure WhatsApp direct ordering, checkout policies, and operational dispatch settings.
        </p>
      </div>

      {/* ========================================================= */}
      {/* 1. WHATSAPP ORDER SETTINGS (CRITICAL FEATURE)            */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-emerald-200/80 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">WhatsApp Order Settings</h2>
              <p className="text-xs text-slate-500">
                Incoming wholesale buyer orders and bills are directed to this WhatsApp Business number.
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            whatsappCheckoutEnabled && cleanDigits
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {whatsappCheckoutEnabled && cleanDigits ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Active & Receiving
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Setup Required
              </>
            )}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                WhatsApp Business Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. 919876543210 (Country code + digits)"
                  className="w-full text-sm font-mono rounded-xl border border-slate-300 p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Include country code without + or dashes (e.g., <strong>91</strong> for India followed by 10 digits).
              </p>
            </div>

            {/* Toggle Enable/Disable WhatsApp Checkout */}
            <div className="pt-2">
              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={whatsappCheckoutEnabled}
                  onChange={(e) => setWhatsappCheckoutEnabled(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Enable Instant WhatsApp Checkout</span>
                  <span className="text-[11px] text-slate-500 block">
                    When enabled, guest customers can generate instant formatted order bills and send them directly to this WhatsApp line.
                  </span>
                </div>
              </label>
            </div>

            {/* Actions for WhatsApp */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveWhatsApp}
                isLoading={isSavingWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                icon={<Save className="w-4 h-4" />}
              >
                Save WhatsApp Settings
              </Button>

              {cleanDigits && (
                <a
                  href={testWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200"
                >
                  <Send className="w-3.5 h-3.5" />
                  Test WhatsApp Link
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                </a>
              )}
            </div>
          </div>

          {/* Message Preview Box */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 flex flex-col justify-between font-mono text-xs border border-slate-800">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Sample Generated WhatsApp Bill
                </span>
                <span>Automated</span>
              </div>
              <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-200 font-sans mt-3 max-h-60 overflow-y-auto">
                {sampleMessage}
              </pre>
            </div>
            <div className="pt-3 border-t border-slate-800/80 mt-3 text-[10px] text-slate-400 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-emerald-400" />
              Orders are permanently saved to MongoDB before WhatsApp opens.
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. GENERAL BUSINESS & DISPATCH SETTINGS                  */}
      {/* ========================================================= */}
      <form onSubmit={handleSubmit(handleGeneralSubmit)} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Wholesale Profile & Operations</h2>
              <p className="text-xs text-slate-500">
                Operating hours, business registration, and customer dispatch details.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Shop Name"
              required
              placeholder="e.g. ABC Wholesale Distributors"
              {...register('name')}
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Permanent Slug
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-mono text-slate-500">
                <span>/{shop.slug}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Slugs are permanently provisioned by Super Admin.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Wholesale Business Description
            </label>
            <textarea
              rows={3}
              placeholder="Tell buyers about your product categories, distribution coverage, and MOQ policies..."
              className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-slate-900"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Contact Phone"
              placeholder="+91 98765 43210"
              {...register('contactPhone')}
            />

            <Input
              label="Business Email"
              type="email"
              placeholder="orders@business.com"
              {...register('email')}
            />

            <Input
              label="Business Hours"
              placeholder="Mon - Sat: 9 AM - 8 PM"
              {...register('businessHours')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="GST Number (Optional)"
              placeholder="29AAAAA0000A1Z5"
              {...register('gstNumber')}
            />
          </div>
        </div>

        {/* Warehouse Dispatch Location */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Warehouse / Dispatch Location</h2>
              <p className="text-xs text-slate-500">
                Shown to wholesale buyers for transport depot coordination and billing.
              </p>
            </div>
          </div>

          <Input
            label="Street Address / Plot / Warehouse No."
            placeholder="Plot 42, Central Industrial Area, Phase 2"
            {...register('street')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Input label="City" placeholder="City" {...register('city')} />
            <Input label="District" placeholder="District" {...register('district')} />
            <Input label="State" placeholder="State" {...register('state')} />
            <Input label="PIN Code" placeholder="PIN Code" {...register('postalCode')} />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSavingGeneral}
            icon={<Save className="w-4 h-4" />}
          >
            Save All Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
