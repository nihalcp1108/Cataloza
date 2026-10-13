import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { IAddress, IShop } from '../../types';
import { ShopNavbar } from '../../components/layout/ShopNavbar';
import { ShopFooter } from '../../components/layout/ShopFooter';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

const checkoutAddressSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(7, 'Phone number is required'),
  businessName: z.string().optional(),
  street: z.string().min(3, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  country: z.string().default('India'),
});

type CheckoutAddressFormData = z.infer<typeof checkoutAddressSchema>;

export const CheckoutPage: React.FC = () => {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { cart, currentShopSlug, setShopSlug, clearCart } = useCart();
  const navigate = useNavigate();

  const [shop, setShop] = useState<IShop | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<IAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [customerNotes, setCustomerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CheckoutAddressFormData>({
    resolver: zodResolver(checkoutAddressSchema),
    defaultValues: {
      fullName: user?.name || '',
      phone: user?.phone || '',
      country: 'India',
    },
  });

  useEffect(() => {
    if (shopSlug) setShopSlug(shopSlug);
  }, [shopSlug, setShopSlug]);

  // Auth Guard: Require login or registration for checkout
  useEffect(() => {
    if (!isAuthLoading && !user) {
      navigate('/login', { state: { from: { pathname: `/${shopSlug}/checkout` } } });
    }
  }, [user, isAuthLoading, navigate, shopSlug]);

  // Load shop & saved addresses
  useEffect(() => {
    const fetchData = async () => {
      if (!shopSlug) return;
      try {
        const [shopRes, addrRes] = await Promise.all([
          api.get(`/public/shops/${shopSlug}`),
          api.get('/customers/me/addresses').catch(() => ({ data: { data: { addresses: [] } } })),
        ]);

        if (shopRes.data?.success) {
          setShop(shopRes.data.data.shop);
        }

        const addresses: IAddress[] = addrRes.data?.data?.addresses || [];
        setSavedAddresses(addresses);

        if (addresses.length > 0) {
          const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
          setSelectedAddressId(defaultAddr._id);
          populateFormWithAddress(defaultAddr);
        }
      } catch {
        // Fallback
      }
    };

    if (user) {
      fetchData();
    }
  }, [shopSlug, user]);

  const populateFormWithAddress = (addr: IAddress) => {
    setValue('fullName', addr.fullName);
    setValue('phone', addr.phone);
    setValue('businessName', addr.businessName || '');
    setValue('street', addr.street);
    setValue('city', addr.city);
    setValue('state', addr.state);
    setValue('postalCode', addr.postalCode);
    setValue('country', addr.country);
  };

  const handleSelectSavedAddress = (id: string) => {
    setSelectedAddressId(id);
    if (id === 'new') {
      setValue('fullName', user?.name || '');
      setValue('phone', user?.phone || '');
      setValue('businessName', '');
      setValue('street', '');
      setValue('city', '');
      setValue('state', '');
      setValue('postalCode', '');
      setValue('country', 'India');
    } else {
      const addr = savedAddresses.find((a) => a._id === id);
      if (addr) populateFormWithAddress(addr);
    }
  };

  const onSubmit = async (addressData: CheckoutAddressFormData) => {
    if (!cart || cart.items.length === 0) {
      setErrorMessage('Your wholesale cart is empty.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // 1. Submit checkout to backend (DB-FIRST: Order is validated and stored in MongoDB)
      const res = await api.post(`/shops/${shopSlug}/checkout`, {
        deliveryAddress: addressData,
        customerNotes,
        idempotencyKey: `idem_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      });

      if (res.data?.success) {
        const order = res.data.data.order;
        const handoff = res.data.data.whatsappHandoff;

        // 2. Clear local cart
        await clearCart();

        // 3. Navigate to dedicated order confirmation page with prefilled WhatsApp payload
        navigate(`/${shopSlug}/order/${order._id}/confirmation`, {
          state: { order, handoff },
          replace: true,
        });
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Checkout failed. Please review your order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || !shop) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currencySymbol = shop.currencySymbol || '₹';
  const hasItems = cart && cart.items.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ShopNavbar shop={shop} />

      <main className="flex-1 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Wholesale Order Checkout
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Direct B2B order dispatch with <span className="font-semibold text-slate-800">{shop.name}</span>
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!hasItems ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
              <ShoppingBag className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-slate-900">Your cart is empty</h2>
              <p className="mt-1 text-xs text-slate-500">
                Please add items from the catalogue before proceeding to checkout.
              </p>
              <div className="mt-6">
                <Link to={`/${shop.slug}`}>
                  <Button variant="primary">Return to Catalogue</Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Delivery Address & Notes */}
              <div className="lg:col-span-7 space-y-6">
                {/* Saved Address Selection */}
                {savedAddresses.length > 0 && (
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      Select Delivery Address
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
                          Enter a different delivery address
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Address Form */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    Delivery Destination Details
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Contact Name"
                      placeholder="Receiver name"
                      error={errors.fullName?.message}
                      {...register('fullName')}
                    />

                    <Input
                      label="Contact Phone"
                      placeholder="e.g. +91 98765 43210"
                      error={errors.phone?.message}
                      {...register('phone')}
                    />
                  </div>

                  <Input
                    label="Business Name (Optional)"
                    placeholder="e.g. Patel Supermarket / Store 4"
                    error={errors.businessName?.message}
                    {...register('businessName')}
                  />

                  <Input
                    label="Street Address / Gate / Unit"
                    placeholder="e.g. Plot 18, Phase 2, Industrial Estate"
                    error={errors.street?.message}
                    {...register('street')}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="City"
                      placeholder="City"
                      error={errors.city?.message}
                      {...register('city')}
                    />
                    <Input
                      label="State"
                      placeholder="State"
                      error={errors.state?.message}
                      {...register('state')}
                    />
                    <Input
                      label="Postal Code"
                      placeholder="PIN / Zip"
                      error={errors.postalCode?.message}
                      {...register('postalCode')}
                    />
                  </div>
                </div>

                {/* Customer Notes */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-3">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Logistics / Transporter Notes (Optional)
                  </h2>
                  <textarea
                    rows={3}
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Specify preferred road transport carrier, unloading times, or special packing instructions..."
                    className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Right Column: Order Summary & WhatsApp Action */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Order Items ({cart.itemCount})
                    </h2>
                    <span className="text-xs text-blue-600 font-semibold">{shop.name}</span>
                  </div>

                  {/* Line Items List */}
                  <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                    {cart.items.map((item) => (
                      <div key={item.productId} className="flex gap-3 text-xs">
                        <img
                          src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=100&q=80'}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-mono">SKU: {item.sku}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            {item.quantity} {item.unit}s × {currencySymbol}{item.unitPrice.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="text-right font-bold text-slate-900">
                          {currencySymbol}{item.lineTotal.toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calculations */}
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
                      <span className="text-lg text-blue-600">
                        {currencySymbol}{cart.subtotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Guaranteed Database-First WhatsApp Handoff Notice */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                    <MessageCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Instant WhatsApp Handoff</span>
                      <span className="text-[11px] leading-relaxed text-emerald-700 block mt-0.5">
                        Your order will be securely saved to MongoDB first, generating an authoritative Order No. You will then be handed off to the supplier's WhatsApp desk to confirm dispatch.
                      </span>
                    </div>
                  </div>

                  {/* Confirm Button */}
                  <Button
                    type="submit"
                    variant="whatsapp"
                    size="lg"
                    className="w-full text-sm"
                    isLoading={isSubmitting}
                    icon={<MessageCircle className="w-5 h-5" />}
                  >
                    Confirm Order & Open WhatsApp
                  </Button>

                  <p className="text-[10px] text-center text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
                    Wholesale prices and order snapshots are locked permanently upon submission.
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
