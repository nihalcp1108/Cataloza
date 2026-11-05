import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../src/config';
import { User } from '../src/models/User';
import { Shop } from '../src/models/Shop';
import { Category } from '../src/models/Category';
import { Product } from '../src/models/Product';
import { Order } from '../src/models/Order';
import { Address } from '../src/models/Address';
import { PlatformSetting } from '../src/models/PlatformSetting';

async function seed(): Promise<void> {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);

    console.log('[Seed] Clearing existing demo collections...');
    await Promise.all([
      User.deleteMany({ email: { $ne: config.superAdmin.email.toLowerCase().trim() } }),
      Shop.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Address.deleteMany({}),
    ]);

    const defaultPassword = 'Password@123456';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    const adminPassword = config.superAdmin.password || 'Admin@2026Secure!';
    const adminPasswordHash = await bcrypt.hash(adminPassword, salt);

    // 1. Create Super Admin or update credentials
    let superAdmin = await User.findOne({ email: config.superAdmin.email.toLowerCase().trim() });
    if (!superAdmin) {
      superAdmin = await User.create({
        name: config.superAdmin.name,
        email: config.superAdmin.email.toLowerCase().trim(),
        passwordHash: adminPasswordHash,
        role: 'super_admin',
        isActive: true,
        mustChangePassword: true,
      });
    } else {
      superAdmin.passwordHash = adminPasswordHash;
      superAdmin.role = 'super_admin';
      superAdmin.isActive = true;
      await superAdmin.save();
    }

    // 2. Create Platform Settings
    await PlatformSetting.findOneAndUpdate(
      {},
      {
        platformName: 'WholesaleFlow',
        supportEmail: 'contact@wholesaleflow.com',
        supportPhone: '+91 98765 43210',
        defaultCurrency: 'INR',
        defaultCurrencySymbol: '₹',
      },
      { upsert: true }
    );

    // 3. Shop 1: ABC Wholesale
    console.log('[Seed] Creating Shop 1: ABC Wholesale...');
    const shop1 = await Shop.create({
      name: 'ABC Wholesale Distributors',
      slug: 'abc-wholesale',
      description: 'Prime distributor of bulk FMCG, beverages, and packaged dry rations for retail supermarkets and minimarts.',
      contactPhone: '+91 98765 43210',
      whatsappNumber: '919876543210',
      email: 'orders@abcwholesale.com',
      address: {
        street: 'Plot 42, Central Industrial Area, Sector 5',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      businessHours: 'Mon - Sat: 8:30 AM - 7:30 PM',
      accentColor: '#2563eb',
      currency: 'INR',
      currencySymbol: '₹',
      status: 'active',
      createdBy: superAdmin._id,
    });

    const admin1 = await User.create({
      name: 'Ramesh Sharma',
      email: 'admin@abcwholesale.com',
      phone: '+91 98765 43210',
      passwordHash,
      role: 'shop_admin',
      assignedShopIds: [shop1._id],
      isActive: true,
    });

    // Categories for Shop 1
    const catBeverages = await Category.create({
      shopId: shop1._id,
      name: 'Beverages & Soft Drinks',
      slug: 'beverages-soft-drinks',
      description: 'Bulk cartons of juices, sodas, and energy drinks',
      displayOrder: 1,
      isActive: true,
    });

    const catGrains = await Category.create({
      shopId: shop1._id,
      name: 'Rice, Grains & Pulses',
      slug: 'rice-grains-pulses',
      description: '25kg & 50kg wholesale sacks of premium staple grains',
      displayOrder: 2,
      isActive: true,
    });

    const catOils = await Category.create({
      shopId: shop1._id,
      name: 'Edible Oils & Ghee',
      slug: 'edible-oils-ghee',
      description: '15L tins and bulk 1L pouch master cartons',
      displayOrder: 3,
      isActive: true,
    });

    // Products for Shop 1
    await Product.create([
      {
        shopId: shop1._id,
        name: 'Sparkling Mango Juice 250ml (Case of 24 Cans)',
        slug: 'sparkling-mango-juice-case-24',
        sku: 'ABC-BEV-001',
        description: 'Premium carbonated real mango pulp drink packed in 250ml slim aluminium cans. Case contains 24 cans. Shelf life 12 months.',
        categoryId: catBeverages._id,
        price: 720,
        compareAtPrice: 960,
        unit: 'case (24 cans)',
        minimumOrderQuantity: 5,
        trackInventory: true,
        stockQuantity: 150,
        isActive: true,
        isFeatured: true,
        images: ['https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80'],
      },
      {
        shopId: shop1._id,
        name: 'Pure Coconut Water 330ml (Pack of 12 Tetra Paks)',
        slug: 'pure-coconut-water-pack-12',
        sku: 'ABC-BEV-002',
        description: '100% natural young tender coconut water with zero preservatives. Master box of 12 tetra packs.',
        categoryId: catBeverages._id,
        price: 540,
        compareAtPrice: 720,
        unit: 'box (12 packs)',
        minimumOrderQuantity: 10,
        trackInventory: true,
        stockQuantity: 200,
        isActive: true,
        isFeatured: true,
        images: ['https://images.unsplash.com/photo-1525385133512-2f3bdd039054?auto=format&fit=crop&w=600&q=80'],
      },
      {
        shopId: shop1._id,
        name: 'Royal Basmati Rice Aged 2 Years (50kg Bulk Sack)',
        slug: 'royal-basmati-rice-aged-50kg',
        sku: 'ABC-GRN-010',
        description: 'Extra-long grain basmati rice aged to perfection. Non-sticky, highly aromatic when cooked. Packed in food-grade woven polypropylene sacks.',
        categoryId: catGrains._id,
        price: 4800,
        compareAtPrice: 5600,
        unit: 'sack (50kg)',
        minimumOrderQuantity: 2,
        trackInventory: true,
        stockQuantity: 80,
        isActive: true,
        isFeatured: true,
        images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'],
      },
      {
        shopId: shop1._id,
        name: 'Refined Sunflower Cooking Oil (15-Litre Wholesale Tin)',
        slug: 'refined-sunflower-oil-15l-tin',
        sku: 'ABC-OIL-025',
        description: 'Triple-refined sunflower oil with vitamins A & D. Heavy gauge commercial tin suitable for restaurants and groceries.',
        categoryId: catOils._id,
        price: 1850,
        compareAtPrice: 2100,
        unit: 'tin (15L)',
        minimumOrderQuantity: 4,
        trackInventory: true,
        stockQuantity: 120,
        isActive: true,
        isFeatured: false,
        images: ['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80'],
      },
    ]);

    // 4. Shop 2: Kerala Spice & Agro Exporters
    console.log('[Seed] Creating Shop 2: Kerala Distributors...');
    const shop2 = await Shop.create({
      name: 'Kerala Spice & Agro Distributors',
      slug: 'kerala-distributors',
      description: 'Authentic origin wholesale spices from the Malabar coast. Whole green cardamom, black pepper, and cold-pressed oils.',
      contactPhone: '+91 94471 23456',
      whatsappNumber: '919447123456',
      email: 'sales@keraladistributors.com',
      address: {
        street: 'Spice Board Road, Mattancherry',
        city: 'Kochi',
        state: 'Kerala',
        postalCode: '682002',
        country: 'India',
      },
      businessHours: 'Mon - Fri: 9:00 AM - 6:00 PM',
      accentColor: '#059669', // Emerald Green
      currency: 'INR',
      currencySymbol: '₹',
      status: 'active',
      createdBy: superAdmin._id,
    });

    await User.create({
      name: 'Mathew Varghese',
      email: 'admin@keraladistributors.com',
      phone: '+91 94471 23456',
      passwordHash,
      role: 'shop_admin',
      assignedShopIds: [shop2._id],
      isActive: true,
    });

    const catSpices = await Category.create({
      shopId: shop2._id,
      name: 'Whole Spices & Condiments',
      slug: 'whole-spices-condiments',
      description: 'Export-grade whole spices sorted by mm grade',
      displayOrder: 1,
      isActive: true,
    });

    await Product.create([
      {
        shopId: shop2._id,
        name: 'Wayanad Bold Black Pepper 550GL (10kg Vacuum Bag)',
        slug: 'wayanad-black-pepper-10kg',
        sku: 'KRL-PEP-10K',
        description: 'Sun-dried high-piperine natural black pepper berries harvested from Wayanad estates. Bulk 10kg vacuum sealed packs.',
        categoryId: catSpices._id,
        price: 6500,
        compareAtPrice: 7500,
        unit: 'bag (10kg)',
        minimumOrderQuantity: 1,
        trackInventory: true,
        stockQuantity: 45,
        isActive: true,
        isFeatured: true,
        images: ['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80'],
      },
      {
        shopId: shop2._id,
        name: 'Idukki Green Cardamom 8mm Grade (5kg Airtight Canister)',
        slug: 'idukki-green-cardamom-8mm-5kg',
        sku: 'KRL-CRD-005',
        description: 'Hand-picked extra bold 8mm green cardamom pods with intense aroma and dark seeds. Ideal for gourmet blenders and sweet makers.',
        categoryId: catSpices._id,
        price: 11500,
        compareAtPrice: 13200,
        unit: 'canister (5kg)',
        minimumOrderQuantity: 1,
        trackInventory: true,
        stockQuantity: 30,
        isActive: true,
        isFeatured: true,
        images: ['https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=600&q=80'],
      },
    ]);

    // 5. Customer Account & Initial Order
    console.log('[Seed] Creating Demo Customer...');
    const customer = await User.create({
      name: 'Deepak Patel',
      email: 'customer@retailer.com',
      phone: '+91 98200 11223',
      passwordHash,
      role: 'customer',
      isActive: true,
    });

    const customerAddress = await Address.create({
      customerId: customer._id,
      fullName: 'Deepak Patel',
      phone: '+91 98200 11223',
      businessName: 'Patel Supermarket Chain',
      street: 'Shop 14, Sunrise Plaza, MG Road',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001',
      country: 'India',
      isDefault: true,
    });

    console.log('[Seed] Creating Sample Completed Order for ABC Wholesale...');
    await Order.create({
      orderNumber: 'WC-2026-000101',
      shopId: shop1._id,
      customerId: customer._id,
      customerSnapshot: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        businessName: customerAddress.businessName,
      },
      deliveryAddress: {
        fullName: customerAddress.fullName,
        phone: customerAddress.phone,
        businessName: customerAddress.businessName,
        street: customerAddress.street,
        city: customerAddress.city,
        state: customerAddress.state,
        postalCode: customerAddress.postalCode,
        country: customerAddress.country,
      },
      items: [
        {
          productId: new Types.ObjectId(),
          name: 'Sparkling Mango Juice 250ml (Case of 24 Cans)',
          sku: 'ABC-BEV-001',
          quantity: 10,
          unit: 'case (24 cans)',
          unitPrice: 720,
          lineTotal: 7200,
          image: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80',
        },
        {
          productId: new Types.ObjectId(),
          name: 'Royal Basmati Rice Aged 2 Years (50kg Bulk Sack)',
          sku: 'ABC-GRN-010',
          quantity: 3,
          unit: 'sack (50kg)',
          unitPrice: 4800,
          lineTotal: 14400,
          image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
        },
      ],
      subtotal: 21600,
      deliveryCharge: 0,
      discount: 0,
      grandTotal: 21600,
      currency: 'INR',
      currencySymbol: '₹',
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
      customerNotes: 'Please dispatch via V-Trans transport to Pune depot.',
      internalNotes: 'Payment verified via NEFT reference UTR778899.',
      statusHistory: [
        {
          status: 'pending',
          changedBy: customer._id,
          note: 'Order placed via WhatsApp Catalogue',
          timestamp: new Date(Date.now() - 24 * 3600 * 1000),
        },
        {
          status: 'confirmed',
          changedBy: admin1._id,
          note: 'Stock allocated in warehouse',
          timestamp: new Date(Date.now() - 12 * 3600 * 1000),
        },
      ],
      paymentHistory: [
        {
          status: 'paid',
          amount: 21600,
          reference: 'NEFT-UTR778899',
          recordedBy: admin1._id,
          note: 'Bank transfer received in full',
          timestamp: new Date(Date.now() - 10 * 3600 * 1000),
        },
      ],
      whatsappHandoffInitiated: true,
      whatsappHandoffTimestamp: new Date(),
    });

    console.log('============================================================');
    console.log('🎉 DEMO DATA SEEDING COMPLETE!');
    console.log('============================================================');
    console.log('Super Admin:');
    console.log(`  Email:    ${config.superAdmin.email}`);
    console.log(`  Password: ${defaultPassword}`);
    console.log('');
    console.log('Shop Admins:');
    console.log('  1. ABC Wholesale:');
    console.log('     Slug:     /abc-wholesale');
    console.log('     Admin:    admin@abcwholesale.com');
    console.log(`     Password: ${defaultPassword}`);
    console.log('  2. Kerala Spice:');
    console.log('     Slug:     /kerala-distributors');
    console.log('     Admin:    admin@keraladistributors.com');
    console.log(`     Password: ${defaultPassword}`);
    console.log('');
    console.log('Demo Customer:');
    console.log('  Email:    customer@retailer.com');
    console.log(`  Password: ${defaultPassword}`);
    console.log('============================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error seeding data:', error);
    process.exit(1);
  }
}

seed();
