import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../types';
import { Cart } from '../models/Cart';
import { Shop } from '../models/Shop';
import { Product } from '../models/Product';

export class CartController {
  /**
   * Fetches cart scoped to the given shop slug, revalidating items with real-time DB products
   */
  public static async getCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const slug = req.params.slug.toLowerCase().trim();
      const shop = await Shop.findOne({ slug });

      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      const customerId = req.user?.userId;
      const sessionId = req.headers['x-session-id'] as string;

      let cart = null;
      if (customerId) {
        cart = await Cart.findOne({ customerId: new Types.ObjectId(customerId), shopId: shop._id });
      } else if (sessionId) {
        cart = await Cart.findOne({ sessionId, shopId: shop._id });
      }

      if (!cart || cart.items.length === 0) {
        res.json({
          success: true,
          data: {
            shop: { _id: shop._id, name: shop.name, slug: shop.slug, currencySymbol: shop.currencySymbol },
            items: [],
            subtotal: 0,
            itemCount: 0,
          },
        });
        return;
      }

      // Revalidate line items in real-time
      const validatedItems: any[] = [];
      let subtotal = 0;
      let hasUnavailable = false;

      for (const item of cart.items) {
        const product = await Product.findOne({ _id: item.productId, shopId: shop._id });
        if (!product || !product.isActive) {
          hasUnavailable = true;
          continue;
        }

        let unitPrice = product.price;
        let variantStock = product.stockQuantity;
        let variantSku = product.sku;

        if (item.variantName && product.variants) {
          const variant = product.variants.find((v) => v.name === item.variantName);
          if (variant) {
            unitPrice = variant.price;
            variantStock = variant.stockQuantity ?? 0;
            if (variant.sku) variantSku = variant.sku;
          }
        }

        const isOutOfStock = product.trackInventory && variantStock < item.quantity;
        const belowMoq = item.quantity < product.minimumOrderQuantity;
        const lineTotal = unitPrice * item.quantity;
        subtotal += lineTotal;

        validatedItems.push({
          productId: product._id,
          name: product.name,
          sku: variantSku,
          variantName: item.variantName,
          quantity: item.quantity,
          unit: product.unit,
          unitPrice,
          lineTotal,
          image: product.images[0] || '',
          minimumOrderQuantity: product.minimumOrderQuantity,
          trackInventory: product.trackInventory,
          stockQuantity: variantStock,
          isOutOfStock,
          belowMoq,
        });
      }

      res.json({
        success: true,
        data: {
          shop: { _id: shop._id, name: shop.name, slug: shop.slug, currencySymbol: shop.currencySymbol },
          items: validatedItems,
          subtotal,
          itemCount: validatedItems.reduce((acc, i) => acc + i.quantity, 0),
          hasUnavailable,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Adds an item to shop cart. Strictly prevents mixing different shops!
   */
  public static async addItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const slug = req.params.slug.toLowerCase().trim();
      const shop = await Shop.findOne({ slug });

      if (!shop || shop.status !== 'active') {
        res.status(404).json({ success: false, message: 'Shop is not available' });
        return;
      }

      const { productId, variantName, quantity = 1, forceClearPrevious = false } = req.body;
      const customerId = req.user?.userId;
      const sessionId = (req.headers['x-session-id'] as string) || req.body.sessionId;

      if (!customerId && !sessionId) {
        res.status(400).json({ success: false, message: 'Session ID or customer authentication is required' });
        return;
      }

      // Check if user has an existing cart for ANOTHER shop
      const existingCartQuery = customerId
        ? { customerId: new Types.ObjectId(customerId) }
        : { sessionId };

      const existingCart = await Cart.findOne(existingCartQuery);

      if (existingCart && existingCart.shopId.toString() !== shop._id.toString() && existingCart.items.length > 0) {
        if (!forceClearPrevious) {
          const currentCartShop = await Shop.findById(existingCart.shopId);
          res.status(409).json({
            success: false,
            code: 'DIFFERENT_SHOP_CART',
            message: `Your cart already contains items from "${currentCartShop?.name || 'another shop'}". Orders cannot mix multiple wholesale suppliers.`,
            existingShop: {
              _id: currentCartShop?._id,
              name: currentCartShop?.name,
              slug: currentCartShop?.slug,
            },
          });
          return;
        } else {
          // Clear previous cart for different shop
          await Cart.deleteOne({ _id: existingCart._id });
        }
      }

      // Verify product belongs to this shop
      const product = await Product.findOne({ _id: productId, shopId: shop._id, isActive: true });
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found in this shop' });
        return;
      }

      // Find or create cart
      let cart = await Cart.findOne({
        ...(customerId ? { customerId: new Types.ObjectId(customerId) } : { sessionId }),
        shopId: shop._id,
      });

      if (!cart) {
        cart = new Cart({
          customerId: customerId ? new Types.ObjectId(customerId) : undefined,
          sessionId,
          shopId: shop._id,
          items: [],
        });
      }

      // Check if item already in cart
      const existingIndex = cart.items.findIndex(
        (i) => i.productId.toString() === productId && i.variantName === variantName
      );

      if (existingIndex > -1) {
        cart.items[existingIndex].quantity += quantity;
      } else {
        const initialQty = Math.max(quantity, product.minimumOrderQuantity || 1);
        cart.items.push({
          productId: new Types.ObjectId(productId),
          variantName,
          quantity: initialQty,
        });
      }

      await cart.save();

      res.json({
        success: true,
        message: 'Item added to cart',
        data: { cart },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Updates item quantity in cart
   */
  public static async updateItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const slug = req.params.slug.toLowerCase().trim();
      const shop = await Shop.findOne({ slug });
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      const { productId, variantName, quantity } = req.body;
      const customerId = req.user?.userId;
      const sessionId = req.headers['x-session-id'] as string;

      const cart = await Cart.findOne({
        ...(customerId ? { customerId: new Types.ObjectId(customerId) } : { sessionId }),
        shopId: shop._id,
      });

      if (!cart) {
        res.status(404).json({ success: false, message: 'Cart not found' });
        return;
      }

      const itemIndex = cart.items.findIndex(
        (i) => i.productId.toString() === productId && (i.variantName || '') === (variantName || '')
      );

      if (itemIndex === -1) {
        res.status(404).json({ success: false, message: 'Item not in cart' });
        return;
      }

      if (quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }

      await cart.save();
      res.json({ success: true, message: 'Cart updated', data: { cart } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Removes item from cart
   */
  public static async removeItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const slug = req.params.slug.toLowerCase().trim();
      const shop = await Shop.findOne({ slug });
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      const { productId, variantName } = req.body;
      const customerId = req.user?.userId;
      const sessionId = req.headers['x-session-id'] as string;

      const cart = await Cart.findOne({
        ...(customerId ? { customerId: new Types.ObjectId(customerId) } : { sessionId }),
        shopId: shop._id,
      });

      if (cart) {
        cart.items = cart.items.filter(
          (i) => !(i.productId.toString() === productId && (i.variantName || '') === (variantName || ''))
        );
        await cart.save();
      }

      res.json({ success: true, message: 'Item removed from cart' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Clears cart
   */
  public static async clearCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const slug = req.params.slug.toLowerCase().trim();
      const shop = await Shop.findOne({ slug });
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      const customerId = req.user?.userId;
      const sessionId = req.headers['x-session-id'] as string;

      await Cart.deleteOne({
        ...(customerId ? { customerId: new Types.ObjectId(customerId) } : { sessionId }),
        shopId: shop._id,
      });

      res.json({ success: true, message: 'Cart cleared' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
