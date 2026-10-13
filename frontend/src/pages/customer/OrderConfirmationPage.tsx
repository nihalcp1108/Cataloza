import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  MessageCircle,
  Copy,
  Download,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  FileText,
} from 'lucide-react';
import { api } from '../../api/client';
import { IOrder, IShop } from '../../types';
import { ShopNavbar } from '../../components/layout/ShopNavbar';
import { ShopFooter } from '../../components/layout/ShopFooter';
import { Button } from '../../components/common/Button';

export const OrderConfirmationPage: React.FC = () => {
  const { shopSlug, orderId } = useParams<{ shopSlug: string; orderId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [order, setOrder] = useState<IOrder | null>((location.state as any)?.order || null);
  const [handoff, setHandoff] = useState<any>((location.state as any)?.handoff || null);
  const [shop, setShop] = useState<IShop | null>(null);
  const [isLoading, setIsLoading] = useState(!order);
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        if (!order && orderId) {
          const orderRes = await api.get(`/customers/me/orders/${orderId}`);
          if (orderRes.data?.success) {
            setOrder(orderRes.data.data.order);
          }
        }

        if (shopSlug) {
          const shopRes = await api.get(`/public/shops/${shopSlug}`);
          if (shopRes.data?.success) {
            setShop(shopRes.data.data.shop);
          }
        }
      } catch {
        // Handle error
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrderData();
  }, [order, orderId, shopSlug]);

  const handleOpenWhatsApp = () => {
    if (handoff?.whatsappUrl) {
      window.open(handoff.whatsappUrl, '_blank', 'noopener,noreferrer');
    } else if (order && shop) {
      const cleanPhone = shop.whatsappNumber.replace(/[^0-9]/g, '');
      const msg = `Hello ${shop.name}, I have placed wholesale order ${order.orderNumber} for total ${order.currencySymbol}${order.grandTotal}.`;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyOrderText = async () => {
    const textToCopy = handoff?.messageText || `Order ${order?.orderNumber} placed for ${order?.currencySymbol}${order?.grandTotal}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setHasCopied(true);
      toast.success('Order summary copied to clipboard!');
      setTimeout(() => setHasCopied(false), 3000);
    } catch {
      toast.error('Could not copy automatically. Please copy manually.');
    }
  };

  const handleDownloadInvoice = async () => {
    if (!orderId) return;
    try {
      const res = await api.get(`/customers/me/orders/${orderId}/invoice`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${order?.orderNumber || 'order'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Invoice downloaded successfully');
    } catch {
      toast.error('Could not generate invoice. Please try again.');
    }
  };

  if (isLoading || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const currencySymbol = order.currencySymbol || '₹';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {shop && <ShopNavbar shop={shop} />}

      <main className="flex-1 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Success Banner */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-10 shadow-sm text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Order Saved in Database
            </span>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-4 tracking-tight">
              Order Confirmed: {order.orderNumber}
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Your order is registered with <span className="font-semibold text-slate-800">{order.customerSnapshot.name}</span>. Click below to launch WhatsApp with your prefilled order specifications.
            </p>

            {/* Direct WhatsApp Callout */}
            <div className="mt-8 p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-left space-y-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">Final Step: Send Order over WhatsApp</h3>
                  <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                    WhatsApp will open with your prefilled order items and delivery details. Review the message and press <strong>Send</strong> to notify the wholesale supplier.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="whatsapp"
                  size="lg"
                  className="flex-1"
                  icon={<MessageCircle className="w-5 h-5" />}
                  onClick={handleOpenWhatsApp}
                >
                  Open WhatsApp Desk
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="bg-white hover:bg-slate-50 border-emerald-300 text-emerald-800"
                  icon={<Copy className="w-4 h-4" />}
                  onClick={handleCopyOrderText}
                >
                  {hasCopied ? 'Copied to Clipboard!' : 'Copy Order Text'}
                </Button>
              </div>
            </div>

            {/* Invoices & History Links */}
            <div className="mt-6 flex flex-wrap justify-center gap-4 pt-6 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                icon={<Download className="w-4 h-4" />}
                onClick={handleDownloadInvoice}
              >
                Download PDF Invoice
              </Button>

              <Link to="/account/orders">
                <Button variant="ghost" size="sm" icon={<ShoppingBag className="w-4 h-4" />}>
                  View All Orders
                </Button>
              </Link>
            </div>
          </div>

          {/* Saved Order Breakdown */}
          <div className="mt-8 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              Immutable Order Snapshot
            </h2>

            {/* Destination Address */}
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-900">Delivery Recipient:</p>
              <p>{order.deliveryAddress.fullName} {order.deliveryAddress.businessName && `(${order.deliveryAddress.businessName})`}</p>
              <p>{order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.postalCode}</p>
              <p>Phone: {order.deliveryAddress.phone}</p>
            </div>

            {/* Items */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-xs py-2 border-b border-slate-50">
                  <div>
                    <span className="font-semibold text-slate-900">{item.name}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">SKU: {item.sku}</span>
                    <span className="text-slate-500 text-[11px]">
                      {item.quantity} {item.unit}s × {currencySymbol}{item.unitPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {currencySymbol}{item.lineTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="pt-2 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">{currencySymbol}{order.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-3 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-blue-600">{currencySymbol}{order.grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {shop && <ShopFooter shop={shop} />}
    </div>
  );
};
