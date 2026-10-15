import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../types';
import { Shop } from '../models/Shop';
import { Cart } from '../models/Cart';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { OrderService } from '../services/order.service';
import { WhatsAppService } from '../services/whatsapp.service';

export class CheckoutController {
  /**
   * Universal checkout handler (supports both guest shoppers and authenticated users)
   */
  public static async checkout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const slug = (req.params.slug || req.params.shopSlug || '').toLowerCase().trim();
      const shop = await Shop.findOne({ slug });

      if (!shop || shop.status !== 'active') {
        res.status(404).json({ success: false, message: 'Shop is not available for orders' });
        return;
      }

      const body = req.body || {};
      const sessionId = (req.headers['x-session-id'] as string) || body.sessionId;

      // Extract delivery address whether nested in deliveryAddress or flat
      const rawDelivery = body.deliveryAddress || body;
      const fullName = (rawDelivery.fullName || '').trim();
      const phone = (rawDelivery.phone || '').trim();
      const whatsapp = (rawDelivery.whatsapp || phone || '').trim();
      const businessName = (rawDelivery.businessName || '').trim();
      const addressLine1 = (rawDelivery.addressLine1 || rawDelivery.street || '').trim();
      const addressLine2 = (rawDelivery.addressLine2 || '').trim();
      const city = (rawDelivery.city || '').trim();
      const district = (rawDelivery.district || '').trim();
      const state = (rawDelivery.state || '').trim();
      const postalCode = (rawDelivery.postalCode || '').trim();
      const country = (rawDelivery.country || 'India').trim();

      if (!fullName) {
        res.status(400).json({ success: false, message: 'Recipient full name is required' });
        return;
      }
      if (!phone) {
        res.status(400).json({ success: false, message: 'Mobile number is required' });
        return;
      }
      if (!addressLine1) {
        res.status(400).json({ success: false, message: 'Address line 1 / house / building is required' });
        return;
      }
      if (!city) {
        res.status(400).json({ success: false, message: 'City / town is required' });
        return;
      }
      if (!district) {
        res.status(400).json({ success: false, message: 'District is required' });
        return;
      }
      if (!state) {
        res.status(400).json({ success: false, message: 'State is required' });
        return;
      }
      if (!postalCode) {
        res.status(400).json({ success: false, message: 'PIN code is required' });
        return;
      }

      const customerNotes = (body.customerNotes || '').trim();
      const idempotencyKey = (body.idempotencyKey || '').trim();

      // Resolve items: from direct payload or from MongoDB cart
      let orderItems = body.items;
      if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
        let cartQuery: any = null;
        if (req.user?.userId) {
          cartQuery = { customerId: new Types.ObjectId(req.user.userId), shopId: shop._id };
        } else if (sessionId) {
          cartQuery = { sessionId, shopId: shop._id };
        }

        if (cartQuery) {
          const cart = await Cart.findOne(cartQuery);
          if (cart && cart.items.length > 0) {
            orderItems = cart.items.map((i) => ({
              productId: i.productId.toString(),
              variantName: i.variantName,
              quantity: i.quantity,
            }));
          }
        }
      }

      if (!orderItems || orderItems.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Your cart is empty. Please add wholesale products before checkout.',
        });
        return;
      }

      // Check if authenticated user exists
      let customerUser = null;
      if (req.user?.userId) {
        customerUser = await User.findById(req.user.userId);
      }

      const result = await OrderService.createOrder({
        shopId: shop._id.toString(),
        customerId: customerUser ? customerUser._id.toString() : undefined,
        sessionId,
        customerSnapshot: {
          name: fullName || (customerUser ? customerUser.name : 'Valued Customer'),
          email: customerUser ? customerUser.email : undefined,
          phone,
          whatsapp,
          businessName,
        },
        deliveryAddress: {
          fullName,
          phone,
          whatsapp,
          businessName,
          addressLine1,
          addressLine2,
          street: addressLine1,
          city,
          district,
          state,
          postalCode,
          country,
        },
        items: orderItems,
        customerNotes,
        idempotencyKey,
      });

      res.status(201).json({
        success: true,
        message: 'Order created and saved successfully!',
        data: {
          order: result.order,
          whatsappHandoff: result.handoff,
          guestAccessToken: result.order.guestAccessToken,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Checkout failed. Please check your items and try again.',
      });
    }
  }

  /**
   * Dedicated guest order endpoint: POST /api/v1/shops/:slug/orders/guest
   */
  public static async guestCheckout(req: AuthenticatedRequest, res: Response): Promise<void> {
    return CheckoutController.checkout(req, res);
  }

  /**
   * Secure Order Confirmation retrieval: GET /api/v1/shops/:slug/orders/:id/confirmation
   * Permits guests with unguessable token or authenticated owners/shop admins
   */
  public static async getOrderConfirmation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const slug = (req.params.slug || req.params.shopSlug || '').toLowerCase().trim();
      const shop = await Shop.findOne({ slug });

      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      const orderId = req.params.id;
      if (!Types.ObjectId.isValid(orderId)) {
        res.status(400).json({ success: false, message: 'Invalid order reference' });
        return;
      }

      const order = await Order.findOne({ _id: new Types.ObjectId(orderId), shopId: shop._id });
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      // Security check: Access token query/header OR authenticated ownership
      const providedToken = (req.query.token as string) || (req.headers['x-order-token'] as string);
      const isTokenMatch = Boolean(providedToken && order.guestAccessToken && providedToken === order.guestAccessToken);
      const isOwner = Boolean(req.user?.userId && order.customerId && order.customerId.toString() === req.user.userId);
      const isShopAdmin = Boolean(
        req.user &&
          (req.user.role === 'super_admin' ||
            (req.user.role === 'shop_admin' && req.user.assignedShopIds.includes(shop._id.toString())))
      );

      if (!isTokenMatch && !isOwner && !isShopAdmin) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Order confirmation requires a valid guest token.',
        });
        return;
      }

      const handoff = WhatsAppService.generateHandoff(order, shop);

      res.json({
        success: true,
        data: {
          order,
          handoff,
          shop: {
            _id: shop._id,
            name: shop.name,
            slug: shop.slug,
            whatsappNumber: shop.whatsappNumber,
            currencySymbol: shop.currencySymbol,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Guest Invoice PDF download
   */
  public static async downloadInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const slug = (req.params.slug || req.params.shopSlug || '').toLowerCase().trim();
      const shop = await Shop.findOne({ slug });

      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      const orderId = req.params.id;
      if (!Types.ObjectId.isValid(orderId)) {
        res.status(400).json({ success: false, message: 'Invalid order reference' });
        return;
      }

      const order = await Order.findOne({ _id: new Types.ObjectId(orderId), shopId: shop._id });
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      const providedToken = (req.query.token as string) || (req.headers['x-order-token'] as string);
      const isTokenMatch = Boolean(providedToken && order.guestAccessToken && providedToken === order.guestAccessToken);
      const isOwner = Boolean(req.user?.userId && order.customerId && order.customerId.toString() === req.user.userId);
      const isShopAdmin = Boolean(
        req.user &&
          (req.user.role === 'super_admin' ||
            (req.user.role === 'shop_admin' && req.user.assignedShopIds.includes(shop._id.toString())))
      );

      if (!isTokenMatch && !isOwner && !isShopAdmin) {
        res.status(403).json({ success: false, message: 'Access denied.' });
        return;
      }

      const { InvoiceService } = await import('../services/invoice.service');
      const pdfBuffer = await InvoiceService.generateInvoiceBuffer(order, shop);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Invoice-${order.orderNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
