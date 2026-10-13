import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../types';
import { User } from '../models/User';
import { Address } from '../models/Address';
import { Order } from '../models/Order';
import { Shop } from '../models/Shop';
import { InvoiceService } from '../services/invoice.service';

export class CustomerController {
  public static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = await User.findById(req.user!.userId).select('-passwordHash');
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      res.json({ success: true, data: { user } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = await User.findById(req.user!.userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      if (req.body.name) user.name = req.body.name.trim();
      if (req.body.phone) user.phone = req.body.phone.trim();

      await user.save();
      res.json({ success: true, message: 'Profile updated successfully', data: { user } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async getAddresses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const addresses = await Address.find({ customerId: req.user!.userId }).sort({ isDefault: -1, createdAt: -1 });
      res.json({ success: true, data: { addresses } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async createAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.body.isDefault) {
        await Address.updateMany({ customerId: req.user!.userId }, { isDefault: false });
      }

      const address = await Address.create({
        ...req.body,
        customerId: new Types.ObjectId(req.user!.userId),
      });

      res.status(201).json({ success: true, message: 'Address created', data: { address } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async updateAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const address = await Address.findOne({
        _id: req.params.id,
        customerId: req.user!.userId,
      });

      if (!address) {
        res.status(404).json({ success: false, message: 'Address not found' });
        return;
      }

      if (req.body.isDefault) {
        await Address.updateMany({ customerId: req.user!.userId }, { isDefault: false });
      }

      Object.assign(address, req.body);
      await address.save();

      res.json({ success: true, message: 'Address updated', data: { address } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async deleteAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await Address.findOneAndDelete({
        _id: req.params.id,
        customerId: req.user!.userId,
      });

      if (!result) {
        res.status(404).json({ success: false, message: 'Address not found' });
        return;
      }

      res.json({ success: true, message: 'Address deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async getOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
      const skip = (page - 1) * limit;

      const filter: any = { customerId: req.user!.userId };
      if (req.query.status) {
        filter.orderStatus = req.query.status;
      }

      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate('shopId', 'name slug logo whatsappNumber')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Order.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async getOrderById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const order = await Order.findOne({
        _id: req.params.id,
        customerId: req.user!.userId, // Strict customer isolation!
      }).populate('shopId', 'name slug logo whatsappNumber contactPhone address');

      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      res.json({ success: true, data: { order } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async downloadInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const order = await Order.findOne({
        _id: req.params.id,
        customerId: req.user!.userId, // Strict customer isolation!
      });

      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      const shop = await Shop.findById(order.shopId);
      if (!shop) {
        res.status(404).json({ success: false, message: 'Associated shop not found' });
        return;
      }

      const pdfBuffer = await InvoiceService.generateInvoiceBuffer(order, shop);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Invoice-${order.orderNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
