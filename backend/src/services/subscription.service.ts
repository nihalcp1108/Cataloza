import { Types } from 'mongoose';
import { Shop } from '../models/Shop';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { SubscriptionPlan, ISubscriptionPlan } from '../models/SubscriptionPlan';
import { ShopSubscription, IShopSubscription } from '../models/ShopSubscription';

export interface IShopSubscriptionDetails {
  subscription: IShopSubscription | null;
  plan: ISubscriptionPlan | null;
  isCompliant: boolean;
  status: string;
  daysRemaining: number;
  usage: {
    productCount: number;
    maxProducts: number;
    categoryCount: number;
    maxCategories: number;
  };
  permissions: {
    allowCustomProductFields: boolean;
    allowAnalytics: boolean;
    allowExportInvoices: boolean;
    allowOnlineOrdering: boolean;
  };
}

export class SubscriptionService {
  /**
   * Retrieves active subscription, plan, and current usage for a shop
   */
  public static async getShopSubscriptionDetails(
    shopId: string | Types.ObjectId
  ): Promise<IShopSubscriptionDetails> {
    const sId = new Types.ObjectId(shopId.toString());
    const shop = await Shop.findById(sId);

    // Find active or latest subscription
    let subscription = await ShopSubscription.findOne({ shopId: sId }).sort({ createdAt: -1 });

    // Fallback: If no subscription record, create a default trial subscription with Starter plan
    if (!subscription) {
      let starterPlan = await SubscriptionPlan.findOne({ code: 'PLAN_STARTER' });
      if (!starterPlan) {
        starterPlan = await SubscriptionPlan.findOne({ isActive: true }).sort({ displayOrder: 1 });
      }

      if (starterPlan) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + (starterPlan.trialDays || 14));

        subscription = await ShopSubscription.create({
          shopId: sId,
          planId: starterPlan._id,
          status: 'trialing',
          startDate,
          endDate,
          trialEndsAt: endDate,
        });

        if (shop) {
          shop.subscriptionId = subscription._id;
          await shop.save();
        }
      }
    }

    const plan = subscription ? await SubscriptionPlan.findById(subscription.planId) : null;

    // Count usage
    const [productCount, categoryCount] = await Promise.all([
      Product.countDocuments({ shopId: sId }),
      Category.countDocuments({ shopId: sId }),
    ]);

    // Check expiry
    const now = new Date();
    let isExpired = false;
    let daysRemaining = 0;

    if (subscription?.endDate) {
      const diffMs = subscription.endDate.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      if (diffMs <= 0 && subscription.status === 'active') {
        subscription.status = 'expired';
        await subscription.save();
        isExpired = true;
      }
    }

    const isSuspended = shop?.status === 'suspended' || subscription?.status === 'suspended';
    const isCompliant = !isSuspended && !isExpired && ['active', 'trialing'].includes(subscription?.status || '');

    return {
      subscription,
      plan,
      isCompliant,
      status: isSuspended ? 'suspended' : isExpired ? 'expired' : subscription?.status || 'inactive',
      daysRemaining,
      usage: {
        productCount,
        maxProducts: plan?.maxProducts ?? 50,
        categoryCount,
        maxCategories: plan?.maxCategories ?? 10,
      },
      permissions: {
        allowCustomProductFields: plan?.allowCustomProductFields ?? false,
        allowAnalytics: plan?.allowAnalytics ?? false,
        allowExportInvoices: plan?.allowExportInvoices ?? true,
        allowOnlineOrdering: plan?.allowOnlineOrdering ?? true,
      },
    };
  }

  /**
   * Enforces subscription checks before adding a new product
   */
  public static async canAddProduct(
    shopId: string | Types.ObjectId
  ): Promise<{ allowed: boolean; reason?: string }> {
    const details = await this.getShopSubscriptionDetails(shopId);

    if (details.status === 'suspended') {
      return {
        allowed: false,
        reason: 'This shop is suspended by the platform administration. Product catalog modifications are blocked.',
      };
    }

    if (details.status === 'expired') {
      return {
        allowed: false,
        reason: 'Your subscription has expired. Please renew your plan to add new products.',
      };
    }

    if (
      details.usage.maxProducts !== -1 &&
      details.usage.productCount >= details.usage.maxProducts
    ) {
      return {
        allowed: false,
        reason: `Product limit reached (${details.usage.productCount}/${details.usage.maxProducts}). Please upgrade your subscription plan to add more products.`,
      };
    }

    return { allowed: true };
  }
}
