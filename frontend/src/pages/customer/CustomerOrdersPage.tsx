import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShoppingBag, Download, ArrowRight, Store, Calendar, FileText } from 'lucide-react';
import { api } from '../../api/client';
import { IOrder } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';

export const CustomerOrdersPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<IOrder[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      navigate('/login');
    }
  }, [user, isAuthLoading, navigate]);

  const fetchOrders = async (page = 1) => {
    try {
      setIsLoading(true);
      const res = await api.get('/customers/me/orders', { params: { page, limit: 10 } });
      if (res.data?.success) {
        setOrders(res.data.data.orders);
        setPagination(res.data.data.pagination);
      }
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders(1);
    }
  }, [user]);

  const handleDownloadInvoice = async (orderId: string, orderNumber: string) => {
    try {
      const res = await api.get(`/customers/me/orders/${orderId}/invoice`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${orderNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Invoice downloaded');
    } catch {
      toast.error('Could not download invoice');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          My Wholesale Orders
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Track real-time status and download authoritative invoices for past wholesale purchases.
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center bg-white rounded-xl border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <EmptyState
            title="No wholesale orders yet"
            description="You have not placed any orders yet. Browse any of our wholesale suppliers to begin."
            actionLabel="Explore Suppliers"
            onAction={() => navigate('/')}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => {
            const shopName = ord.shopId?.name || 'Wholesale Supplier';
            const shopSlug = ord.shopId?.slug || '';

            return (
              <div
                key={ord._id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {ord.orderNumber}
                    </span>
                    <Badge status={ord.orderStatus} type="order" />
                    <Badge status={ord.paymentStatus} type="payment" />
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    {shopSlug ? (
                      <Link
                        to={`/${shopSlug}`}
                        className="flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                      >
                        <Store className="w-3.5 h-3.5" />
                        {shopName}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Store className="w-3.5 h-3.5" />
                        {shopName}
                      </span>
                    )}

                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600">
                    {ord.items.length} item{ord.items.length !== 1 ? 's' : ''}:{' '}
                    {ord.items.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}
                  </div>
                </div>

                <div className="flex items-center justify-between md:flex-col md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Total Amount</span>
                    <span className="text-base font-black text-slate-900">
                      {ord.currencySymbol}
                      {ord.grandTotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Download className="w-3.5 h-3.5" />}
                      onClick={() => handleDownloadInvoice(ord._id, ord.orderNumber)}
                    >
                      Invoice PDF
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => fetchOrders(page)}
          />
        </div>
      )}
    </div>
  );
};
