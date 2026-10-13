import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  MessageCircle,
  ShieldCheck,
  FileText,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Package,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../api/client';
import { IShop } from '../../types';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/common/Button';

export const PlatformLandingPage: React.FC = () => {
  const [featuredShops, setFeaturedShops] = useState<IShop[]>([]);
  const [totalShops, setTotalShops] = useState(0);

  useEffect(() => {
    const fetchLandingData = async () => {
      try {
        const res = await api.get('/public/landing');
        if (res.data?.success) {
          setFeaturedShops(res.data.data.featuredShops || []);
          setTotalShops(res.data.data.totalShops || 0);
        }
      } catch {
        // Fallback gracefully
      }
    };
    fetchLandingData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Multi-Tenant Wholesale Commerce Platform
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
              Publish wholesale prices. <br className="hidden sm:inline" />
              <span className="text-blue-600">Close orders over WhatsApp.</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Empower wholesale distributors, manufacturers, and trade suppliers with independent digital catalogues, verified wholesale pricing, and instant WhatsApp ordering.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg" variant="primary" icon={<ArrowRight className="w-4 h-4" />}>
                  Register Customer Account
                </Button>
              </Link>
              <Link to="/admin/login">
                <Button size="lg" variant="outline" icon={<Store className="w-4 h-4" />}>
                  Shop Admin Portal
                </Button>
              </Link>
            </div>

            {/* Quick stats counter */}
            <div className="mt-12 pt-8 border-t border-slate-200/80 max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-black text-slate-900">{totalShops || '2+'}</p>
                <p className="text-xs text-slate-500 font-medium">Active Suppliers</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">100%</p>
                <p className="text-xs text-slate-500 font-medium">Public Pricing</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">1-Click</p>
                <p className="text-xs text-slate-500 font-medium">WhatsApp Handoff</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">Instant</p>
                <p className="text-xs text-slate-500 font-medium">PDF Invoices</p>
              </div>
            </div>
          </div>
        </section>

        {/* Live Wholesale Catalogues Preview */}
        {featuredShops.length > 0 && (
          <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Featured Wholesale Suppliers</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Browse real-time catalogues and wholesale rates from registered distributors.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredShops.map((shop) => (
                <div
                  key={shop._id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      {shop.logo ? (
                        <img src={shop.logo} alt={shop.name} className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                          style={{ backgroundColor: shop.accentColor || '#2563eb' }}
                        >
                          <Store className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-tight">{shop.name}</h3>
                        <p className="text-xs text-slate-400 font-mono">/{shop.slug}</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                      {shop.description || 'Verified wholesale distributor with transparent bulk pricing.'}
                    </p>

                    <div className="text-xs text-slate-500 space-y-1 py-2 border-t border-slate-100">
                      <p>WhatsApp: +{shop.whatsappNumber}</p>
                      {shop.address?.city && <p>Depot: {shop.address.city}, {shop.address.state}</p>}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <Link to={`/${shop.slug}`}>
                      <Button variant="primary" size="sm" className="w-full" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                        Open Wholesale Catalogue
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* How It Works Section */}
        <section id="how-it-works" className="py-16 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">How WhatsApp Ordering Works</h2>
              <p className="mt-2 text-sm text-slate-600">
                A seamless flow that bridges web catalogues with direct WhatsApp business communication.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold mb-4">
                  1
                </div>
                <h3 className="text-base font-bold text-slate-900">Browse & Build Cart</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Retailers browse public wholesale rates without requiring an account. Check minimum quantities, specifications, and SKU details.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold mb-4">
                  2
                </div>
                <h3 className="text-base font-bold text-slate-900">Database-First Checkout</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Customer details and delivery address are verified. The backend generates immutable item snapshots and saves the order to MongoDB.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold mb-4">
                  3
                </div>
                <h3 className="text-base font-bold text-slate-900">WhatsApp Handoff</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  WhatsApp opens with a prefilled message containing order number, line items, and delivery address. The retailer presses send to finalize dispatch.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section id="features" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Engineered for Wholesale Businesses</h2>
            <p className="mt-2 text-sm text-slate-600">
              Complete separation of tenant data, orders, and administrative controls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200">
              <ShieldCheck className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="text-sm font-bold text-slate-900">Multi-Tenant Isolation</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Every supplier gets their own slug (<span className="font-mono">/shop-name</span>), isolated orders, and restricted admin access.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200">
              <Package className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="text-sm font-bold text-slate-900">MOQ & Variants</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Enforce minimum order quantities and manage product variants with distinct SKUs and wholesale pricing.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200">
              <FileText className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="text-sm font-bold text-slate-900">Server PDF Invoices</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Downloadable PDF documents generated directly from saved order records, protected by authorization guards.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200">
              <TrendingUp className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="text-sm font-bold text-slate-900">Analytics & Tracking</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Shop admins track revenue, pending orders, top-selling items, and manage payment states manually.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-16 bg-white border-t border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-black text-slate-900 text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                <h3 className="text-sm font-bold text-slate-900">Do customers need an account to browse wholesale prices?</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  No. Wholesale prices are completely public. Anyone can search and view products. An account is only required when completing checkout.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                <h3 className="text-sm font-bold text-slate-900">Can a customer add items from two different shops to the same cart?</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  No. Each wholesale supplier operates independently. If a customer attempts to add an item from another shop, a clear prompt asks if they want to clear their current cart and switch suppliers, or keep their existing items.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                <h3 className="text-sm font-bold text-slate-900">Does WhatsApp ordering require an expensive API?</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  No. The platform utilizes standard WhatsApp Click-to-Chat handoff (<span className="font-mono">https://wa.me</span>). The order is saved in the database first, then WhatsApp opens with the prefilled order summary so the buyer can hit Send.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
