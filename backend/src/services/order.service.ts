import { Types } from 'mongoose';
import { Order, IOrder, IOrderItemSnapshot } from '../models/Order';
import { Product } from '../models/Product';
import { Shop } from '../models/Shop';
import { Cart } from '../models/Cart';
import { WhatsAppService, IWhatsAppHandoff } from './whatsapp.service';

export interface ICheckoutInput {
  shopId: string;
  customerId: string;
  customerSnapshot: {
    name: string;
    email: string;
    phone: string;
    businessName?: string;
  };
  deliveryAddress: {
    fullName: string;
    phone: string;
    businessName?: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
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
   * Generates a sequential/random human-readable order identifier
   * Format: WC-YYYY-XXXXXX
   */
  public static generateOrderNumber(): string {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `WC-${year}-${randomSuffix}`;
  }

  /**
   * Authoritative server-side checkout calculation and order creation
   */
  public static async createOrder(
    input: ICheckoutInput
  ): Promise<{ order: IOrder; handoff: IWhatsAppHandoff }> {
    // 1. Idempotency safeguard: Check if order with this key already exists
    if (input.idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey: input.idempotencyKey });
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

    // 3. Process every line item against real database products
    const orderItems: IOrderItemSnapshot[] = [];
    let subtotal = 0;

    for (const item of input.items) {
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

      // Validate Minimum Order Quantity
      if (item.quantity < (product.minimumOrderQuantity || 1)) {
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

        if (availableStock < item.quantity) {
          throw new Error(
            `Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${item.quantity}`
          );
        }

        // Concurrency-safe atomic stock decrement
        if (selectedVariant) {
          await Product.updateOne(
            { _id: product._id, 'variants.name': item.variantName },
            { $inc: { 'variants.$.stockQuantity': -item.quantity } }
          );
        } else {
          await Product.updateOne(
            { _id: product._id },
            { $inc: { stockQuantity: -item.quantity } }
          );
        }
      }

      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        productId: product._id,
        name: product.name,
        sku: selectedVariant?.sku || product.sku,
        variantName: item.variantName,
        quantity: item.quantity,
        unit: product.unit || 'piece',
        unitPrice,
        lineTotal,
        image: product.images && product.images.length > 0 ? product.images[0] : '',
      });
    }

    // 4. Server-controlled delivery fee and discounts
    const deliveryCharge = 0; // Wholesale default: free or agreed via WhatsApp
    const discount = 0;
    const grandTotal = subtotal + deliveryCharge - discount;

    const orderNumber = this.generateOrderNumber();

    // 5. Create immutable order record
    const order = await Order.create({
      orderNumber,
      shopId: shop._id,
      customerId: new Types.ObjectId(input.customerId),
      customerSnapshot: input.customerSnapshot,
      deliveryAddress: input.deliveryAddress,
      items: orderItems,
      subtotal,
      discount,
      deliveryCharge,
      grandTotal,
      currency: shop.currency || 'INR',
      currencySymbol: shop.currencySymbol || '₹',
      orderStatus: 'pending',
      paymentStatus: 'unpaid',
      customerNotes: input.customerNotes,
      statusHistory: [
        {
          status: 'pending',
          changedBy: new Types.ObjectId(input.customerId),
          note: 'Order placed by customer via WholesaleFlow',
          timestamp: new Date(),
        },
      ],
      paymentHistory: [],
      whatsappHandoffInitiated: true,
      whatsappHandoffTimestamp: new Date(),
      idempotencyKey: input.idempotencyKey,
    });

    // 6. Clear customer's cart for this shop
    await Cart.deleteOne({
      customerId: new Types.ObjectId(input.customerId),
      shopId: shop._id,
    });

    // 7. Generate WhatsApp handoff payload
    const handoff = WhatsAppService.generateHandoff(order, shop);

    return { order, handoff };
  }
}
