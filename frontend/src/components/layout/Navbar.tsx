import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, User, LogOut, LayoutDashboard, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';

export const Navbar: React.FC = () => {
  const { user, logout, isSuperAdmin, isShopAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Platform Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900">Wholesale<span className="text-blue-600">Flow</span></span>
              <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 uppercase tracking-wider">
                Multi-Tenant
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Platform Overview
            </Link>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              How It Works
            </a>
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Features
            </a>
          </nav>

          {/* User Account / Auth Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {isSuperAdmin && (
                  <Link to="/superadmin/dashboard">
                    <Button size="sm" variant="outline" icon={<LayoutDashboard className="w-3.5 h-3.5" />}>
                      Super Admin
                    </Button>
                  </Link>
                )}
                {isShopAdmin && (
                  <Link to="/admin/dashboard">
                    <Button size="sm" variant="outline" icon={<LayoutDashboard className="w-3.5 h-3.5" />}>
                      Shop Dashboard
                    </Button>
                  </Link>
                )}
                {!isSuperAdmin && !isShopAdmin && (
                  <Link to="/account/orders">
                    <Button size="sm" variant="outline" icon={<ShoppingBag className="w-3.5 h-3.5" />}>
                      My Orders
                    </Button>
                  </Link>
                )}

                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-900 leading-tight">{user.name}</span>
                  <span className="text-[10px] text-slate-400 capitalize">{user.role.replace('_', ' ')}</span>
                </div>

                <Button size="sm" variant="ghost" icon={<LogOut className="w-3.5 h-3.5" />} onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Register Customer
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
