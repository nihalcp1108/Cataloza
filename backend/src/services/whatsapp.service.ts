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
   * Formats the WhatsApp prefilled message strictly adhering to Cataloza wholesale bill format
   */
  public static buildOrderMessage(order: IOrder, shop: IShop): string {
    const lines: string[] = [];
    const sym = order.currencySymbol || '₹';
    const formattedDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    lines.push('CATALOZA — ORDER REQUEST');
    lines.push(`Shop: ${shop.name}`);
    lines.push(`Order No: ${order.orderNumber}`);
    lines.push(`Date: ${formattedDate}`);
    lines.push('');

    lines.push('CUSTOMER DETAILS');
    lines.push(`Name: ${order.deliveryAddress.fullName || order.customerSnapshot.name}`);
    lines.push(`Phone: ${order.deliveryAddress.phone || order.customerSnapshot.phone}`);
    if (order.deliveryAddress.whatsapp || order.customerSnapshot.whatsapp) {
      lines.push(`WhatsApp: ${order.deliveryAddress.whatsapp || order.customerSnapshot.whatsapp}`);
    }
    if (order.deliveryAddress.businessName || order.customerSnapshot.businessName) {
      lines.push(`Business: ${order.deliveryAddress.businessName || order.customerSnapshot.businessName}`);
    }
    lines.push('');

    lines.push('DELIVERY ADDRESS');
    const addr1 = order.deliveryAddress.addressLine1 || order.deliveryAddress.street || '';
    if (addr1) lines.push(addr1);
    if (order.deliveryAddress.addressLine2) lines.push(order.deliveryAddress.addressLine2);
    const districtPart = order.deliveryAddress.district ? `, ${order.deliveryAddress.district}` : '';
    lines.push(`${order.deliveryAddress.city}${districtPart}`);
    lines.push(`${order.deliveryAddress.state} - ${order.deliveryAddress.postalCode}`);
    lines.push(order.deliveryAddress.country || 'India');
    lines.push('');

    lines.push('ORDER ITEMS');
    order.items.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.name}`);
      lines.push(`Code: ${item.sku}`);
      if (item.variantName) {
        lines.push(`Size: ${item.variantName}`);
      }
      lines.push(`Qty: ${item.quantity} ${item.unit || 'unit'}`);
      lines.push(`Unit Price: ${sym}${item.unitPrice.toLocaleString('en-IN')}`);
      lines.push(`Total: ${sym}${item.lineTotal.toLocaleString('en-IN')}`);
      lines.push('');
    });

    lines.push('BILL SUMMARY');
    lines.push(`Subtotal: ${sym}${order.subtotal.toLocaleString('en-IN')}`);
    if (order.deliveryCharge > 0) {
      lines.push(`Shipping: ${sym}${order.deliveryCharge.toLocaleString('en-IN')}`);
    } else {
      lines.push('Shipping: Free / To be confirmed');
    }
    if (order.discount > 0) {
      lines.push(`Tax / Discount: -${sym}${order.discount.toLocaleString('en-IN')}`);
    }
    lines.push(`TOTAL: ${sym}${order.grandTotal.toLocaleString('en-IN')}`);

    if (order.customerNotes) {
      lines.push('');
      lines.push(`Notes: ${order.customerNotes}`);
    }

    lines.push('');
    lines.push('Please confirm product availability, final delivery charges, and order acceptance.');
    lines.push('Order placed through Cataloza.');

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
