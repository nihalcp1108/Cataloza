import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  MessageCircle,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  Package,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../api/client';
import { IProduct, IShop } from '../../types';
import { useCart } from '../../contexts/CartContext';
import { ShopNavbar } from '../../components/layout/ShopNavbar';
import { ShopFooter } from '../../components/layout/ShopFooter';
import { ProductCard } from '../../components/catalogue/ProductCard';
import { CartDrawer } from '../../components/cart/CartDrawer';
import { DifferentShopModal } from '../../components/cart/DifferentShopModal';
import { Button } from '../../components/common/Button';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';

export const ProductDetailPage: React.FC = () => {
  const { shopSlug, productSlug } = useParams<{ shopSlug: string; productSlug: string }>();
  const { setShopSlug, addToCart, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  const [shop, setShop] = useState<IShop | null>(null);
  const [product, setProduct] = useState<IProduct | null>(null);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<IProduct[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    if (shopSlug) setShopSlug(shopSlug);
  }, [shopSlug, setShopSlug]);

  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!shopSlug || !productSlug) return;
      try {
        setIsLoading(true);
        const res = await api.get(`/public/shops/${shopSlug}/products/${productSlug}`);
        if (res.data?.success) {
          const prod: IProduct = res.data.data.product;
          setShop(res.data.data.shop);
          setProduct(prod);
          setFormFields(res.data.data.formFields || []);
          setRelatedProducts(res.data.data.relatedProducts || []);
          setQuantity(prod.minimumOrderQuantity || 1);
          if (prod.variants && prod.variants.length > 0) {
            setSelectedVariant(prod.variants[0].name);
          }
        }
      } catch {
        navigate(`/${shopSlug}`, { replace: true });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProductDetails();
  }, [shopSlug, productSlug, navigate]);

  if (isLoading || !product || !shop) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Active price calculation depending on variant
  let currentPrice = product.price;
  if (selectedVariant && product.variants) {
    const v = product.variants.find((item) => item.name === selectedVariant);
    if (v) currentPrice = v.price;
  }

  const images = product.images.length > 0
    ? product.images
    : ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'];

  const isOutOfStock = product.trackInventory && product.stockQuantity <= 0;
  const currencySymbol = shop.currencySymbol || '₹';

  const handleAddToCart = async () => {
    if (isOutOfStock) return;
    setIsAddingToCart(true);
    try {
      await addToCart(product, quantity, selectedVariant || undefined);
      setIsCartOpen(true);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const rawPhone = (shop.whatsappNumber || '').replace(/[^0-9]/g, '');
  const normalizedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
  const directWhatsAppInquiryUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
    `Hello ${shop.name}, I would like to order "${product.name}" (SKU: ${product.sku}, Quantity: ${quantity} ${product.unit}). Please confirm stock and delivery.`
  )}`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ShopNavbar shop={shop} />

      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
            <Link to={`/${shop.slug}`} className="hover:text-slate-900 flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to {shop.name}</span>
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold truncate">{product.name}</span>
          </nav>

          {/* Product Details Hero Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {/* Left: Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-square rounded-2xl bg-slate-100 overflow-hidden border border-slate-200/60 relative">
                <img
                  src={getOptimizedImageUrl(images[activeImageIndex], { width: 900, quality: 85 })}
                  alt={product.name}
                  className="w-full h-full object-cover object-center"
                  loading="eager"
                />
                {product.isFeatured && (
                  <span className="absolute top-4 left-4 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Featured
                  </span>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-colors ${
                        activeImageIndex === idx ? 'border-blue-600' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img
                        src={getOptimizedImageUrl(img, { width: 160, quality: 75 })}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Pricing, MOQ, Variants, Actions */}
            <div className="flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                  <span className="font-mono uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                    SKU: {product.sku}
                  </span>
                  {product.categoryId?.name && (
                    <span className="text-slate-500 font-medium">Category: {product.categoryId.name}</span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  {product.name}
                </h1>

                {/* Wholesale Price Breakdown */}
                <div className="mt-4 p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block mb-1">
                      Wholesale Rate
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900">
                        {currencySymbol}
                        {currentPrice.toLocaleString('en-IN')}
                      </span>
                      {product.compareAtPrice && product.compareAtPrice > currentPrice && (
                        <span className="text-sm text-slate-400 line-through">
                          {currencySymbol}
                          {product.compareAtPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                      <span className="text-sm font-semibold text-slate-600">/ {product.unit}</span>
                    </div>
                  </div>

                  {product.compareAtPrice && product.compareAtPrice > currentPrice && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                      Save {Math.round(((product.compareAtPrice - currentPrice) / product.compareAtPrice) * 100)}%
                    </span>
                  )}
                </div>

                {/* Minimum Order Quantity & Stock Status */}
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-800">
                    <Package className="w-4 h-4 text-slate-500" />
                    <span>Minimum Wholesale Order: {product.minimumOrderQuantity} {product.unit}s</span>
                  </div>

                  {product.trackInventory ? (
                    product.stockQuantity > 0 ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>In Stock ({product.stockQuantity} {product.unit}s)</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Out of Stock</span>
                      </div>
                    )
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Available for Dispatch</span>
                    </div>
                  )}
                </div>

                {/* Variants Selection */}
                {product.variants && product.variants.length > 0 && (
                  <div className="mt-6">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Select Variant
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((v) => (
                        <button
                          key={v.name}
                          type="button"
                          onClick={() => setSelectedVariant(v.name)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            selectedVariant === v.name
                              ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-100'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {v.name} — {currencySymbol}{v.price.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity Controls & Line Total Preview */}
                <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Order Quantity ({product.unit}s)
                      </span>
                      {quantity < product.minimumOrderQuantity && (
                        <span className="text-[11px] text-amber-600 font-medium">
                          Below required MOQ ({product.minimumOrderQuantity})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm">
                      <button
                        onClick={() => setQuantity(Math.max(product.minimumOrderQuantity || 1, quantity - 1))}
                        className="p-2.5 hover:bg-slate-100 text-slate-600"
                        disabled={quantity <= (product.minimumOrderQuantity || 1)}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min={product.minimumOrderQuantity || 1}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 text-center text-sm font-bold text-slate-900 focus:outline-none"
                      />
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="p-2.5 hover:bg-slate-100 text-slate-600"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span>Line Estimate ({quantity} {product.unit}s):</span>
                    <span className="text-base text-blue-600">
                      {currencySymbol}
                      {(currentPrice * quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Primary Actions */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="primary"
                    size="lg"
                    className="flex-1"
                    icon={<ShoppingCart className="w-5 h-5" />}
                    disabled={isOutOfStock}
                    isLoading={isAddingToCart}
                    onClick={handleAddToCart}
                  >
                    Add to Wholesale Cart
                  </Button>

                  <a
                    href={directWhatsAppInquiryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button
                      variant="whatsapp"
                      size="lg"
                      className="w-full"
                      icon={<MessageCircle className="w-5 h-5" />}
                    >
                      Instant WhatsApp Inquiry
                    </Button>
                  </a>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div className="pt-6 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Product Description & Trade Specifications
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Dynamic Custom Fields (Configured by Super Admin Form Builder) */}
              {product.customFields && Object.keys(product.customFields).length > 0 && (
                (() => {
                  const entries = Object.entries(product.customFields).filter(([k, v]) => {
                    if (v === undefined || v === null || v === '') return false;
                    const fieldDef = formFields.find((f: any) => f.fieldKey === k);
                    if (fieldDef && fieldDef.visibleOnDetails === false) return false;
                    return true;
                  });

                  if (entries.length === 0) return null;

                  return (
                    <div className="pt-6 border-t border-slate-100">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                        Technical Specifications & Custom Attributes
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {entries.map(([key, val]) => {
                          const fieldDef = formFields.find((f: any) => f.fieldKey === key);
                          const label = fieldDef?.label || key.replace(/_/g, ' ');
                          let displayVal = String(val);
                          if (typeof val === 'boolean') {
                            displayVal = val ? 'Yes' : 'No';
                          } else if (Array.isArray(val)) {
                            displayVal = val.join(', ');
                          }

                          return (
                            <div
                              key={key}
                              className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between"
                            >
                              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                {label}
                              </span>
                              <span className="text-xs font-bold text-slate-900 mt-1">
                                {displayVal}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          {/* Related Products Section */}
          {relatedProducts.length > 0 && (
            <div className="mt-16">
              <h3 className="text-xl font-bold text-slate-900 mb-6">More Wholesale Products from {shop.name}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {relatedProducts.map((rel) => (
                  <ProductCard
                    key={rel._id}
                    product={rel}
                    shopSlug={shop.slug}
                    currencySymbol={shop.currencySymbol}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Cart & Conflict Modals */}
      <CartDrawer />
      <DifferentShopModal />

      <ShopFooter shop={shop} />
    </div>
  );
};
