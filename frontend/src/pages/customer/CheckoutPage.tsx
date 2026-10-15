import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  ShoppingBag,
  MapPin,
  MessageCircle,
  Truck,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { IAddress, IShop } from '../../types';
import { ShopNavbar } from '../../components/layout/ShopNavbar';
import { ShopFooter } from '../../components/layout/ShopFooter';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

const indianPhoneRegex = /^(?:(?:\+|0{0,2})91[\s-]?)?[6-9]\d{9}$/;
const indianPinRegex = /^[1-9][0-9]{5}$/;

const checkoutAddressSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full Name is required (minimum 2 characters)')
    .max(100, 'Name is too long'),
  phone: z
    .string()
    .trim()
    .regex(indianPhoneRegex, 'Please enter a valid 10-digit Indian mobile number'),
  whatsapp: z
    .string()
    .trim()
    .regex(indianPhoneRegex, 'Please enter a valid WhatsApp number')
    .optional()
    .or(z.literal('')),
  businessName: z
    .string()
    .trim()
    .max(120, 'Business name is too long')
    .optional()
    .or(z.literal('')),
  addressLine1: z
    .string()
    .trim()
    .min(3, 'Address Line 1 / Building / House name is required')
    .max(250, 'Address is too long'),
  addressLine2: z
    .string()
    .trim()
    .max(250, 'Landmark is too long')
    .optional()
    .or(z.literal('')),
  city: z
    .string()
    .trim()
    .min(2, 'City / Town is required')
    .max(80, 'City is too long'),
  district: z
    .string()
    .trim()
    .min(2, 'District is required')
    .max(80, 'District is too long'),
  state: z
    .string()
    .trim()
    .min(2, 'State is required')
    .max(80, 'State is too long'),
  postalCode: z
    .string()
    .trim()
    .regex(indianPinRegex, 'Please enter a valid 6-digit Indian PIN code'),
  country: z.string().trim().default('India'),
});

type CheckoutAddressFormData = z.infer<typeof checkoutAddressSchema>;

export const CheckoutPage: React.FC = () => {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const { user } = useAuth();
  const { cart, currentShopSlug, setShopSlug, clearCart } = useCart();
  const navigate = useNavigate();

  const [shop, setShop] = useState<IShop | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<IAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [customerNotes, setCustomerNotes] = useState('');
  const [rememberDetails, setRememberDetails] = useState(true);
  const [hasSavedLocalDetails, setHasSavedLocalDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const storageKey = `cataloza_delivery_${shopSlug || 'default'}`;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CheckoutAddressFormData>({
    resolver: zodResolver(checkoutAddressSchema),
    defaultValues: {
      fullName: user?.name || '',
      phone: user?.phone || '',
      whatsapp: '',
      businessName: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      district: '',
      state: '',
      postalCode: '',
      country: 'India',
    },
  });

  useEffect(() => {
    if (shopSlug) setShopSlug(shopSlug);
  }, [shopSlug, setShopSlug]);

  // Load shop details & prefill saved details from local storage or logged-in account
  useEffect(() => {
    const fetchData = async () => {
      if (!shopSlug) return;
      try {
        const shopRes = await api.get(`/public/shops/${shopSlug}`);
        if (shopRes.data?.success) {
          setShop(shopRes.data.data.shop);
        }

        // 1. Check local storage for shop-specific saved guest delivery details
        try {
          const rawLocal = localStorage.getItem(storageKey);
          if (rawLocal) {
            const parsed = JSON.parse(rawLocal);
            if (parsed && typeof parsed === 'object') {
              setHasSavedLocalDetails(true);
              if (parsed.fullName) setValue('fullName', parsed.fullName);
              if (parsed.phone) setValue('phone', parsed.phone);
              if (parsed.whatsapp) setValue('whatsapp', parsed.whatsapp);
              if (parsed.businessName) setValue('businessName', parsed.businessName);
              if (parsed.addressLine1) setValue('addressLine1', parsed.addressLine1);
              if (parsed.addressLine2) setValue('addressLine2', parsed.addressLine2);
              if (parsed.city) setValue('city', parsed.city);
              if (parsed.district) setValue('district', parsed.district);
              if (parsed.state) setValue('state', parsed.state);
              if (parsed.postalCode) setValue('postalCode', parsed.postalCode);
            }
          }
        } catch {}

        // 2. If user is logged in, optionally fetch user saved addresses
        if (user) {
          const addrRes = await api
            .get('/customers/me/addresses')
            .catch(() => ({ data: { data: { addresses: [] } } }));
          const addresses: IAddress[] = addrRes.data?.data?.addresses || [];
          setSavedAddresses(addresses);

          if (addresses.length > 0 && !localStorage.getItem(storageKey)) {
            const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
            setSelectedAddressId(defaultAddr._id);
            populateFormWithAddress(defaultAddr);
          }
        }
      } catch {
        // Fallback
      }
    };

    fetchData();
  }, [shopSlug, user, storageKey, setValue]);

  const populateFormWithAddress = (addr: IAddress) => {
    setValue('fullName', addr.fullName);
    setValue('phone', addr.phone);
    setValue('businessName', addr.businessName || '');
    setValue('addressLine1', addr.street || '');
    setValue('city', addr.city);
    setValue('state', addr.state);
    setValue('postalCode', addr.postalCode);
    setValue('country', addr.country || 'India');
  };

  const handleSelectSavedAddress = (id: string) => {
    setSelectedAddressId(id);
    if (id === 'new') {
      setValue('fullName', user?.name || '');
      setValue('phone', user?.phone || '');
      setValue('whatsapp', '');
      setValue('businessName', '');
      setValue('addressLine1', '');
      setValue('addressLine2', '');
      setValue('city', '');
      setValue('district', '');
      setValue('state', '');
      setValue('postalCode', '');
      setValue('country', 'India');
    } else {
      const addr = savedAddresses.find((a) => a._id === id);
      if (addr) populateFormWithAddress(addr);
    }
  };

  const handleClearSavedLocalDetails = () => {
    try {
      localStorage.removeItem(storageKey);
      setHasSavedLocalDetails(false);
      reset({
        fullName: user?.name || '',
        phone: user?.phone || '',
        whatsapp: '',
        businessName: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        district: '',
        state: '',
        postalCode: '',
        country: 'India',
      });
      toast.success('Saved details cleared from this device');
    } catch {}
  };

  const onSubmit = async (addressData: CheckoutAddressFormData) => {
    if (!cart || !cart.items || cart.items.length === 0) {
      setErrorMessage('Your wholesale cart is empty.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // Handle opt-in save to local storage
    try {
      if (rememberDetails) {
        localStorage.setItem(storageKey, JSON.stringify(addressData));
        setHasSavedLocalDetails(true);
      } else {
        localStorage.removeItem(storageKey);
        setHasSavedLocalDetails(false);
      }
    } catch {}

    try {
      const itemsPayload = cart.items.map((i) => ({
        productId: i.productId,
        variantName: i.variantName,
        quantity: i.quantity,
      }));

      // 1. Submit guest order to backend (DB-FIRST: Saved to MongoDB before WhatsApp)
      const res = await api.post(`/shops/${shopSlug}/orders/guest`, {
        ...addressData,
        deliveryAddress: addressData,
        customerNotes,
        items: itemsPayload,
        idempotencyKey: `idem_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      });

      if (res.data?.success) {
        const order = res.data.data.order;
        const handoff = res.data.data.whatsappHandoff;
        const token = res.data.data.guestAccessToken || order.guestAccessToken || '';

        // 2. Clear local cart
        await clearCart();

        // 3. Attempt to launch WhatsApp immediately
        if (handoff?.whatsappUrl) {
          try {
            window.open(handoff.whatsappUrl, '_blank', 'noopener,noreferrer');
          } catch {
            // Popup blocker may catch, fallback button on confirmation screen
          }
        }

        // 4. Navigate to dedicated order confirmation page
        navigate(`/${shopSlug}/order/${order._id}/confirmation?token=${token}`, {
          state: { order, handoff },
          replace: true,
        });
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Checkout failed. Please review your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!shop) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currencySymbol = shop.currencySymbol || '₹';
  const hasItems = cart && cart.items && cart.items.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ShopNavbar shop={shop} />

      <main className="flex-1 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
            <Link to={`/${shop.slug}`} className="hover:text-slate-900 flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to {shop.name}</span>
            </Link>
            <span>/</span>
            <Link to={`/${shop.slug}/cart`} className="hover:text-slate-900">
              Cart
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Guest Checkout</span>
          </nav>

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Wholesale Order Checkout
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Fast guest checkout with <span className="font-semibold text-slate-800">{shop.name}</span>. No password or registration required.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!hasItems ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm">
              <ShoppingBag className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-slate-900">Your cart is empty</h2>
              <p className="mt-1 text-xs text-slate-500">
                Please add wholesale products from the catalogue before proceeding to checkout.
              </p>
              <div className="mt-6">
                <Link to={`/${shop.slug}`}>
                  <Button variant="primary">Return to Catalogue</Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Delivery Address Form */}
              <div className="lg:col-span-7 space-y-6">
                {/* Saved User Addresses (if logged in) */}
                {user && savedAddresses.length > 0 && (
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      Select Saved Address
                    </h2>

                    <div className="space-y-3">
                      {savedAddresses.map((addr) => (
                        <label
                          key={addr._id}
                          className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                            selectedAddressId === addr._id
                              ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="addressSelection"
                            value={addr._id}
                            checked={selectedAddressId === addr._id}
                            onChange={() => handleSelectSavedAddress(addr._id)}
                            className="mt-1 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-slate-900 block">{addr.fullName}</span>
                            {addr.businessName && <span className="text-slate-600 block">{addr.businessName}</span>}
                            <span className="text-slate-500 block mt-0.5">
                              {addr.street}, {addr.city}, {addr.state} - {addr.postalCode}
                            </span>
                            <span className="text-slate-400 block mt-0.5">Phone: {addr.phone}</span>
                          </div>
                        </label>
                      ))}

                      <label
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          selectedAddressId === 'new'
                            ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="addressSelection"
                          value="new"
                          checked={selectedAddressId === 'new'}
                          onChange={() => handleSelectSavedAddress('new')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" />
                          Enter delivery details below
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Main Delivery Details Form */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-600" />
                      Delivery Information
                    </h2>
                    {hasSavedLocalDetails && (
                      <button
                        type="button"
                        onClick={handleClearSavedLocalDetails}
                        className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Clear Saved Info
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Full Name *"
                      placeholder="e.g. Ramesh Kumar"
                      error={errors.fullName?.message}
                      {...register('fullName')}
                    />

                    <Input
                      label="Mobile Number *"
                      placeholder="e.g. 9876543210"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      error={errors.phone?.message}
                      {...register('phone')}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="WhatsApp Number (Optional)"
                      placeholder="Same as mobile if empty"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      error={errors.whatsapp?.message}
                      {...register('whatsapp')}
                    />

                    <Input
                      label="Shop / Business Name (Optional)"
                      placeholder="e.g. Kumar General Stores"
                      error={errors.businessName?.message}
                      {...register('businessName')}
                    />
                  </div>

                  <Input
                    label="Address Line 1 / House or Building Name *"
                    placeholder="e.g. Flat 302, Green Heights, Opp. Market"
                    error={errors.addressLine1?.message}
                    {...register('addressLine1')}
                  />

                  <Input
                    label="Address Line 2 / Landmark (Optional)"
                    placeholder="e.g. Near Old Bus Stand"
                    error={errors.addressLine2?.message}
                    {...register('addressLine2')}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="City / Town *"
                      placeholder="City"
                      error={errors.city?.message}
                      {...register('city')}
                    />

                    <Input
                      label="District *"
                      placeholder="District"
                      error={errors.district?.message}
                      {...register('district')}
                    />

                    <Input
                      label="State *"
                      placeholder="State (e.g. Maharashtra)"
                      error={errors.state?.message}
                      {...register('state')}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="PIN Code *"
                      placeholder="6-digit PIN (e.g. 400001)"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      error={errors.postalCode?.message}
                      {...register('postalCode')}
                    />

                    <Input
                      label="Country"
                      value="India"
                      disabled
                      className="bg-slate-50 text-slate-500 cursor-not-allowed"
                      {...register('country')}
                    />
                  </div>

                  {/* Opt-in Remember my details */}
                  <div className="pt-2">
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberDetails}
                        onChange={(e) => setRememberDetails(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>Remember my delivery details on this device for future orders</span>
                    </label>
                  </div>
                </div>

                {/* Customer Notes */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-3">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Order Notes / Road Carrier Instructions (Optional)
                  </h2>
                  <textarea
                    rows={3}
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Provide preferred transporter, delivery time windows, or packaging specifications..."
                    className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Right Column: Order Summary & WhatsApp Action */}
              <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Order Summary ({cart.itemCount})
                    </h2>
                    <span className="text-xs text-blue-600 font-bold">{shop.name}</span>
                  </div>

                  {/* Line Items List */}
                  <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                    {cart.items.map((item) => (
                      <div
                        key={`${item.productId}-${item.variantName || 'default'}`}
                        className="flex gap-3 text-xs"
                      >
                        <img
                          src={
                            item.image ||
                            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=100&q=80'
                          }
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover bg-slate-100 flex-shrink-0 border border-slate-100"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                            <span>SKU: {item.sku}</span>
                            {item.variantName && (
                              <span className="text-slate-600 bg-slate-100 px-1 rounded">
                                {item.variantName}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            {item.quantity} {item.unit || 'pc'} × {currencySymbol}
                            {item.unitPrice.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="text-right font-bold text-slate-900">
                          {currencySymbol}{item.lineTotal.toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financial Breakdown */}
                  <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Wholesale Subtotal:</span>
                      <span className="font-semibold text-slate-900">
                        {currencySymbol}{cart.subtotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Logistics / Delivery:</span>
                      <span className="font-semibold text-emerald-600">Confirmed via WhatsApp</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-slate-900 pt-3 border-t border-slate-200">
                      <span>Grand Total:</span>
                      <span className="text-xl text-blue-600">
                        {currencySymbol}{cart.subtotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* WhatsApp Notice */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                    <MessageCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Instant WhatsApp Bill</span>
                      <span className="text-[11px] leading-relaxed text-emerald-700 block mt-0.5">
                        Your order will be securely saved to MongoDB first, generating your official Order No. Then WhatsApp will open with your pre-formatted invoice message.
                      </span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="whatsapp"
                    size="lg"
                    className="w-full text-sm font-bold shadow-md hover:shadow-lg transition-all"
                    isLoading={isSubmitting}
                    icon={<MessageCircle className="w-5 h-5" />}
                  >
                    Confirm Order & Open WhatsApp
                  </Button>

                  <p className="text-[10px] text-center text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
                    Wholesale order prices and product snapshots are locked permanently upon save.
                  </p>
                </div>
              </div>
            </form>
          )}
        </div>
      </main>

      <ShopFooter shop={shop} />
    </div>
  );
};
