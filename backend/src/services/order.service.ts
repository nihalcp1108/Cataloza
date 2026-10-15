import crypto from 'crypto';
import { Types } from 'mongoose';
import { Order, IOrder, IOrderItemSnapshot } from '../models/Order';
import { Product } from '../models/Product';
import { Shop } from '../models/Shop';
import { Cart } from '../models/Cart';
import { WhatsAppService, IWhatsAppHandoff } from './whatsapp.service';

export interface ICheckoutInput {
  shopId: string;
  customerId?: string;
  sessionId?: string;
  customerSnapshot: {
    name: string;
    email?: string;
    phone: string;
    whatsapp?: string;
    businessName?: string;
  };
  deliveryAddress: {
    fullName: string;
    phone: string;
    whatsapp?: string;
    businessName?: string;
    addressLine1?: string;
    addressLine2?: string;
    street?: string;
    city: string;
    district?: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  items: Array<{
    productId: string;
    variantName?: string;
    quantity: number;
  }>;
  customerNotes?: string;
  idempotencyKey?: string;
}

export class OrderService {
  /**
   * Generates a clean human-readable order identifier
   * Format: [SHOP_PREFIX]-[RANDOM_6_DIGITS] (e.g. CLX-120482)
   */
  public static generateOrderNumber(shopName?: string): string {
    const cleanPrefix = (shopName || 'CAT')
      .replace(/[^A-Za-z0-9]/g, '')
      .substring(0, 3)
      .toUpperCase() || 'CAT';
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `${cleanPrefix}-${randomSuffix}`;
  }

  /**
   * Authoritative server-side checkout calculation and order creation
   */
  public static async createOrder(
    input: ICheckoutInput
  ): Promise<{ order: IOrder; handoff: IWhatsAppHandoff }> {
    // 1. Idempotency safeguard: Check if order with this key already exists
    if (input.idempotencyKey && input.idempotencyKey.trim()) {
      const existing = await Order.findOne({ idempotencyKey: input.idempotencyKey.trim() });
      if (existing) {
        const shop = await Shop.findById(existing.shopId);
        if (shop) {
          const handoff = WhatsAppService.generateHandoff(existing, shop);
          return { order: existing, handoff };
        }
      }
    }

    // 2. Validate shop exists and is active
    const shop = await Shop.findById(input.shopId);
    if (!shop || shop.status !== 'active') {
      throw new Error('This shop is currently inactive or unavailable for ordering');
    }

    if (!input.items || input.items.length === 0) {
      throw new Error('Your cart is empty. Please add items to proceed.');
    }

    // 3. Process every line item against real database products (Authoritative prices)
    const orderItems: IOrderItemSnapshot[] = [];
    let subtotal = 0;

    for (const item of input.items) {
      if (!item.productId) continue;

      const product = await Product.findOne({
        _id: new Types.ObjectId(item.productId),
        shopId: shop._id, // Guarantee product belongs to THIS shop!
      });

      if (!product) {
        throw new Error(`Product not found or does not belong to ${shop.name}`);
      }

      if (!product.isActive) {
        throw new Error(`Product "${product.name}" is no longer available`);
      }

      const orderQty = Math.max(1, item.quantity);

      // Validate Minimum Order Quantity
      if (orderQty < (product.minimumOrderQuantity || 1)) {
        throw new Error(
          `Minimum order quantity for "${product.name}" is ${product.minimumOrderQuantity} ${product.unit}`
        );
      }

      // Determine authoritative price and check variant
      let unitPrice = product.price;
      let selectedVariant = undefined;

      if (item.variantName && product.variants && product.variants.length > 0) {
        selectedVariant = product.variants.find((v) => v.name === item.variantName);
        if (selectedVariant) {
          unitPrice = selectedVariant.price;
        }
      }

      // Check stock if inventory tracking is enabled
      if (product.trackInventory) {
        const availableStock = selectedVariant
          ? selectedVariant.stockQuantity ?? 0
          : product.stockQuantity;

        if (availableStock < orderQty) {
          throw new Error(
            `Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${orderQty}`
          );
        }

        // Concurrency-safe atomic stock decrement
        if (selectedVariant) {
          await Product.updateOne(
            { _id: product._id, 'variants.name': item.variantName },
            { $inc: { 'variants.$.stockQuantity': -orderQty } }
          );
        } else {
          await Product.updateOne(
            { _id: product._id },
            { $inc: { stockQuantity: -orderQty } }
          );
        }
      }

      const lineTotal = unitPrice * orderQty;
      subtotal += lineTotal;

      orderItems.push({
        productId: product._id,
        name: product.name,
        sku: selectedVariant?.sku || product.sku,
        variantName: item.variantName,
        quantity: orderQty,
        unit: product.unit || 'piece',
        unitPrice,
        lineTotal,
        image: product.images && product.images.length > 0 ? product.images[0] : '',
      });
    }

    if (orderItems.length === 0) {
      throw new Error('No valid items found in order.');
    }

    // 4. Server-controlled delivery fee and discounts
    const deliveryCharge = 0; // Wholesale default: agreed via WhatsApp
    const discount = 0;
    const grandTotal = subtotal + deliveryCharge - discount;

    const orderNumber = this.generateOrderNumber(shop.name);
    const guestAccessToken = crypto.randomBytes(24).toString('hex');

    // Build standard delivery address supporting both addressLine1 and street
    const rawDelivery = input.deliveryAddress;
    const streetResolved = rawDelivery.street || rawDelivery.addressLine1 || '';
    const addressLine1Resolved = rawDelivery.addressLine1 || rawDelivery.street || '';

    const normalizedDeliveryAddress = {
      fullName: rawDelivery.fullName.trim(),
      phone: rawDelivery.phone.trim(),
      whatsapp: rawDelivery.whatsapp ? rawDelivery.whatsapp.trim() : undefined,
      businessName: rawDelivery.businessName ? rawDelivery.businessName.trim() : undefined,
      addressLine1: addressLine1Resolved.trim(),
      addressLine2: rawDelivery.addressLine2 ? rawDelivery.addressLine2.trim() : undefined,
      street: streetResolved.trim(),
      city: rawDelivery.city.trim(),
      district: rawDelivery.district ? rawDelivery.district.trim() : undefined,
      state: rawDelivery.state.trim(),
      postalCode: rawDelivery.postalCode.trim(),
      country: rawDelivery.country ? rawDelivery.country.trim() : 'India',
    };

    const isGuest = !input.customerId;
    const customerObjId = input.customerId ? new Types.ObjectId(input.customerId) : undefined;

    // 5. Create immutable order record in MongoDB
    const order = await Order.create({
      orderNumber,
      shopId: shop._id,
      customerId: customerObjId,
      customerSnapshot: {
        name: input.customerSnapshot.name.trim(),
        email: input.customerSnapshot.email ? input.customerSnapshot.email.trim() : undefined,
        phone: input.customerSnapshot.phone.trim(),
        whatsapp: input.customerSnapshot.whatsapp ? input.customerSnapshot.whatsapp.trim() : undefined,
        businessName: input.customerSnapshot.businessName ? input.customerSnapshot.businessName.trim() : undefined,
      },
      deliveryAddress: normalizedDeliveryAddress,
      items: orderItems,
      subtotal,
      discount,
      deliveryCharge,
      grandTotal,
      currency: shop.currency || 'INR',
      currencySymbol: shop.currencySymbol || '₹',
      orderStatus: 'pending',
      paymentStatus: 'unpaid',
      orderSource: isGuest ? 'guest_whatsapp' : 'registered_customer',
      whatsappStatus: 'pending_customer_send',
      guestAccessToken,
      customerNotes: input.customerNotes ? input.customerNotes.trim() : undefined,
      statusHistory: [
        {
          status: 'pending',
          changedBy: customerObjId,
          note: isGuest ? 'Guest order placed via WhatsApp checkout' : 'Order placed by registered customer',
          timestamp: new Date(),
        },
      ],
      paymentHistory: [],
      whatsappHandoffInitiated: true,
      whatsappHandoffTimestamp: new Date(),
      idempotencyKey: input.idempotencyKey ? input.idempotencyKey.trim() : undefined,
    });

    // 6. Clear customer/session cart in MongoDB
    if (customerObjId) {
      await Cart.deleteOne({ customerId: customerObjId, shopId: shop._id });
    }
    if (input.sessionId) {
      await Cart.deleteOne({ sessionId: input.sessionId, shopId: shop._id });
    }

    // 7. Generate authoritative WhatsApp handoff payload
    const handoff = WhatsAppService.generateHandoff(order, shop);

    return { order, handoff };
  }
}
