import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check, AlertCircle } from 'lucide-react';
import { IProduct } from '../../types';
import { useCart } from '../../contexts/CartContext';
import { Button } from '../common/Button';

interface ProductCardProps {
  product: IProduct;
  shopSlug: string;
  currencySymbol?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  shopSlug,
  currencySymbol = '₹',
}) => {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(product.minimumOrderQuantity || 1);
  const [isAdding, setIsAdding] = useState(false);

  const mainImage =
    product.images && product.images.length > 0
      ? product.images[0]
      : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

  const isOutOfStock = product.trackInventory && product.stockQuantity <= 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    setIsAdding(true);
    try {
      await addToCart(product, quantity);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="group relative flex flex-col rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 overflow-hidden">
      {/* Product Image */}
      <Link
        to={`/${shopSlug}/product/${product.slug}`}
        className="relative block aspect-square w-full bg-slate-100 overflow-hidden"
      >
        <img
          src={mainImage}
          alt={product.name}
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {product.isFeatured && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              Featured
            </span>
          )}
          {product.minimumOrderQuantity > 1 && (
            <span className="bg-slate-900/85 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
              MOQ: {product.minimumOrderQuantity} {product.unit}s
            </span>
          )}
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      {/* Card Details */}
      <div className="flex flex-1 flex-col p-4 justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-mono uppercase">SKU: {product.sku}</span>
            <span className="capitalize">{product.unit}</span>
          </div>

          <Link
            to={`/${shopSlug}/product/${product.slug}`}
            className="block text-sm font-semibold text-slate-900 line-clamp-2 hover:text-blue-600 transition-colors"
          >
            {product.name}
          </Link>

          {/* Optional custom attribute badges */}
          {product.customFields && Object.keys(product.customFields).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(product.customFields)
                .filter(([_, v]) => v !== undefined && v !== null && v !== '' && typeof v !== 'object')
                .slice(0, 2)
                .map(([k, v]) => (
                  <span
                    key={k}
                    className="inline-block bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md truncate max-w-[120px]"
                    title={`${k}: ${v}`}
                  >
                    {String(v)}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Price & Cart Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-lg font-bold text-slate-900">
              {currencySymbol}
              {product.price.toLocaleString('en-IN')}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs text-slate-400 line-through">
                {currencySymbol}
                {product.compareAtPrice.toLocaleString('en-IN')}
              </span>
            )}
            <span className="text-xs text-slate-500">/ {product.unit}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              icon={<ShoppingCart className="w-3.5 h-3.5" />}
              disabled={isOutOfStock}
              isLoading={isAdding}
              onClick={handleAddToCart}
            >
              {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
