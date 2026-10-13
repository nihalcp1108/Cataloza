import React from 'react';
import { Layers } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-slate-900">WholesaleFlow</span>
            </div>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              The modern multi-tenant commerce architecture for wholesale distributors, FMCG suppliers, and B2B traders. Digital catalogues, transparent bulk pricing, and instant WhatsApp ordering.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Platform</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><a href="#features" className="hover:text-slate-900">Multi-Tenant Stores</a></li>
              <li><a href="#how-it-works" className="hover:text-slate-900">WhatsApp Handoff</a></li>
              <li><a href="#faq" className="hover:text-slate-900">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Portals</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><a href="/login" className="hover:text-slate-900">Customer Login</a></li>
              <li><a href="/admin/login" className="hover:text-slate-900">Shop Admin Portal</a></li>
              <li><a href="/superadmin/login" className="hover:text-slate-900">Super Admin Portal</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} WholesaleFlow Multi-Tenant Commerce Platform. All rights reserved.</p>
          <div className="flex gap-6">
            <span>Enterprise-Grade Multi-Tenant Isolation</span>
            <span>PDF Invoices</span>
            <span>WhatsApp Ordering</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
