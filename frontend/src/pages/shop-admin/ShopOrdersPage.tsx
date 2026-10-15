import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  Download,
  Calendar,
  Phone,
  Store,
  MessageCircle,
  Clock,
  CheckCircle,
  Package,
} from 'lucide-react';
import { api } from '../../api/client';
import { IOrder, OrderStatus, PaymentStatus } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Pagination } from '../../components/common/Pagination';
import { TableRowSkeleton } from '../../components/common/LoadingSkeleton';

export const ShopOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [summary, setSummary] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    deliveredOrders: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const params: any = { page, limit: 12 };
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      if (paymentStatus) params.paymentStatus = paymentStatus;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/shop-admin/orders', { params });
      if (res.data?.success) {
        setOrders(res.data.data.orders);
        setPagination(res.data.data.pagination);
        if (res.data.data.summary) {
          setSummary(res.data.data.summary);
        }
      }
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, search, status, paymentStatus, startDate, endDate]);

  const handleDownloadInvoice = async (orderId: string, orderNumber: string) => {
    try {
      const res = await api.get(`/shop-admin/orders/${orderId}/invoice`, {
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

  const getCleanCustomerPhone = (ord: IOrder): string => {
    const raw =
      ord.deliveryAddress?.whatsapp ||
      ord.customerSnapshot?.whatsapp ||
      ord.deliveryAddress?.phone ||
      ord.customerSnapshot?.phone ||
      '';
    let cleaned = raw.replace(/[^0-9]/g, '');
    if (cleaned.length === 10) cleaned = `91${cleaned}`;
    return cleaned;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Wholesale Orders</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review, confirm fulfillment status, verify customer WhatsApp bills, and process orders.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Orders
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {summary.totalOrders}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
              Pending Confirmation
            </span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">
              {summary.pendingOrders}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
              Confirmed / Active
            </span>
            <span className="text-2xl font-black text-blue-600 mt-1 block">
              {summary.confirmedOrders}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
              Delivered
            </span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              {summary.deliveredOrders}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by order number, customer name, phone, or town..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="text-xs text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
          >
            <option value="">All Fulfillment Statuses</option>
            <option value="pending">Pending Confirmation</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="ready_for_dispatch">Ready for Dispatch</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
            className="text-xs text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
          >
            <option value="">All Payment Statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Order No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer & Contact</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Fulfillment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={8} />)
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No orders found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const custPhone = getCleanCustomerPhone(ord);
                  const isGuestOrder = ord.orderSource !== 'registered_customer';

                  return (
                    <tr key={ord._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <Link to={`/admin/orders/${ord._id}`} className="hover:text-blue-600">
                          {ord.orderNumber}
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block">
                          {ord.deliveryAddress?.fullName || ord.customerSnapshot?.name}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {ord.deliveryAddress?.phone || ord.customerSnapshot?.phone}
                        </span>
                        {ord.deliveryAddress?.city && (
                          <span className="text-[10px] text-slate-400 block">
                            {ord.deliveryAddress.city}, {ord.deliveryAddress.state}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isGuestOrder ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                            Guest WhatsApp
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                            Customer Account
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {ord.items.length} item{ord.items.length !== 1 ? 's' : ''}:{' '}
                        {ord.items.map((i) => i.name).join(', ')}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {ord.currencySymbol || '₹'}{ord.grandTotal.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge status={ord.orderStatus} type="order" />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {custPhone && (
                            <a
                              href={`https://wa.me/${custPhone}?text=${encodeURIComponent(
                                `Hello ${ord.deliveryAddress?.fullName || ord.customerSnapshot?.name}, this is regarding your wholesale order ${ord.orderNumber}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="Chat with Customer on WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                          <Link
                            to={`/admin/orders/${ord._id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                            title="View Order Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDownloadInvoice(ord._id, ord.orderNumber)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Download PDF Invoice"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(p) => setPage(p)}
        />
      </div>
    </div>
  );
};
