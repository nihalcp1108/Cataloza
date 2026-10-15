import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, MessageCircle, Phone, User, Store } from 'lucide-react';
import { IShop } from '../../types';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';

interface ShopNavbarProps {
  shop: IShop;
}

export const ShopNavbar: React.FC<ShopNavbarProps> = ({ shop }) => {
  const { cart, setIsCartOpen } = useCart();
  const { user } = useAuth();

  const itemCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const rawPhone = (shop.whatsappNumber || '').replace(/[^0-9]/g, '');
  const normalizedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
  const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
    `Hello ${shop.name}, I have an inquiry regarding your wholesale products.`
  )}`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Shop Branding */}
          <Link to={`/${shop.slug}`} className="flex items-center gap-3">
            {shop.logo ? (
              <img
                src={shop.logo}
                alt={shop.name}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-slate-100 shadow-sm"
              />
            ) : (
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                style={{ backgroundColor: shop.accentColor || '#2563eb' }}
              >
                <Store className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            )}
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
                {shop.name}
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Verified Wholesale
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-mono">/{shop.slug}</p>
            </div>
          </Link>

          {/* Contact & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Direct WhatsApp contact */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp Supplier</span>
            </a>

            {/* Customer Account */}
            {user ? (
              <Link to="/account/orders">
                <Button variant="ghost" size="sm" icon={<User className="w-4 h-4" />}>
                  <span className="hidden sm:inline">My Account</span>
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="ghost" size="sm" icon={<User className="w-4 h-4" />}>
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              </Link>
            )}

            {/* Cart Trigger Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center gap-2"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-5 h-5 text-slate-700" />
              <span className="hidden sm:inline text-xs font-bold text-slate-800">Cart</span>
              {itemCount > 0 && (
                <span className="bg-blue-600 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full min-w-[20px] text-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
