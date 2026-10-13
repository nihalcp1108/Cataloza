import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { ICart, IProduct } from '../types';

interface CartContextType {
  cart: ICart | null;
  currentShopSlug: string | null;
  setShopSlug: (slug: string) => void;
  isLoading: boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: IProduct, quantity?: number, variantName?: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, variantName?: string) => Promise<void>;
  removeFromCart: (productId: string, variantName?: string) => Promise<void>;
  clearCart: () => Promise<void>;
  isSwitchShopModalOpen: boolean;
  conflictingShop: { name: string; slug: string } | null;
  confirmSwitchShop: () => Promise<void>;
  cancelSwitchShop: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentShopSlug, setCurrentShopSlug] = useState<string | null>(null);
  const [cart, setCart] = useState<ICart | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Shop conflict state
  const [isSwitchShopModalOpen, setIsSwitchShopModalOpen] = useState(false);
  const [conflictingShop, setConflictingShop] = useState<{ name: string; slug: string } | null>(null);
  const [pendingItem, setPendingItem] = useState<{ product: IProduct; quantity: number; variantName?: string } | null>(null);

  const fetchCart = useCallback(async (slug: string) => {
    try {
      setIsLoading(true);
      const res = await api.get(`/shops/${slug}/cart`);
      if (res.data?.success) {
        setCart(res.data.data);
      }
    } catch {
      // Cart might be empty or shop unavailable
      setCart(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentShopSlug) {
      fetchCart(currentShopSlug);
    }
  }, [currentShopSlug, fetchCart]);

  const setShopSlug = (slug: string) => {
    if (slug !== currentShopSlug) {
      setCurrentShopSlug(slug);
    }
  };

  const addToCart = async (product: IProduct, quantity: number = 1, variantName?: string) => {
    const slug = currentShopSlug;
    if (!slug) return;

    try {
      const res = await api.post(`/shops/${slug}/cart/items`, {
        productId: product._id,
        variantName,
        quantity,
      });

      if (res.data?.success) {
        toast.success(`Added ${product.name} to cart`);
        await fetchCart(slug);
      }
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.code === 'DIFFERENT_SHOP_CART') {
        // Intercept different shop conflict!
        const existingShop = err.response.data.existingShop;
        setConflictingShop(existingShop);
        setPendingItem({ product, quantity, variantName });
        setIsSwitchShopModalOpen(true);
      } else {
        toast.error(err.response?.data?.message || 'Could not add product to cart');
      }
    }
  };

  const confirmSwitchShop = async () => {
    if (!currentShopSlug || !pendingItem) return;

    try {
      // Force clear previous and add pending item
      await api.post(`/shops/${currentShopSlug}/cart/items`, {
        productId: pendingItem.product._id,
        variantName: pendingItem.variantName,
        quantity: pendingItem.quantity,
        forceClearPrevious: true,
      });

      toast.success(`Switched shop! Added ${pendingItem.product.name} to new cart.`);
      setIsSwitchShopModalOpen(false);
      setConflictingShop(null);
      setPendingItem(null);
      await fetchCart(currentShopSlug);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to switch cart');
    }
  };

  const cancelSwitchShop = () => {
    setIsSwitchShopModalOpen(false);
    setConflictingShop(null);
    setPendingItem(null);
  };

  const updateQuantity = async (productId: string, quantity: number, variantName?: string) => {
    if (!currentShopSlug) return;
    try {
      await api.patch(`/shops/${currentShopSlug}/cart/items`, {
        productId,
        quantity,
        variantName,
      });
      await fetchCart(currentShopSlug);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update quantity');
    }
  };

  const removeFromCart = async (productId: string, variantName?: string) => {
    if (!currentShopSlug) return;
    try {
      await api.delete(`/shops/${currentShopSlug}/cart/items`, {
        data: { productId, variantName },
      });
      toast.success('Item removed');
      await fetchCart(currentShopSlug);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove item');
    }
  };

  const clearCart = async () => {
    if (!currentShopSlug) return;
    try {
      await api.delete(`/shops/${currentShopSlug}/cart`);
      setCart(null);
      toast.success('Cart cleared');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to clear cart');
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        currentShopSlug,
        setShopSlug,
        isLoading,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        isSwitchShopModalOpen,
        conflictingShop,
        confirmSwitchShop,
        cancelSwitchShop,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
