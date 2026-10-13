import { IOrder } from '../models/Order';
import { IShop } from '../models/Shop';

export interface IWhatsAppHandoff {
  normalizedPhone: string;
  whatsappUrl: string;
  webWhatsappUrl: string;
  messageText: string;
}

export class WhatsAppService {
  /**
   * Normalizes phone number into international E.164 without '+' or special characters
   * e.g., '+91 98765-43210' -> '919876543210'
   */
  public static normalizePhoneNumber(rawNumber: string): string {
    let cleaned = rawNumber.replace(/[^0-9]/g, '');
    // If Indian 10-digit number without country code, prepend 91
    if (cleaned.length === 10) {
      cleaned = `91${cleaned}`;
    }
    return cleaned;
  }

  /**
   * Formats the WhatsApp prefilled message strictly adhering to business guidelines
   */
  public static buildOrderMessage(order: IOrder, shop: IShop): string {
    const lines: string[] = [];

    lines.push(`Hello ${shop.name},`);
    lines.push('');
    lines.push('I would like to confirm my wholesale order.');
    lines.push('');
    lines.push(`*Order No:* ${order.orderNumber}`);
    lines.push('');
    lines.push('*Items:*');

    order.items.forEach((item, index) => {
      const variantStr = item.variantName ? ` (${item.variantName})` : '';
      lines.push(
        `${index + 1}. *${item.name}${variantStr}* — SKU: ${item.sku}`
      );
      lines.push(
        `   Quantity: ${item.quantity} ${item.unit || 'unit'}`
      );
      lines.push(
        `   Unit price: ${order.currencySymbol}${item.unitPrice.toLocaleString('en-IN')}`
      );
      lines.push(
        `   Line Total: ${order.currencySymbol}${item.lineTotal.toLocaleString('en-IN')}`
      );
      lines.push('');
    });

    lines.push(`*Subtotal:* ${order.currencySymbol}${order.subtotal.toLocaleString('en-IN')}`);
    if (order.deliveryCharge > 0) {
      lines.push(`*Delivery:* ${order.currencySymbol}${order.deliveryCharge.toLocaleString('en-IN')}`);
    } else {
      lines.push(`*Delivery:* Free / To be confirmed`);
    }
    if (order.discount > 0) {
      lines.push(`*Discount:* -${order.currencySymbol}${order.discount.toLocaleString('en-IN')}`);
    }
    lines.push(`*Grand Total:* ${order.currencySymbol}${order.grandTotal.toLocaleString('en-IN')}`);
    lines.push('');
    lines.push('*Customer Details:*');
    lines.push(`Customer: ${order.deliveryAddress.fullName}`);
    if (order.deliveryAddress.businessName) {
      lines.push(`Business: ${order.deliveryAddress.businessName}`);
    }
    lines.push(`Phone: ${order.deliveryAddress.phone}`);
    lines.push(
      `Delivery Address: ${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.postalCode}`
    );

    if (order.customerNotes) {
      lines.push('');
      lines.push(`*Customer Note:* ${order.customerNotes}`);
    }

    lines.push('');
    lines.push('Please confirm availability and dispatch details.');
    lines.push('');
    lines.push('Thank you!');

    return lines.join('\n');
  }

  /**
   * Builds the complete handoff payload with direct wa.me and web.whatsapp URLs
   */
  public static generateHandoff(order: IOrder, shop: IShop): IWhatsAppHandoff {
    const normalizedPhone = this.normalizePhoneNumber(shop.whatsappNumber);
    const messageText = this.buildOrderMessage(order, shop);
    const encodedText = encodeURIComponent(messageText);

    return {
      normalizedPhone,
      whatsappUrl: `https://wa.me/${normalizedPhone}?text=${encodedText}`,
      webWhatsappUrl: `https://web.whatsapp.com/send?phone=${normalizedPhone}&text=${encodedText}`,
      messageText,
    };
  }
}
