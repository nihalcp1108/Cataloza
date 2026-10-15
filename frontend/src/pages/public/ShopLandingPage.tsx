import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Store, MessageCircle, AlertCircle, Phone, MapPin, Sparkles } from 'lucide-react';
import { api } from '../../api/client';
import { IShop, ICategory, IProduct } from '../../types';
import { useCart } from '../../contexts/CartContext';
import { ShopNavbar } from '../../components/layout/ShopNavbar';
import { ShopFooter } from '../../components/layout/ShopFooter';
import { ProductCard } from '../../components/catalogue/ProductCard';
import { ProductFilter } from '../../components/catalogue/ProductFilter';
import { ProductCardSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';
import { CartDrawer } from '../../components/cart/CartDrawer';
import { DifferentShopModal } from '../../components/cart/DifferentShopModal';
import { Button } from '../../components/common/Button';

export const ShopLandingPage: React.FC = () => {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const { setShopSlug } = useCart();

  const [shop, setShop] = useState<IShop | null>(null);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<IProduct[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const [isLoadingShop, setIsLoadingShop] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (shopSlug) {
      setShopSlug(shopSlug);
    }
  }, [shopSlug, setShopSlug]);

  // Fetch shop details
  useEffect(() => {
    const fetchShop = async () => {
      if (!shopSlug) return;
      try {
        setIsLoadingShop(true);
        setErrorStatus(null);
        const res = await api.get(`/public/shops/${shopSlug}`);
        if (res.data?.success) {
          setShop(res.data.data.shop);
          setCategories(res.data.data.categories || []);
          setFeaturedProducts(res.data.data.featuredProducts || []);
        }
      } catch (err: any) {
        setErrorStatus(err.response?.status || 500);
      } finally {
        setIsLoadingShop(false);
      }
    };
    fetchShop();
  }, [shopSlug]);

  // Fetch filtered products
  const fetchProducts = useCallback(async () => {
    if (!shopSlug) return;
    try {
      setIsLoadingProducts(true);
      const params: any = {
        page: currentPage,
        limit: 12,
        sortBy,
      };
      if (selectedCategory) params.categoryId = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (inStockOnly) params.inStock = 'true';

      const res = await api.get(`/public/shops/${shopSlug}/products`, { params });
      if (res.data?.success) {
        setProducts(res.data.data.products);
        setPagination({
          page: res.data.data.pagination.page,
          totalPages: res.data.data.pagination.totalPages,
          total: res.data.data.pagination.total,
        });
      }
    } catch {
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [shopSlug, currentPage, selectedCategory, searchQuery, sortBy, inStockOnly]);

  useEffect(() => {
    if (!isLoadingShop && shop) {
      fetchProducts();
    }
  }, [isLoadingShop, shop, fetchProducts]);

  const handleClearFilters = () => {
    setSelectedCategory('');
    setSearchQuery('');
    setSortBy('newest');
    setInStockOnly(false);
    setCurrentPage(1);
  };

  // 404 Not Found
  if (errorStatus === 404) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Wholesale Shop Not Found</h1>
          <p className="mt-2 text-sm text-slate-500">
            No supplier catalogue was found at <span className="font-mono">/{shopSlug}</span>. Please verify the URL or explore other wholesale distributors.
          </p>
          <div className="mt-6">
            <Link to="/">
              <Button variant="primary">Return to Platform Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Inactive Shop
  if (errorStatus === 403) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Catalogue Temporarily Unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">
            This wholesale distributor's catalogue is currently paused or inactive for new orders. Please check back later.
          </p>
          <div className="mt-6">
            <Link to="/">
              <Button variant="outline">Return to Platform Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingShop || !shop) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const rawPhone = (shop.whatsappNumber || '').replace(/[^0-9]/g, '');
  const normalizedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
  const whatsappDirectUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
    `Hello ${shop.name}, I am viewing your wholesale catalogue on Cataloza.`
  )}`;

    const primaryColor = shop.branding?.primaryColor || shop.accentColor || '#2563eb';
    const buttonColor = shop.branding?.buttonColor || primaryColor;
    const customStyle = {
      '--shop-primary': primaryColor,
      '--shop-button': buttonColor,
    } as React.CSSProperties;

    return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={customStyle}>
      <ShopNavbar shop={shop} />

      <main className="flex-1">
        {/* Shop Hero Banner */}
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-5 max-w-2xl">
                {shop.logo ? (
                  <img
                    src={shop.logo}
                    alt={shop.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-slate-200 shadow-md shrink-0"
                  />
                ) : (
                  <div
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {shop.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                    Verified Wholesale Catalogue
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                    {shop.name}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {shop.description || 'Welcome to our wholesale product catalogue. Browse live wholesale pricing, check minimum order quantities, and submit your orders directly to our dispatch desk via WhatsApp.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    {(shop.address?.city || shop.address?.state) && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {[shop.address?.city, shop.address?.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {shop.contactPhone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {shop.contactPhone}
                      </span>
                    )}
                    {shop.businessHours && (
                      <span className="flex items-center gap-1.5 text-slate-400">
                        • Hours: {shop.businessHours}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Direct WhatsApp Call to Action */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-3">
                <a href={whatsappDirectUrl} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="whatsapp"
                    size="lg"
                    className="w-full"
                    icon={<MessageCircle className="w-5 h-5" />}
                  >
                    Direct WhatsApp Desk
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Products Row */}
        {featuredProducts.length > 0 && !searchQuery && !selectedCategory && (
          <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-bold text-slate-900">Featured Bulk Deals</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {featuredProducts.map((prod) => (
                <ProductCard
                  key={prod._id}
                  product={prod}
                  shopSlug={shop.slug}
                  currencySymbol={shop.currencySymbol}
                />
              ))}
            </div>
          </section>
        )}

        {/* Full Product Catalogue Grid */}
        <section className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-slate-900">Wholesale Product Catalogue</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {pagination.total} product{pagination.total !== 1 ? 's' : ''} available for dispatch
            </p>
          </div>

          {/* Search & Category Filter */}
          <ProductFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(catId) => {
              setSelectedCategory(catId);
              setCurrentPage(1);
            }}
            searchQuery={searchQuery}
            onSearchChange={(query) => {
              setSearchQuery(query);
              setCurrentPage(1);
            }}
            sortBy={sortBy}
            onSortChange={(sort) => {
              setSortBy(sort);
              setCurrentPage(1);
            }}
            inStockOnly={inStockOnly}
            onInStockChange={(inStock) => {
              setInStockOnly(inStock);
              setCurrentPage(1);
            }}
            onClearFilters={handleClearFilters}
          />

          {/* Products Grid */}
          {isLoadingProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              title="No wholesale products found"
              description="No products match your current search or category filters. Try resetting the filters."
              actionLabel="Reset Filters"
              onAction={handleClearFilters}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {products.map((prod) => (
                <ProductCard
                  key={prod._id}
                  product={prod}
                  shopSlug={shop.slug}
                  currencySymbol={shop.currencySymbol}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="mt-8">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        </section>
      </main>

      {/* Cart Slide-Over Drawer */}
      <CartDrawer />

      {/* Multi-Tenant Conflict Modal */}
      <DifferentShopModal />

      <ShopFooter shop={shop} />
    </div>
  );
};
