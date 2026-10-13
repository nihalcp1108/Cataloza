import PDFDocument from 'pdfkit';
import { IOrder } from '../models/Order';
import { IShop } from '../models/Shop';

export class InvoiceService {
  /**
   * Generates a PDF invoice buffer for the specified order
   */
  public static async generateInvoiceBuffer(order: IOrder, shop: IShop): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', (err) => reject(err));

        // ----------------------------------------------------
        // HEADER & SHOP BRANDING
        // ----------------------------------------------------
        doc
          .fillColor('#1e293b')
          .fontSize(22)
          .font('Helvetica-Bold')
          .text(shop.name, 50, 45);

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#64748b')
          .text(shop.description || 'Wholesale Supplier', 50, 72)
          .text(`Phone: ${shop.contactPhone || shop.whatsappNumber}`, 50, 85)
          .text(`Email: ${shop.email || 'support@' + shop.slug + '.com'}`, 50, 97);

        // INVOICE TITLE & METADATA (Right-aligned)
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .fillColor('#2563eb')
          .text('WHOLESALE INVOICE', 350, 45, { align: 'right' });

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#475569')
          .text(`Order No: ${order.orderNumber}`, 350, 72, { align: 'right' })
          .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 350, 85, { align: 'right' })
          .text(`Payment Status: ${order.paymentStatus.toUpperCase()}`, 350, 97, { align: 'right' });

        // Divider
        doc
          .strokeColor('#cbd5e1')
          .lineWidth(1)
          .moveTo(50, 115)
          .lineTo(550, 115)
          .stroke();

        // ----------------------------------------------------
        // BILL TO / SHIP TO
        // ----------------------------------------------------
        const addrY = 125;
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text('BILL TO & DELIVERY TO:', 50, addrY);

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#334155')
          .text(order.deliveryAddress.fullName, 50, addrY + 16)
          .text(order.deliveryAddress.businessName ? `Business: ${order.deliveryAddress.businessName}` : '', 50, addrY + 28)
          .text(`Phone: ${order.deliveryAddress.phone}`, 50, addrY + 40)
          .text(
            `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.postalCode}`,
            50,
            addrY + 52
          );

        // ----------------------------------------------------
        // LINE ITEMS TABLE HEADER
        // ----------------------------------------------------
        const tableTop = 205;
        doc
          .rect(50, tableTop, 500, 22)
          .fillColor('#f1f5f9')
          .fill();

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#1e293b')
          .text('#', 60, tableTop + 6)
          .text('Item Description & SKU', 85, tableTop + 6)
          .text('Unit Price', 320, tableTop + 6, { width: 60, align: 'right' })
          .text('Qty', 390, tableTop + 6, { width: 40, align: 'right' })
          .text('Line Total', 450, tableTop + 6, { width: 90, align: 'right' });

        // Divider line below header
        doc
          .strokeColor('#cbd5e1')
          .lineWidth(0.5)
          .moveTo(50, tableTop + 22)
          .lineTo(550, tableTop + 22)
          .stroke();

        // ----------------------------------------------------
        // LINE ITEMS
        // ----------------------------------------------------
        let currentY = tableTop + 28;
        doc.font('Helvetica').fontSize(9);

        order.items.forEach((item, index) => {
          const variantStr = item.variantName ? ` - ${item.variantName}` : '';
          
          doc
            .fillColor('#475569')
            .text(`${index + 1}`, 60, currentY)
            .fillColor('#0f172a')
            .font('Helvetica-Bold')
            .text(`${item.name}${variantStr}`, 85, currentY, { width: 220 })
            .font('Helvetica')
            .fillColor('#64748b')
            .text(`SKU: ${item.sku}`, 85, currentY + 12)
            .fillColor('#0f172a')
            .text(`${order.currencySymbol} ${item.unitPrice.toLocaleString('en-IN')}`, 320, currentY, { width: 60, align: 'right' })
            .text(`${item.quantity} ${item.unit || ''}`, 390, currentY, { width: 40, align: 'right' })
            .text(`${order.currencySymbol} ${item.lineTotal.toLocaleString('en-IN')}`, 450, currentY, { width: 90, align: 'right' });

          currentY += 28;

          // Light row separator
          doc
            .strokeColor('#f1f5f9')
            .lineWidth(0.5)
            .moveTo(50, currentY - 4)
            .lineTo(550, currentY - 4)
            .stroke();
        });

        // ----------------------------------------------------
        // TOTALS CALCULATION
        // ----------------------------------------------------
        currentY += 10;
        const totalsLeft = 350;

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#475569')
          .text('Subtotal:', totalsLeft, currentY)
          .text(`${order.currencySymbol} ${order.subtotal.toLocaleString('en-IN')}`, 450, currentY, { width: 90, align: 'right' });

        currentY += 16;
        if (order.deliveryCharge > 0) {
          doc
            .text('Delivery Charge:', totalsLeft, currentY)
            .text(`${order.currencySymbol} ${order.deliveryCharge.toLocaleString('en-IN')}`, 450, currentY, { width: 90, align: 'right' });
          currentY += 16;
        }

        if (order.discount > 0) {
          doc
            .text('Discount:', totalsLeft, currentY)
            .text(`-${order.currencySymbol} ${order.discount.toLocaleString('en-IN')}`, 450, currentY, { width: 90, align: 'right' });
          currentY += 16;
        }

        // Grand Total Line
        doc
          .strokeColor('#2563eb')
          .lineWidth(1)
          .moveTo(totalsLeft, currentY)
          .lineTo(550, currentY)
          .stroke();

        currentY += 6;
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text('Grand Total:', totalsLeft, currentY)
          .fillColor('#2563eb')
          .text(`${order.currencySymbol} ${order.grandTotal.toLocaleString('en-IN')}`, 450, currentY, { width: 90, align: 'right' });

        // ----------------------------------------------------
        // FOOTER & INSTRUCTIONS
        // ----------------------------------------------------
        const footerY = 720;
        doc
          .strokeColor('#e2e8f0')
          .lineWidth(0.5)
          .moveTo(50, footerY)
          .lineTo(550, footerY)
          .stroke();

        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#64748b')
          .text('Wholesale Order Document - Generated by WholesaleFlow Multi-Tenant Platform.', 50, footerY + 10, { align: 'center' })
          .text('Thank you for your business! Please refer to Order Number for all correspondence.', 50, footerY + 22, { align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
