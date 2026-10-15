import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  Download,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  CreditCard,
  FileText,
  AlertCircle,
  Save,
  MessageCircle,
} from 'lucide-react';
import { api } from '../../api/client';
import { IOrder, OrderStatus, PaymentStatus } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';

export const ShopOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<IOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Status transition state
  const [newStatus, setNewStatus] = useState<OrderStatus>('pending');
  const [statusNote, setStatusNote] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Payment status modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  // Internal notes
  const [internalNotes, setInternalNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [customerWhatsAppUrl, setCustomerWhatsAppUrl] = useState('');

  const fetchOrder = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/shop-admin/orders/${id}`);
      if (res.data?.success) {
        const ord = res.data.data.order;
        setOrder(ord);
        setCustomerWhatsAppUrl(res.data.data.customerWhatsAppUrl || '');
        setNewStatus(ord.orderStatus);
        setPaymentStatus(ord.paymentStatus);
        setPaymentAmount(ord.grandTotal);
        setInternalNotes(ord.internalNotes || '');
      }
    } catch {
      toast.error('Failed to load order');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleUpdateStatus = async () => {
    if (newStatus === order?.orderStatus) return;
    setIsUpdatingStatus(true);
    try {
      await api.patch(`/shop-admin/orders/${id}/status`, {
        status: newStatus,
        note: statusNote || undefined,
        cancellationReason: newStatus === 'cancelled' ? cancellationReason : undefined,
      });
      toast.success(`Order marked as ${newStatus}`);
      setStatusNote('');
      setCancellationReason('');
      fetchOrder();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPayment(true);
    try {
      await api.patch(`/shop-admin/orders/${id}/payment`, {
        status: paymentStatus,
        amount: paymentAmount,
        reference: paymentReference,
        note: paymentNote,
      });
      toast.success('Payment status updated');
      setIsPaymentModalOpen(false);
      fetchOrder();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update payment');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleSaveInternalNotes = async () => {
    setIsSavingNotes(true);
    try {
      await api.post(`/shop-admin/orders/${id}/notes`, { internalNotes });
      toast.success('Internal notes saved');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;
    try {
      const res = await api.get(`/shop-admin/orders/${order._id}/invoice`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${order.orderNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Invoice downloaded');
    } catch {
      toast.error('Could not download invoice');
    }
  };

  if (isLoading || !order) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currencySymbol = order.currencySymbol || '₹';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin/orders" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {order.orderNumber}
              </h1>
              <Badge status={order.orderStatus} type="order" />
              <Badge status={order.paymentStatus} type="payment" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={handleDownloadInvoice}
          >
            Download Invoice PDF
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<CreditCard className="w-4 h-4" />}
            onClick={() => setIsPaymentModalOpen(true)}
          >
            Update Payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Items Snapshot & Financials */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Purchased Line Items ({order.items.length})
            </h2>

            <div className="divide-y divide-slate-100">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=100&q=80'}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">{item.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono uppercase block">
                        SKU: {item.sku}
                      </span>
                      {item.variantName && (
                        <span className="inline-block text-[10px] bg-slate-100 px-1.5 py-0.2 rounded mt-0.5">
                          {item.variantName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-600 block">
                      {item.quantity} {item.unit}s × {currencySymbol}{item.unitPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="font-bold text-slate-900 block text-sm">
                      {currencySymbol}{item.lineTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Wholesale Subtotal:</span>
                <span className="font-semibold text-slate-900">{currencySymbol}{order.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge:</span>
                <span>{order.deliveryCharge > 0 ? `${currencySymbol}${order.deliveryCharge.toLocaleString('en-IN')}` : 'Free / Pending agreement'}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-3 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-blue-600">{currencySymbol}{order.grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Status History & Payment Audit Trail */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Audit Trail & Timeline History
            </h2>

            <div className="space-y-4">
              {order.statusHistory.map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 capitalize">{h.status.replace('_', ' ')}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(h.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {h.note && <p className="text-slate-500 mt-0.5">{h.note}</p>}
                    {h.changedBy && (
                      <span className="text-[10px] text-slate-400">By {h.changedBy.name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Customer Info & Status Controls */}
        <div className="space-y-6">
          {/* Status Transition Control */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Fulfillment Status
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Update Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                className="w-full text-xs font-semibold rounded-lg border border-slate-300 p-2.5 bg-white"
              >
                <option value="pending">Pending Confirmation</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="ready_for_dispatch">Ready for Dispatch</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {newStatus === 'cancelled' && (
              <Input
                label="Cancellation Reason"
                placeholder="e.g. Out of stock / Customer requested"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
              />
            )}

            <Input
              label="Transition Note (Optional)"
              placeholder="e.g. Transporter LR #123456"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
            />

            <Button
              variant="primary"
              size="sm"
              className="w-full"
              isLoading={isUpdatingStatus}
              onClick={handleUpdateStatus}
            >
              Update Order Status
            </Button>
          </div>

          {/* Customer & Address Details */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                Customer Snapshot
              </h2>
              {order.orderSource !== 'registered_customer' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <MessageCircle className="w-3 h-3 text-emerald-600" />
                  Guest WhatsApp
                </span>
              ) : (
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                  Customer Account
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="font-bold text-slate-900 text-sm">
                {order.deliveryAddress?.fullName || order.customerSnapshot?.name}
              </p>
              {(order.deliveryAddress?.businessName || order.customerSnapshot?.businessName) && (
                <p className="text-slate-600 font-medium">
                  {order.deliveryAddress?.businessName || order.customerSnapshot?.businessName}
                </p>
              )}
              <p className="text-slate-600">
                <span className="text-slate-400">Mobile:</span>{' '}
                <span className="font-semibold">{order.deliveryAddress?.phone || order.customerSnapshot?.phone}</span>
              </p>
              {(order.deliveryAddress?.whatsapp || order.customerSnapshot?.whatsapp) && (
                <p className="text-slate-600">
                  <span className="text-slate-400">WhatsApp:</span>{' '}
                  <span className="font-semibold text-emerald-700">
                    {order.deliveryAddress?.whatsapp || order.customerSnapshot?.whatsapp}
                  </span>
                </p>
              )}
              {order.customerSnapshot?.email && (
                <p className="text-slate-500">
                  <span className="text-slate-400">Email:</span> {order.customerSnapshot.email}
                </p>
              )}
            </div>

            {/* Direct WhatsApp Action Button */}
            {customerWhatsAppUrl && (
              <a
                href={customerWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Chat with Customer on WhatsApp
              </a>
            )}

            <div className="pt-3 border-t border-slate-100 space-y-1">
              <span className="font-bold text-slate-900 uppercase tracking-wider block text-[10px]">
                Delivery Address:
              </span>
              <p className="text-slate-700 leading-relaxed">
                {order.deliveryAddress?.addressLine1 || order.deliveryAddress?.street}
                {order.deliveryAddress?.addressLine2 && <span className="block">{order.deliveryAddress.addressLine2}</span>}
              </p>
              <p className="text-slate-700">
                {order.deliveryAddress?.city}
                {order.deliveryAddress?.district && `, ${order.deliveryAddress.district}`}
                {', ' + order.deliveryAddress?.state} - {order.deliveryAddress?.postalCode}
              </p>
              <p className="text-slate-500 text-[11px]">{order.deliveryAddress?.country || 'India'}</p>
            </div>

            {order.customerNotes && (
              <div className="pt-3 border-t border-slate-100">
                <span className="font-bold text-slate-900 uppercase tracking-wider block text-[10px]">
                  Customer Note:
                </span>
                <p className="text-slate-600 italic mt-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {order.customerNotes}
                </p>
              </div>
            )}
          </div>

          {/* Internal Shop Notes */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3 text-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Internal Shop Notes
            </h2>
            <textarea
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Private notes visible only to shop administrators..."
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              isLoading={isSavingNotes}
              onClick={handleSaveInternalNotes}
              icon={<Save className="w-3.5 h-3.5" />}
            >
              Save Internal Notes
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Status Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Payment Status"
      >
        <form onSubmit={handleUpdatePayment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white"
            >
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid in Full</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <Input
            label="Amount Verified (₹)"
            type="number"
            step="any"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
          />

          <Input
            label="Payment Reference / Bank UTR / NEFT"
            placeholder="e.g. UTR-9988223344"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
          />

          <Input
            label="Internal Payment Note (Optional)"
            placeholder="e.g. Bank statement verified"
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isUpdatingPayment}>
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
