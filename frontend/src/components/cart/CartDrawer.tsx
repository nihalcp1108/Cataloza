import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, AlertTriangle } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { Button } from '../common/Button';

export const CartDrawer: React.FC = () => {
  const { cart, currentShopSlug, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, clearCart } =
    useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  const currencySymbol = cart?.shop?.currencySymbol || '₹';
  const hasItems = cart && cart.items.length > 0;

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate(`/${currentShopSlug}/checkout`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                Your Wholesale Cart {hasItems && `(${cart.itemCount})`}
              </h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {!hasItems ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Your cart is empty</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Browse {cart?.shop?.name || 'our wholesale catalogue'} and add items to begin ordering.
                </p>
                <div className="mt-6">
                  <Button variant="outline" onClick={() => setIsCartOpen(false)}>
                    Browse Products
                  </Button>
                </div>
              </div>
            ) : (
              cart.items.map((item) => (
                <div
                  key={`${item.productId}-${item.variantName || 'def'}`}
                  className="flex gap-4 p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-sm"
                >
                  <img
                    src={
                      item.image ||
                      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'
                    }
                    alt={item.name}
                    className="w-16 h-16 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-slate-900 truncate">{item.name}</h4>
                    <p className="text-[11px] font-mono text-slate-400 uppercase mt-0.5">SKU: {item.sku}</p>

                    {item.variantName && (
                      <span className="inline-block text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1">
                        {item.variantName}
                      </span>
                    )}

                    {item.belowMoq && (
                      <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-1 font-medium">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        Min. order: {item.minimumOrderQuantity} {item.unit}s
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, Math.max(0, item.quantity - 1), item.variantName)
                          }
                          className="p-1 hover:bg-slate-200 text-slate-600"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-slate-900 min-w-[24px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantName)}
                          className="p-1 hover:bg-slate-200 text-slate-600"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900">
                          {currencySymbol}
                          {item.lineTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.productId, item.variantName)}
                    className="text-slate-300 hover:text-rose-500 self-start p-1 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout Summary */}
          {hasItems && (
            <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Wholesale Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    {currencySymbol}
                    {cart.subtotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Delivery / Logistics</span>
                  <span className="text-emerald-600 font-medium">Calculated upon dispatch</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span className="text-blue-600">
                    {currencySymbol}
                    {cart.subtotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  icon={<ArrowRight className="w-4 h-4" />}
                  onClick={handleCheckout}
                >
                  Proceed to Checkout
                </Button>
                <button
                  onClick={clearCart}
                  className="w-full text-center text-xs text-slate-400 hover:text-rose-600 transition-colors py-1"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
