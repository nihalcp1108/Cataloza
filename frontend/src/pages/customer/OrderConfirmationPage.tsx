import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useSearchParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  MessageCircle,
  Copy,
  Download,
  ArrowRight,
  ChevronLeft,
  ShieldCheck,
  ShoppingBag,
  Store,
  Check,
} from 'lucide-react';
import { api } from '../../api/client';
import { IOrder, IShop } from '../../types';
import { ShopNavbar } from '../../components/layout/ShopNavbar';
import { ShopFooter } from '../../components/layout/ShopFooter';
import { Button } from '../../components/common/Button';

export const OrderConfirmationPage: React.FC = () => {
  const { shopSlug, orderId } = useParams<{ shopSlug: string; orderId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const tokenFromUrl = searchParams.get('token') || '';

  const [order, setOrder] = useState<IOrder | null>((location.state as any)?.order || null);
  const [handoff, setHandoff] = useState<any>((location.state as any)?.handoff || null);
  const [shop, setShop] = useState<IShop | null>(null);
  const [isLoading, setIsLoading] = useState(!order);
  const [hasCopied, setHasCopied] = useState(false);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        if (!shopSlug || !orderId) return;

        // Fetch order details via secure confirmation endpoint (using token if guest)
        if (!order) {
          const res = await api.get(`/shops/${shopSlug}/orders/${orderId}/confirmation`, {
            params: { token: tokenFromUrl },
          });
          if (res.data?.success) {
            setOrder(res.data.data.order);
            setHandoff(res.data.data.handoff);
            if (res.data.data.shop) {
              setShop(res.data.data.shop);
            }
          }
        }

        // Fetch shop details if not already loaded
        if (!shop) {
          const shopRes = await api.get(`/public/shops/${shopSlug}`);
          if (shopRes.data?.success) {
            setShop(shopRes.data.data.shop);
          }
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Could not load order confirmation.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderData();
  }, [order, orderId, shopSlug, tokenFromUrl, shop]);

  const handleOpenWhatsApp = () => {
    if (handoff?.whatsappUrl) {
      window.open(handoff.whatsappUrl, '_blank', 'noopener,noreferrer');
    } else if (order && shop) {
      const cleanPhone = shop.whatsappNumber.replace(/[^0-9]/g, '');
      const greeting = `CATALOZA — ORDER REQUEST\nShop: ${shop.name}\nOrder No: ${order.orderNumber}\nCustomer: ${order.deliveryAddress?.fullName || order.customerSnapshot.name}\nTotal: ${order.currencySymbol}${order.grandTotal}`;
      window.open(
        `https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  const handleCopyOrderText = async () => {
    const textToCopy =
      handoff?.messageText ||
      `CATALOZA ORDER REQUEST\nOrder: ${order?.orderNumber}\nShop: ${shop?.name}\nCustomer: ${order?.deliveryAddress?.fullName || order?.customerSnapshot.name}\nTotal: ${order?.currencySymbol}${order?.grandTotal}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setHasCopied(true);
      toast.success('Order details copied to clipboard!');
      setTimeout(() => setHasCopied(false), 3000);
    } catch {
      toast.error('Could not copy automatically. Please copy manually.');
    }
  };

  const handleDownloadInvoice = async () => {
    if (!orderId || !shopSlug) return;
    setIsDownloadingInvoice(true);
    try {
      const effectiveToken = tokenFromUrl || (order as any)?.guestAccessToken;
      const res = await api.get(`/shops/${shopSlug}/orders/${orderId}/invoice`, {
        params: { token: effectiveToken },
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
    } finally {
      setIsDownloadingInvoice(false);
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
  const customerDisplayName = order.deliveryAddress?.fullName || order.customerSnapshot.name;
  const shopDisplayName = shop?.name || 'Wholesale Supplier';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {shop && <ShopNavbar shop={shop} />}

      <main className="flex-1 py-10 sm:py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Success Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 shadow-sm text-center">
            {/* Green Badge */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 inline-block">
              Order Successfully Saved
            </span>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-4 tracking-tight">
              Order No: {order.orderNumber}
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Order registered for <span className="font-bold text-slate-800">{customerDisplayName}</span> with <span className="font-bold text-slate-800">{shopDisplayName}</span>.
            </p>

            <div className="mt-3 inline-flex items-baseline gap-1.5 px-4 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500">Final Order Total:</span>
              <span className="font-extrabold text-blue-600 text-sm">
                {currencySymbol}{order.grandTotal.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Crucial Instruction Notice as requested */}
            <div className="mt-8 p-6 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-left space-y-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">Next Step: Launch WhatsApp</h3>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed font-medium">
                    Your order has been saved. Please send the prepared message in WhatsApp to complete your order request.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="whatsapp"
                  size="lg"
                  className="flex-1 text-sm font-bold shadow-md hover:shadow-lg transition-all"
                  icon={<MessageCircle className="w-5 h-5" />}
                  onClick={handleOpenWhatsApp}
                >
                  Continue to WhatsApp
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="bg-white hover:bg-slate-50 border-emerald-300 text-emerald-800 text-xs font-semibold"
                  icon={hasCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  onClick={handleCopyOrderText}
                >
                  {hasCopied ? 'Copied to Clipboard!' : 'Copy Order Details'}
                </Button>
              </div>
            </div>

            {/* Back to Shop & Download PDF buttons */}
            <div className="mt-6 flex flex-wrap justify-center items-center gap-3 pt-6 border-t border-slate-100">
              <Link to={`/${shopSlug}`}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Store className="w-4 h-4" />}
                >
                  Back to Shop
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                icon={<Download className="w-4 h-4" />}
                isLoading={isDownloadingInvoice}
                onClick={handleDownloadInvoice}
              >
                Download Invoice PDF
              </Button>
            </div>
          </div>

          {/* Immutable Order Breakdown */}
          <div className="mt-8 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              Saved Order Specifications
            </h2>

            {/* Delivery Address */}
            <div className="text-xs text-slate-600 space-y-1">
              <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                Delivery Details:
              </span>
              <p className="font-semibold text-slate-800">
                {order.deliveryAddress.fullName}
                {order.deliveryAddress.businessName && ` (${order.deliveryAddress.businessName})`}
              </p>
              <p>
                {order.deliveryAddress.addressLine1 || order.deliveryAddress.street}
                {order.deliveryAddress.addressLine2 && `, ${order.deliveryAddress.addressLine2}`}
              </p>
              <p>
                {order.deliveryAddress.city}
                {order.deliveryAddress.district && `, ${order.deliveryAddress.district}`}
                {', ' + order.deliveryAddress.state} - {order.deliveryAddress.postalCode}
              </p>
              <p>Mobile: {order.deliveryAddress.phone}</p>
              {order.deliveryAddress.whatsapp && (
                <p>WhatsApp: {order.deliveryAddress.whatsapp}</p>
              )}
            </div>

            {/* Line Items */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                Items ({order.items.length}):
              </span>
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-xs py-2 border-b border-slate-50">
                  <div>
                    <span className="font-semibold text-slate-900">{item.name}</span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>SKU: {item.sku}</span>
                      {item.variantName && (
                        <span className="text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-sans">
                          {item.variantName}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500 text-[11px]">
                      {item.quantity} {item.unit || 'unit'}s × {currencySymbol}{item.unitPrice.toLocaleString('en-IN')}
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
                <span className="font-semibold text-slate-900">
                  {currencySymbol}{order.subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span className="font-semibold text-emerald-600">Free / Confirmed via WhatsApp</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-3 border-t border-slate-200">
                <span>Total Payable:</span>
                <span className="text-blue-600">
                  {currencySymbol}{order.grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {shop && <ShopFooter shop={shop} />}
    </div>
  );
};
