import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingBag, Store, Calendar } from 'lucide-react';
import { api } from '../../api/client';
import { IOrder, IShop } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Pagination } from '../../components/common/Pagination';
import { TableRowSkeleton } from '../../components/common/LoadingSkeleton';

export const PlatformOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [shops, setShops] = useState<IShop[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [shopId, setShopId] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const params: any = { page, limit: 12 };
      if (search) params.search = search;
      if (shopId) params.shopId = shopId;
      if (status) params.status = status;
      if (paymentStatus) params.paymentStatus = paymentStatus;

      const [ordRes, shopRes] = await Promise.all([
        api.get('/super-admin/orders', { params }),
        api.get('/super-admin/shops', { params: { limit: 100 } }),
      ]);

      if (ordRes.data?.success) {
        setOrders(ordRes.data.data.orders);
        setPagination(ordRes.data.data.pagination);
      }
      if (shopRes.data?.success) {
        setShops(shopRes.data.data.shops);
      }
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, search, shopId, status, paymentStatus]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Platform Orders Overview</h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor wholesale order transactions, fulfillment states, and volumes across all registered shops.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by order number or customer..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={shopId}
            onChange={(e) => {
              setShopId(e.target.value);
              setPage(1);
            }}
            className="text-xs text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
          >
            <option value="">All Shops</option>
            {shops.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="text-xs text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
          >
            <option value="">All Fulfillment Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="ready_for_dispatch">Ready for Dispatch</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Order No</th>
                <th className="py-3 px-4">Wholesale Shop</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Grand Total</th>
                <th className="py-3 px-4">Fulfillment</th>
                <th className="py-3 px-4">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={8} />)
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {ord.orderNumber}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-indigo-700">
                      {ord.shopId?.name || 'Shop'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-800">
                      {ord.customerSnapshot?.name}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(ord.createdAt).toLocaleDateString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {ord.items.length} item{ord.items.length !== 1 ? 's' : ''}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      ₹{ord.grandTotal.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge status={ord.orderStatus} type="order" />
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge status={ord.paymentStatus} type="payment" />
                    </td>
                  </tr>
                ))
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
