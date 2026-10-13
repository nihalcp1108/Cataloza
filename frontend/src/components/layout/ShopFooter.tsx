import React from 'react';
import { Phone, MessageCircle, MapPin, Clock, Mail } from 'lucide-react';
import { IShop } from '../../types';

interface ShopFooterProps {
  shop: IShop;
}

export const ShopFooter: React.FC<ShopFooterProps> = ({ shop }) => {
  return (
    <footer className="bg-slate-900 text-white mt-20 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Shop info */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white">{shop.name}</h3>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              {shop.description || 'Verified wholesale distributor. Direct supply to retailers and institutional buyers.'}
            </p>
            {shop.businessHours && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>{shop.businessHours}</span>
              </div>
            )}
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Direct Wholesale Desk</h4>
            <div className="space-y-2 text-sm text-slate-400">
              {shop.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span>{shop.contactPhone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>WhatsApp: +{shop.whatsappNumber}</span>
              </div>
              {shop.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <span>{shop.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Dispatch Location */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Warehouse / Depot Address</h4>
            {shop.address ? (
              <div className="flex items-start gap-2 text-sm text-slate-400">
                <MapPin className="w-4 h-4 text-slate-500 mt-1 flex-shrink-0" />
                <p>
                  {shop.address.street && `${shop.address.street}, `}
                  {shop.address.city && `${shop.address.city}, `}
                  {shop.address.state} {shop.address.postalCode && `- ${shop.address.postalCode}`}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Contact supplier for depot details.</p>
            )}
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} {shop.name}. All wholesale rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <span>Powered by</span>
            <span className="font-semibold text-slate-300">WholesaleFlow Multi-Tenant Platform</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
