import React, { useState, useEffect } from 'react';
import {
  Palette,
  RotateCcw,
  Save,
  Check,
  Eye,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { IShop, IShopBranding } from '../../types';
import { Button } from '../../components/common/Button';

interface ThemePreset {
  id: string;
  name: string;
  description: string;
  branding: IShopBranding;
}

const PRESETS: ThemePreset[] = [
  {
    id: 'blue',
    name: 'Professional Blue',
    description: 'Corporate wholesale standard with high-contrast royal blue.',
    branding: {
      primaryColor: '#2563eb',
      secondaryColor: '#475569',
      accentColor: '#3b82f6',
      buttonColor: '#2563eb',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
    },
  },
  {
    id: 'black',
    name: 'Premium Black',
    description: 'Luxury high-end aesthetic with sleek obsidian contrast.',
    branding: {
      primaryColor: '#0f172a',
      secondaryColor: '#334155',
      accentColor: '#3b82f6',
      buttonColor: '#0f172a',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    description: 'Fresh organic and botanical wholesale palette.',
    branding: {
      primaryColor: '#059669',
      secondaryColor: '#475569',
      accentColor: '#10b981',
      buttonColor: '#059669',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
    },
  },
  {
    id: 'purple',
    name: 'Modern Purple',
    description: 'Creative and dynamic modern brand appeal.',
    branding: {
      primaryColor: '#7c3aed',
      secondaryColor: '#475569',
      accentColor: '#8b5cf6',
      buttonColor: '#7c3aed',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
    },
  },
  {
    id: 'orange',
    name: 'Warm Orange',
    description: 'Vibrant, high-energy trade and industrial styling.',
    branding: {
      primaryColor: '#ea580c',
      secondaryColor: '#475569',
      accentColor: '#f97316',
      buttonColor: '#ea580c',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
    },
  },
  {
    id: 'neutral',
    name: 'Minimal Neutral',
    description: 'Subtle slate tones emphasizing clean product photography.',
    branding: {
      primaryColor: '#334155',
      secondaryColor: '#64748b',
      accentColor: '#475569',
      buttonColor: '#334155',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
    },
  },
];

export const ShopAppearancePage: React.FC = () => {
  const [shop, setShop] = useState<IShop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Branding states
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#475569');
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [buttonColor, setButtonColor] = useState('#2563eb');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#0f172a');

  const fetchShop = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/shop-admin/shop');
      if (res.data?.success && res.data?.data?.shop) {
        const s = res.data.data.shop;
        setShop(s);
        const b = s.branding || {};
        setPrimaryColor(b.primaryColor || s.accentColor || '#2563eb');
        setSecondaryColor(b.secondaryColor || '#475569');
        setAccentColor(b.accentColor || s.accentColor || '#3b82f6');
        setButtonColor(b.buttonColor || s.accentColor || '#2563eb');
        setBackgroundColor(b.backgroundColor || '#ffffff');
        setTextColor(b.textColor || '#0f172a');
      }
    } catch {
      toast.error('Failed to load shop appearance settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShop();
  }, []);

  const handleApplyPreset = (preset: ThemePreset) => {
    setPrimaryColor(preset.branding.primaryColor);
    setSecondaryColor(preset.branding.secondaryColor);
    setAccentColor(preset.branding.accentColor);
    setButtonColor(preset.branding.buttonColor);
    setBackgroundColor(preset.branding.backgroundColor);
    setTextColor(preset.branding.textColor);
    toast.success(`Applied "${preset.name}" preset`);
  };

  const handleReset = () => {
    if (shop) {
      const b: Partial<IShopBranding> = shop.branding || {};
      setPrimaryColor(b.primaryColor || shop.accentColor || '#2563eb');
      setSecondaryColor(b.secondaryColor || '#475569');
      setAccentColor(b.accentColor || shop.accentColor || '#3b82f6');
      setButtonColor(b.buttonColor || shop.accentColor || '#2563eb');
      setBackgroundColor(b.backgroundColor || '#ffffff');
      setTextColor(b.textColor || '#0f172a');
      toast.success('Reset to saved theme settings');
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const payload: IShopBranding = {
        primaryColor,
        secondaryColor,
        accentColor,
        buttonColor,
        backgroundColor,
        textColor,
      };
      const res = await api.patch('/shop-admin/shop/branding', payload);
      if (res.data?.success && res.data?.data?.shop) {
        setShop(res.data.data.shop);
        toast.success('Shop appearance and branding updated successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save appearance');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !shop) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Palette className="w-6 h-6 text-blue-600" />
            Shop Appearance & Branding
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Customize the colors and styling of your public wholesale catalogue. Changes apply exclusively to your store.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {isSaving ? 'Saving...' : 'Save Appearance'}
          </Button>
        </div>
      </div>

      {/* Main Grid: Controls vs Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Preset Selector & Custom Color Inputs */}
        <div className="lg:col-span-7 space-y-8">
          {/* Presets */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Curated Theme Presets
            </h2>
            <p className="text-xs text-slate-500">
              Quickly apply pre-tested harmonious palettes tailored for wholesale ecommerce.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {PRESETS.map((preset) => {
                const isSelected = primaryColor.toLowerCase() === preset.branding.primaryColor.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-lg shrink-0 shadow-sm border border-black/10 flex items-center justify-center text-white"
                      style={{ backgroundColor: preset.branding.primaryColor }}
                    >
                      {isSelected && <Check className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate leading-tight">
                        {preset.name}
                      </span>
                      <span className="text-[10px] text-slate-500 block line-clamp-1 mt-0.5">
                        {preset.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Color Pickers */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Custom Color Palette
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Primary Color */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5 shrink-0"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-full text-xs font-mono uppercase px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Headings, badges, primary brand accents</p>
              </div>

              {/* Button Color */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Button / CTA Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={buttonColor}
                    onChange={(e) => setButtonColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5 shrink-0"
                  />
                  <input
                    type="text"
                    value={buttonColor}
                    onChange={(e) => setButtonColor(e.target.value)}
                    className="w-full text-xs font-mono uppercase px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Add to Cart, checkout, and action buttons</p>
              </div>

              {/* Secondary Color */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Secondary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5 shrink-0"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-full text-xs font-mono uppercase px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Category pills, secondary labels, borders</p>
              </div>

              {/* Accent Color */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Accent Highlight</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5 shrink-0"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-full text-xs font-mono uppercase px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Sale tags, highlight banners, notifications</p>
              </div>

              {/* Background Color */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Catalogue Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5 shrink-0"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-full text-xs font-mono uppercase px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Shop background tint (Default: #ffffff)</p>
              </div>

              {/* Text Color */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Primary Text Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5 shrink-0"
                  />
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-full text-xs font-mono uppercase px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Product titles, body copy, descriptions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Storefront Preview */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                Live Storefront Preview
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">Real-time simulation</span>
            </div>

            {/* Simulated Public Shop View */}
            <div
              className="rounded-xl border border-slate-200 p-4 space-y-4 shadow-inner"
              style={{ backgroundColor: backgroundColor || '#ffffff', color: textColor || '#0f172a' }}
            >
              {/* Simulated Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  {shop.logo ? (
                    <img src={shop.logo} alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {shop.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-bold text-xs" style={{ color: primaryColor }}>
                    {shop.name}
                  </span>
                </div>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                  style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Simulated Category Pill */}
              <div className="flex items-center gap-1.5 overflow-x-hidden">
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  All Products
                </span>
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium shrink-0"
                  style={{ backgroundColor: `${secondaryColor}15`, color: secondaryColor }}
                >
                  Ceramics
                </span>
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium shrink-0"
                  style={{ backgroundColor: `${secondaryColor}15`, color: secondaryColor }}
                >
                  Wholesale
                </span>
              </div>

              {/* Simulated Product Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-sm">
                <div className="h-28 rounded-lg bg-slate-100 flex items-center justify-center relative overflow-hidden">
                  <span className="text-[10px] text-slate-400 font-medium">Wholesale Product Photo</span>
                  <span
                    className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: accentColor }}
                  >
                    Wholesale In Stock
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-xs leading-snug" style={{ color: textColor }}>
                    Premium European Closet
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">SKU: ROC-901 · MOQ: 2 pcs</p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-sm font-black" style={{ color: primaryColor }}>
                      ₹3,999
                    </span>
                    <span className="text-[10px] text-slate-400 line-through ml-1.5">₹4,499</span>
                  </div>

                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg text-white text-[11px] font-bold shadow-sm transition-opacity hover:opacity-95"
                    style={{ backgroundColor: buttonColor }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>

              {/* Simulated Footer Notice */}
              <div
                className="text-center text-[10px] pt-1 border-t border-slate-200/60"
                style={{ color: secondaryColor }}
              >
                Direct WhatsApp Ordering Available
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              When saved, these colors are dynamically injected as CSS custom properties into your public catalogue for immediate rendering.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
