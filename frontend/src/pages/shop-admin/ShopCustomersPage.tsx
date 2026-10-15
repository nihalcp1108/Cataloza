import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Phone,
  MessageSquare,
  Building,
  MapPin,
  Calendar,
  ExternalLink,
  ShoppingBag,
  ArrowRight,
  X,
  CreditCard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { IShopCustomer, ICustomerDetail } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const ShopCustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<IShopCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<ICustomerDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchCustomers = async (search = '') => {
    try {
      setIsLoading(true);
      const res = await api.get('/shop-admin/customers', {
        params: { search: search || undefined },
      });
      if (res.data?.success && res.data?.data?.customers) {
        setCustomers(res.data.data.customers);
      }
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(searchQuery);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(searchQuery);
  };

  const handleOpenDetail = async (phone: string) => {
    setSelectedPhone(phone);
    try {
      setIsLoadingDetail(true);
      const res = await api.get(`/shop-admin/customers/${encodeURIComponent(phone)}`);
      if (res.data?.success && res.data?.data) {
        setCustomerDetail(res.data.data);
      }
    } catch {
      toast.error('Failed to load customer profile');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedPhone(null);
    setCustomerDetail(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-600" />
            Wholesale Customer Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Accounts and buyer profiles compiled automatically from your shop orders.
          </p>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total Buyers: <span className="font-bold text-slate-900">{customers.length}</span>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by buyer name, mobile, business, or city..."
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button type="submit" variant="primary" size="sm">
          Search
        </Button>
      </form>

      {/* Customer List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No customer profiles found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Buyer profiles will automatically populate here as guests submit orders through your public catalogue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Customer / Business</th>
                  <th className="py-3.5 px-4">Contact Phone</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4 text-center">Orders Placed</th>
                  <th className="py-3.5 px-4 text-right">Total Spend</th>
                  <th className="py-3.5 px-4 text-right">Last Order</th>
                  <th className="py-3.5 px-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {customers.map((c) => (
                  <tr key={c.phone} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {c.name || 'Anonymous Customer'}
                      </div>
                      {c.businessName && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{c.businessName}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-mono text-slate-800">{c.phone}</div>
                      {c.whatsapp && (
                        <a
                          href={`https://wa.me/${c.whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold hover:underline mt-0.5"
                        >
                          <MessageSquare className="w-3 h-3" />
                          WhatsApp
                        </a>
                      )}
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap text-slate-600">
                      {c.city ? (
                        <span>
                          {c.city}
                          {c.state ? `, ${c.state}` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs">
                        {c.orderCount}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right whitespace-nowrap font-bold text-slate-900">
                      ₹{c.totalSpent.toLocaleString('en-IN')}
                    </td>

                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="text-slate-700">
                        {new Date(c.lastOrderDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      {c.lastOrderNumber && (
                        <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                          {c.lastOrderNumber}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-5 text-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDetail(c.phone)}
                        className="text-xs"
                      >
                        View Profile
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Details Drawer / Modal */}
      {selectedPhone && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {customerDetail?.customer?.name?.charAt(0) || <Users className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {customerDetail?.customer?.name || 'Customer Details'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">{selectedPhone}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseDetail}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingDetail || !customerDetail ? (
                <div className="py-20 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
                      <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                        Total Orders
                      </span>
                      <span className="text-2xl font-black text-slate-900 mt-1 block">
                        {customerDetail.customer.totalOrders}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                      <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                        Lifetime Spend
                      </span>
                      <span className="text-2xl font-black text-slate-900 mt-1 block">
                        ₹{customerDetail.customer.totalSpent.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Contact Actions */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Contact Details</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" /> Mobile:
                        </span>
                        <a href={`tel:${customerDetail.customer.phone}`} className="font-bold text-blue-600 hover:underline">
                          {customerDetail.customer.phone}
                        </a>
                      </div>

                      {customerDetail.customer.businessName && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5" /> Business:
                          </span>
                          <span className="font-medium text-slate-800">{customerDetail.customer.businessName}</span>
                        </div>
                      )}

                      <div className="pt-2">
                        <a
                          href={`https://wa.me/${(customerDetail.customer.whatsapp || customerDetail.customer.phone).replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Chat on WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Saved Delivery Addresses */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      Known Delivery Addresses
                    </h4>

                    {customerDetail.addresses.length === 0 ? (
                      <p className="text-xs text-slate-400">No delivery address saved.</p>
                    ) : (
                      <div className="space-y-2">
                        {customerDetail.addresses.map((addr, idx) => (
                          <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 space-y-0.5">
                            <div className="font-bold text-slate-900">{addr.addressLine1 || addr.street}</div>
                            {addr.addressLine2 && <div className="text-slate-500">{addr.addressLine2}</div>}
                            <div className="text-slate-600">
                              {addr.city}
                              {addr.district ? `, ${addr.district}` : ''}
                              {addr.state ? `, ${addr.state}` : ''} - {addr.postalCode}
                            </div>
                            <div className="text-[11px] text-slate-400">{addr.country || 'India'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Order History */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                      Purchase Order History
                    </h4>

                    <div className="space-y-2.5">
                      {customerDetail.orders.map((ord) => (
                        <Link
                          key={ord._id}
                          to={`/admin/orders/${ord._id}`}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 transition-all group"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-blue-600">
                                {ord.orderNumber}
                              </span>
                              <Badge status={ord.orderStatus} type="order" />
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}{' '}
                              · {ord.itemsCount} {ord.itemsCount === 1 ? 'item' : 'items'}
                            </p>
                          </div>

                          <div className="text-right flex items-center gap-3">
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">
                                ₹{ord.grandTotal.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                                {ord.paymentStatus}
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
