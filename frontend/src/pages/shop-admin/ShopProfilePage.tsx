import React, { useState, useEffect, useRef } from 'react';
import {
  Store,
  Upload,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Share2,
  QrCode,
  Building,
  Mail,
  Phone,
  MessageSquare,
  Globe,
  MapPin,
  Clock,
  Instagram,
  Facebook,
  FileText,
  Save,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { IShop } from '../../types';
import { Button } from '../../components/common/Button';

export const ShopProfilePage: React.FC = () => {
  const [shop, setShop] = useState<IShop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Address states
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('India');

  // Additional details
  const [businessCategory, setBusinessCategory] = useState('General Wholesale');
  const [businessHours, setBusinessHours] = useState('Mon - Sat: 9:00 AM - 8:00 PM');
  const [gstNumber, setGstNumber] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const populateFields = (s: IShop) => {
    setName(s.name || '');
    setBusinessName(s.businessName || '');
    setDescription(s.description || '');
    setOwnerName(s.ownerName || '');
    setContactPhone(s.contactPhone || '');
    setWhatsappNumber(s.whatsappNumber || '');
    setEmail(s.email || '');
    setWebsite(s.website || s.socialLinks?.website || '');

    setAddressLine1(s.address?.addressLine1 || s.address?.street || '');
    setAddressLine2(s.address?.addressLine2 || '');
    setCity(s.address?.city || '');
    setDistrict(s.address?.district || '');
    setState(s.address?.state || '');
    setPostalCode(s.address?.postalCode || '');
    setCountry(s.address?.country || 'India');

    setBusinessCategory(s.businessCategory || 'General Wholesale');
    setBusinessHours(s.businessHours || 'Mon - Sat: 9:00 AM - 8:00 PM');
    setGstNumber(s.gstNumber || '');
    setInstagram(s.socialLinks?.instagram || '');
    setFacebook(s.socialLinks?.facebook || '');
  };

  const fetchShop = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/shop-admin/shop');
      if (res.data?.success && res.data?.data?.shop) {
        const s = res.data.data.shop;
        setShop(s);
        populateFields(s);
      }
    } catch {
      toast.error('Failed to load shop profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShop();
  }, []);

  const publicShopUrl = shop ? `${window.location.origin}/${shop.slug}` : '';
  const qrCodeUrl = shop
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(publicShopUrl)}`
    : '';

  const handleCopyLink = () => {
    if (!publicShopUrl) return;
    navigator.clipboard.writeText(publicShopUrl);
    setCopiedLink(true);
    toast.success('Public catalogue link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!publicShopUrl || !shop) return;
    const msg = `Explore wholesale catalogue for ${shop.name}: ${publicShopUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo file size must be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    try {
      setIsUploadingLogo(true);
      const res = await api.post('/shop-admin/shop/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.success && res.data?.data?.shop) {
        setShop(res.data.data.shop);
        toast.success('Shop logo uploaded and updated successfully!');
      }
    } catch {
      toast.error('Failed to upload shop logo');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm('Are you sure you want to remove your shop logo?')) return;
    try {
      setIsUploadingLogo(true);
      const res = await api.delete('/shop-admin/shop/logo');
      if (res.data?.success && res.data?.data?.shop) {
        setShop(res.data.data.shop);
        toast.success('Shop logo removed');
      }
    } catch {
      toast.error('Failed to remove logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Shop Name is required');
      return;
    }
    if (!whatsappNumber.trim()) {
      toast.error('WhatsApp Number is required');
      return;
    }

    const payload = {
      name: name.trim(),
      businessName: businessName.trim(),
      description: description.trim(),
      ownerName: ownerName.trim(),
      contactPhone: contactPhone.trim(),
      whatsappNumber: whatsappNumber.trim(),
      email: email.trim(),
      website: website.trim(),
      address: {
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        street: addressLine1.trim(),
        city: city.trim(),
        district: district.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        country: country.trim() || 'India',
      },
      businessCategory: businessCategory.trim(),
      businessHours: businessHours.trim(),
      gstNumber: gstNumber.trim(),
      socialLinks: {
        instagram: instagram.trim(),
        facebook: facebook.trim(),
        website: website.trim(),
      },
    };

    try {
      setIsSaving(true);
      const res = await api.patch('/shop-admin/shop', payload);
      if (res.data?.success && res.data?.data?.shop) {
        setShop(res.data.data.shop);
        populateFields(res.data.data.shop);
        toast.success('Shop Profile saved and updated successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save shop profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (shop) populateFields(shop);
    toast.success('Changes reverted to saved details');
  };

  if (isLoading || !shop) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Shop Profile & Branding</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your wholesale brand identity, contact information, business address, and catalogue share links.
        </p>
      </div>

      {/* 1. Dedicated Public Catalogue Link Section */}
      <div className="bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                Your Public Catalogue Link
              </span>
              <h2 className="text-xl font-black tracking-tight mt-0.5">{shop.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors border border-white/15"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code</span>
              </button>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share WhatsApp</span>
              </button>
            </div>
          </div>

          {/* URL Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/10">
            <span className="font-mono text-xs text-blue-200 px-3 py-1.5 truncate flex-1">
              {publicShopUrl}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
              <a
                href={publicShopUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors border border-white/10"
              >
                <span>Open Shop</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Current URL slug: <code className="text-blue-300 font-mono bg-white/5 px-1.5 py-0.5 rounded">/{shop.slug}</code> (System-assigned by Super Admin for persistent link integrity).
          </p>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Catalogue QR Code</h3>
            <p className="text-xs text-slate-500">Scan to browse {shop.name}&apos;s public catalogue on mobile.</p>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-center">
              <img src={qrCodeUrl} alt="Storefront QR Code" className="w-48 h-48 rounded-lg" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowQrModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Logo Upload Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">Shop Logo</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Your logo is displayed in the public shop header, mobile navbar, invoices, and profile cards.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group shrink-0">
            {shop.logo ? (
              <img
                src={shop.logo}
                alt={shop.name}
                className="w-24 h-24 rounded-2xl object-cover border border-slate-200 p-1 shadow-sm bg-white"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-blue-600 text-white font-black text-3xl flex items-center justify-center shadow-inner">
                {shop.name ? shop.name.charAt(0).toUpperCase() : <Store className="w-8 h-8" />}
              </div>
            )}
          </div>

          <div className="space-y-3 flex-1 text-center sm:text-left">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoUpload}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
            />
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploadingLogo ? 'Uploading...' : shop.logo ? 'Change Logo' : 'Upload Logo'}
              </Button>

              {shop.logo && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveLogo}
                  disabled={isUploadingLogo}
                  className="text-rose-600 hover:bg-rose-50 border-rose-200"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Logo
                </Button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Recommended: 400x400px square PNG, WEBP, or JPG. Max file size: 5MB. Hosted securely on Cloudinary.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Profile Details Form */}
      <form onSubmit={handleSaveProfile} className="space-y-8">
        {/* Basic Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-blue-600" />
              Basic Business Information
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Primary public identification for your wholesale company.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Shop Display Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rocoware Ceramics"
                required
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Registered Business / Firm Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Rocoware Sanitaryware Pvt Ltd"
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Owner / Authorized Representative
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Business Category
              </label>
              <input
                type="text"
                value={businessCategory}
                onChange={(e) => setBusinessCategory(e.target.value)}
                placeholder="e.g. Tiles & Sanitaryware, Textiles, Electronics"
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp Order Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. 919876543210"
                  required
                  className="w-full text-xs font-medium pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">International format without symbols (e.g. 919876543210 for India)</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Office Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. 022 12345678"
                  className="w-full text-xs font-medium pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Business Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="orders@rocoware.com"
                  className="w-full text-xs font-medium pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Website (Optional)
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.rocoware.com"
                  className="w-full text-xs font-medium pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Shop / Company Bio & Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Briefly describe your wholesale specializations, MOQ rules, and delivery logistics..."
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Business Address */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Warehouse & Business Address
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Appears on wholesale invoices and customer delivery bills.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Address Line 1 (Building / Plot / Area)
              </label>
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="e.g. Unit 4B, Industrial Estate, Phase 2"
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Address Line 2 (Landmark / Street)
              </label>
              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="e.g. Near Cargo Hub, Highway Road"
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City / Town</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai"
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">District</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Thane"
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Maharashtra"
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">PIN / Postal Code</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="e.g. 400001"
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Additional Commercial & Social Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              Commercial & Social Links
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Tax registration, timings, and social platforms.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GSTIN / Tax Registration Number (Optional)
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="e.g. 27ABCDE1234F1Z5"
                  className="w-full text-xs font-medium pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Business & Warehouse Hours
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={businessHours}
                  onChange={(e) => setBusinessHours(e.target.value)}
                  placeholder="e.g. Mon - Sat: 9:00 AM - 7:00 PM"
                  className="w-full text-xs font-medium pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Instagram Profile URL
              </label>
              <div className="relative">
                <Instagram className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="https://instagram.com/rocoware"
                  className="w-full text-xs font-medium pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Facebook Page URL
              </label>
              <div className="relative">
                <Facebook className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="https://facebook.com/rocoware"
                  className="w-full text-xs font-medium pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleReset}
            disabled={isSaving}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Discard Changes
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
};
