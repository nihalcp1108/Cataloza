import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowRight,
  Trash2,
  Plus,
  Minus,
  AlertTriangle,
  Store,
  ChevronLeft,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react';
import { api } from '../../api/client';
import { IShop } from '../../types';
import { useCart } from '../../contexts/CartContext';
import { ShopNavbar } from '../../components/layout/ShopNavbar';
import { ShopFooter } from '../../components/layout/ShopFooter';
import { Button } from '../../components/common/Button';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';

export const CartPage: React.FC = () => {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const {
    cart,
    setShopSlug,
    updateQuantity,
    removeFromCart,
    clearCart,
    isLoading: isCartLoading,
  } = useCart();
  const navigate = useNavigate();

  const [shop, setShop] = useState<IShop | null>(null);
  const [isLoadingShop, setIsLoadingShop] = useState(true);

  useEffect(() => {
    if (shopSlug) setShopSlug(shopSlug);
  }, [shopSlug, setShopSlug]);

  useEffect(() => {
    const fetchShop = async () => {
      if (!shopSlug) return;
      try {
        setIsLoadingShop(true);
        const res = await api.get(`/public/shops/${shopSlug}`);
        if (res.data?.success) {
          setShop(res.data.data.shop);
        }
      } catch {
        navigate(`/${shopSlug}`, { replace: true });
      } finally {
        setIsLoadingShop(false);
      }
    };
    fetchShop();
  }, [shopSlug, navigate]);

  if (isLoadingShop || !shop) {
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

      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
            <Link to={`/${shop.slug}`} className="hover:text-slate-900 flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to {shop.name}</span>
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Wholesale Cart</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <ShoppingBag className="w-7 h-7 text-blue-600" />
                Wholesale Cart
                {hasItems && (
                  <span className="text-xs font-bold font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                    {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Direct wholesale order with <span className="font-semibold text-slate-800">{shop.name}</span>
              </p>
            </div>

            {hasItems && (
              <button
                onClick={() => clearCart()}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Entire Cart
              </button>
            )}
          </div>

          {!hasItems ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Your wholesale cart is empty</h2>
              <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                Explore wholesale products from {shop.name} and add them to your order.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                <Link to={`/${shop.slug}`}>
                  <Button variant="primary">Browse Catalogue</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Items List */}
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
                  {cart.items.map((item) => (
                    <div
                      key={`${item.productId}-${item.variantName || 'default'}`}
                      className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors hover:bg-slate-50/40"
                    >
                      {/* Image + Info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <img
                          src={getOptimizedImageUrl(
                            item.image ||
                            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80',
                            { width: 160, quality: 75 }
                          )}
                          alt={item.name}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-slate-100 border border-slate-200/60 flex-shrink-0"
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/${shop.slug}/products`}
                            className="font-bold text-sm text-slate-900 hover:text-blue-600 truncate block"
                          >
                            {item.name}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-slate-400 uppercase">
                              SKU: {item.sku}
                            </span>
                            {item.variantName && (
                              <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                                {item.variantName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Unit Price: <span className="font-semibold text-slate-800">{currencySymbol}{item.unitPrice.toLocaleString('en-IN')}</span> per {item.unit || 'piece'}
                          </p>

                          {item.belowMoq && (
                            <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-1.5 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                              Minimum order: {item.minimumOrderQuantity} {item.unit}s
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controls & Line Total */}
                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                Math.max(1, item.quantity - 1),
                                item.variantName
                              )
                            }
                            className="p-2 hover:bg-slate-200 text-slate-600 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-10 text-center font-bold text-xs text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.quantity + 1,
                                item.variantName
                              )
                            }
                            className="p-2 hover:bg-slate-200 text-slate-600 transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-right min-w-[90px]">
                          <span className="text-[10px] text-slate-400 block uppercase">Total</span>
                          <span className="font-bold text-sm text-slate-900">
                            {currencySymbol}{item.lineTotal.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId, item.variantName)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Link
                    to={`/${shop.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Continue Adding Products
                  </Link>
                </div>
              </div>

              {/* Right Column: Order Summary */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
                    Order Summary
                  </h2>

                  <div className="space-y-3 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Total Items:</span>
                      <span className="font-semibold text-slate-900">{cart.itemCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Wholesale Subtotal:</span>
                      <span className="font-semibold text-slate-900">
                        {currencySymbol}{cart.subtotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping / Logistics:</span>
                      <span className="font-semibold text-emerald-600">Confirmed on WhatsApp</span>
                    </div>
                    <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                      <span className="font-bold text-sm text-slate-900">Final Total:</span>
                      <span className="text-xl font-black text-blue-600">
                        {currencySymbol}{cart.subtotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Guaranteed Database-First Notice */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                    <MessageCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">No Login Required</span>
                      <span className="text-[11px] leading-relaxed text-emerald-700 block mt-0.5">
                        Fill your delivery address in the next step and directly generate your official WhatsApp order bill.
                      </span>
                    </div>
                  </div>

                  <Link to={`/${shop.slug}/checkout`} className="block">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full text-sm font-bold"
                      icon={<ArrowRight className="w-5 h-5" />}
                    >
                      Proceed to Guest Checkout
                    </Button>
                  </Link>

                  <p className="text-[10px] text-center text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
                    Direct B2B wholesale transaction with {shop.name}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <ShopFooter shop={shop} />
    </div>
  );
};
