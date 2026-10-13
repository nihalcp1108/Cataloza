import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../types';
import { Shop } from '../models/Shop';
import { Cart } from '../models/Cart';
import { User } from '../models/User';
import { OrderService } from '../services/order.service';

export class CheckoutController {
  public static async checkout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const slug = req.params.slug.toLowerCase().trim();
      const shop = await Shop.findOne({ slug });

      if (!shop || shop.status !== 'active') {
        res.status(404).json({ success: false, message: 'Shop is not available for orders' });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Please log in or create an account to complete checkout.',
        });
        return;
      }

      const customer = await User.findById(req.user.userId);
      if (!customer) {
        res.status(401).json({ success: false, message: 'Customer account not found' });
        return;
      }

      const { deliveryAddress, customerNotes, idempotencyKey, items: directItems } = req.body;

      // Fetch items from saved cart if direct items not provided
      let orderItems = directItems;
      if (!orderItems || orderItems.length === 0) {
        const cart = await Cart.findOne({
          customerId: new Types.ObjectId(req.user.userId),
          shopId: shop._id,
        });

        if (!cart || cart.items.length === 0) {
          res.status(400).json({
            success: false,
            message: 'Your cart is empty. Please add wholesale products before checkout.',
          });
          return;
        }

        orderItems = cart.items.map((i) => ({
          productId: i.productId.toString(),
          variantName: i.variantName,
          quantity: i.quantity,
        }));
      }

      // Execute authoritative checkout and atomic save in database
      const result = await OrderService.createOrder({
        shopId: shop._id.toString(),
        customerId: req.user.userId,
        customerSnapshot: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone || deliveryAddress.phone,
          businessName: deliveryAddress.businessName,
        },
        deliveryAddress,
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
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Checkout failed. Please check your items and try again.',
      });
    }
  }
}
