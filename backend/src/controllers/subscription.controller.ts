import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { ShopSubscription } from '../models/ShopSubscription';
import { Shop } from '../models/Shop';
import { AuthenticatedRequest } from '../types';
import { SubscriptionService } from '../services/subscription.service';
import { AuditService } from '../services/audit.service';

export class SubscriptionController {
  /**
   * List all subscription plans
   */
  public static async getPlans(_req: Request, res: Response): Promise<void> {
    try {
      const plans = await SubscriptionPlan.find().sort({ displayOrder: 1, price: 1 });
      res.json({
        success: true,
        data: { plans },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Super Admin: Create a new subscription tier
   */
  public static async createPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        name,
        code,
        description,
        price,
        currency,
        billingInterval,
        trialDays,
        maxProducts,
        maxCategories,
        maxAdmins,
        allowCustomProductFields,
        allowAnalytics,
        allowExportInvoices,
        allowOnlineOrdering,
        features,
        displayOrder,
      } = req.body;

      if (!name || !code || price === undefined) {
        res.status(400).json({ success: false, message: 'Name, unique code, and price are required' });
        return;
      }

      const existing = await SubscriptionPlan.findOne({ code: code.toUpperCase() });
      if (existing) {
        res.status(400).json({ success: false, message: `Plan code '${code}' is already in use` });
        return;
      }

      const plan = await SubscriptionPlan.create({
        name,
        code: code.toUpperCase(),
        description: description || '',
        price: Number(price),
        currency: currency || 'INR',
        billingInterval: billingInterval || 'monthly',
        trialDays: Number(trialDays) || 0,
        maxProducts: maxProducts !== undefined ? Number(maxProducts) : 50,
        maxCategories: maxCategories !== undefined ? Number(maxCategories) : 10,
        maxAdmins: maxAdmins !== undefined ? Number(maxAdmins) : 1,
        allowCustomProductFields: Boolean(allowCustomProductFields),
        allowAnalytics: Boolean(allowAnalytics),
        allowExportInvoices: allowExportInvoices !== false,
        allowOnlineOrdering: allowOnlineOrdering !== false,
        features: Array.isArray(features) ? features : [],
        displayOrder: Number(displayOrder) || 0,
        isActive: true,
      });

      await AuditService.log({
        actorId: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
        actorRole: req.user?.role,
        action: 'CREATE_SUBSCRIPTION_PLAN',
        targetEntity: 'SubscriptionPlan',
        targetId: plan._id.toString(),
        metadata: { name: plan.name, code: plan.code },
      });

      res.status(201).json({
        success: true,
        message: 'Subscription plan created successfully',
        data: { plan },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Super Admin: Update a subscription plan
   */
  public static async updatePlan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const plan = await SubscriptionPlan.findById(id);
      if (!plan) {
        res.status(404).json({ success: false, message: 'Plan not found' });
        return;
      }

      Object.assign(plan, req.body);
      if (req.body.code) plan.code = req.body.code.toUpperCase();
      await plan.save();

      res.json({
        success: true,
        message: 'Plan updated successfully',
        data: { plan },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Super Admin: Delete / Deactivate a plan
   */
  public static async deletePlan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const activeUsingCount = await ShopSubscription.countDocuments({
        planId: new Types.ObjectId(id),
        status: { $in: ['active', 'trialing'] },
      });

      if (activeUsingCount > 0) {
        res.status(400).json({
          success: false,
          message: `Cannot delete plan: currently in active use by ${activeUsingCount} shop(s). Deactivate it instead.`,
        });
        return;
      }

      await SubscriptionPlan.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Plan deleted successfully',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Super Admin: List all shop subscription assignments
   */
  public static async getAssignments(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const assignments = await ShopSubscription.find()
        .populate('shopId', 'name slug status contactPhone email')
        .populate('planId', 'name code price currency billingInterval maxProducts')
        .sort({ updatedAt: -1 });

      res.json({
        success: true,
        data: { assignments },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Super Admin: Assign or change a shop's plan
   */
  public static async assignPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { shopId, planId, startDate, endDate, status, notes } = req.body;

      if (!shopId || !planId) {
        res.status(400).json({ success: false, message: 'shopId and planId are required' });
        return;
      }

      const [shop, plan] = await Promise.all([
        Shop.findById(shopId),
        SubscriptionPlan.findById(planId),
      ]);

      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }
      if (!plan) {
        res.status(404).json({ success: false, message: 'Plan not found' });
        return;
      }

      const sDate = startDate ? new Date(startDate) : new Date();
      let eDate = endDate ? new Date(endDate) : new Date(sDate);
      if (!endDate) {
        if (plan.billingInterval === 'yearly') {
          eDate.setFullYear(eDate.getFullYear() + 1);
        } else if (plan.billingInterval === 'quarterly') {
          eDate.setMonth(eDate.getMonth() + 3);
        } else {
          eDate.setMonth(eDate.getMonth() + 1);
        }
      }

      let subscription = await ShopSubscription.findOne({ shopId: shop._id });

      if (subscription) {
        const previousStatus = subscription.status;
        subscription.planId = plan._id;
        subscription.startDate = sDate;
        subscription.endDate = eDate;
        subscription.status = status || 'active';
        if (notes) subscription.notes = notes;

        subscription.statusHistory.push({
          fromStatus: previousStatus,
          toStatus: subscription.status,
          reason: `Plan changed to ${plan.name}`,
          changedAt: new Date(),
          changedBy: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
        });

        await subscription.save();
      } else {
        subscription = await ShopSubscription.create({
          shopId: shop._id,
          planId: plan._id,
          startDate: sDate,
          endDate: eDate,
          status: status || 'active',
          notes: notes || '',
        });
      }

      shop.subscriptionId = subscription._id;
      await shop.save();

      await AuditService.log({
        actorId: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
        actorRole: req.user?.role,
        action: 'ASSIGN_SUBSCRIPTION_PLAN',
        targetEntity: 'ShopSubscription',
        targetId: subscription._id.toString(),
        shopId: shop._id,
        metadata: { shopName: shop.name, planName: plan.name, status: subscription.status },
      });

      res.json({
        success: true,
        message: `Plan '${plan.name}' assigned to shop '${shop.name}' successfully`,
        data: { subscription },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Super Admin: Record manual payment for a shop subscription
   */
  public static async recordPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { subscriptionId, amount, currency, paymentMethod, referenceNumber, notes, extendDays } = req.body;

      if (!subscriptionId || amount === undefined) {
        res.status(400).json({ success: false, message: 'subscriptionId and amount are required' });
        return;
      }

      const subscription = await ShopSubscription.findById(subscriptionId);
      if (!subscription) {
        res.status(404).json({ success: false, message: 'Subscription not found' });
        return;
      }

      // Add payment record
      subscription.payments.push({
        amount: Number(amount),
        currency: currency || 'INR',
        paymentDate: new Date(),
        paymentMethod: paymentMethod || 'bank_transfer',
        referenceNumber: referenceNumber || `REF-${Date.now()}`,
        notes: notes || '',
        recordedBy: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
      });

      // Optionally extend end date
      if (extendDays && Number(extendDays) > 0) {
        const currentEnd = new Date(subscription.endDate);
        const baseDate = currentEnd > new Date() ? currentEnd : new Date();
        baseDate.setDate(baseDate.getDate() + Number(extendDays));
        subscription.endDate = baseDate;
      }

      // If subscription was expired/past_due, reactivate it upon recorded payment
      if (['expired', 'past_due'].includes(subscription.status)) {
        subscription.status = 'active';
      }

      await subscription.save();

      await AuditService.log({
        actorId: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
        actorRole: req.user?.role,
        action: 'RECORD_SUBSCRIPTION_PAYMENT',
        targetEntity: 'ShopSubscription',
        targetId: subscriptionId,
        shopId: subscription.shopId,
        metadata: { amount, paymentMethod, referenceNumber },
      });

      res.json({
        success: true,
        message: 'Manual payment recorded successfully',
        data: { subscription },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Shop Admin & Super Admin: Get shop subscription details & usage
   */
  public static async getShopSubscription(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { shopId } = req.params;

      // Authorization check: Shop Admins can only view their assigned shop
      if (req.user?.role === 'shop_admin') {
        const assignedIds = (req.user.assignedShopIds || []).map((id: any) => id.toString());
        if (!assignedIds.includes(shopId)) {
          res.status(403).json({ success: false, message: 'Access denied to this shop subscription' });
          return;
        }
      }

      const details = await SubscriptionService.getShopSubscriptionDetails(shopId);

      res.json({
        success: true,
        data: details,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
