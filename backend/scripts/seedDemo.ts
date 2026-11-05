import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import slugify from 'slugify';
import { config } from '../src/config';
import { User } from '../src/models/User';
import { Shop } from '../src/models/Shop';
import { Category } from '../src/models/Category';
import { Product } from '../src/models/Product';
import { Order } from '../src/models/Order';

export async function seedDemo(): Promise<void> {
  console.log('===========================================================');
  console.log('🏪 CATALOZA — PROVISIONING DEDICATED DEMO STORE & ADMIN');
  console.log('===========================================================');

  if (!config.demoAdmin.enabled) {
    console.log('[SeedDemo] Demo account provisioning is disabled via configuration.');
    return;
  }

  const demoEmail = config.demoAdmin.email.toLowerCase().trim();
  const demoPassword = config.demoAdmin.password;
  const demoShopSlug = config.demoAdmin.shopSlug.toLowerCase().trim();
  const demoShopName = config.demoAdmin.shopName;

  console.log(`[SeedDemo] Target Demo Admin Email: ${demoEmail}`);
  console.log(`[SeedDemo] Target Demo Shop Slug:  /${demoShopSlug}`);

  // 1. Find or create demo shop
  let demoShop = await Shop.findOne({ slug: demoShopSlug });
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(demoPassword, salt);

  if (!demoShop) {
    demoShop = await Shop.create({
      name: demoShopName,
      businessName: 'Cataloza Wholesale Showcase Inc.',
      slug: demoShopSlug,
      description:
        'Official interactive demonstration catalogue for Cataloza Wholesale Commerce. Explore high-volume pricing, MOQ rules, tiered wholesale inventory, and sample merchant workflows.',
      ownerName: 'Cataloza Demo Merchant',
      businessCategory: 'General Wholesale, Tech & Consumer Goods',
      gstNumber: '27AABCC1234D1Z5',
      logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
      banner: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=80',
      contactPhone: '+91 98765 43210',
      whatsappNumber: '919876543210',
      whatsappCheckoutEnabled: true,
      email: demoEmail,
      website: 'https://cataloza.com',
      address: {
        addressLine1: 'Building 4B, Metro Wholesale Park',
        addressLine2: 'Industrial Corridor Sector 18',
        street: 'Express Industrial Highway',
        city: 'Mumbai',
        district: 'Mumbai Suburban',
        state: 'Maharashtra',
        postalCode: '400072',
        country: 'India',
      },
      businessHours: 'Mon - Sat: 9:00 AM - 7:00 PM',
      branding: {
        primaryColor: '#4f46e5',
        secondaryColor: '#312e81',
        accentColor: '#6366f1',
        buttonColor: '#4f46e5',
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
      },
      accentColor: '#4f46e5',
      currency: 'INR',
      currencySymbol: '₹',
      status: 'active',
      isDemo: true,
    });
    console.log(`[SeedDemo] ✅ Created Demo Shop: "${demoShop.name}" (${demoShop._id})`);
  } else {
    demoShop.name = demoShopName;
    demoShop.isDemo = true;
    demoShop.status = 'active';
    demoShop.whatsappCheckoutEnabled = true;
    demoShop.logo = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80';
    demoShop.banner = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=80';
    await demoShop.save();
    console.log(`[SeedDemo] 🔄 Refreshed Demo Shop: "${demoShop.name}" (${demoShop._id})`);
  }

  // 2. Find or create demo admin user
  let demoAdmin = await User.findOne({ email: demoEmail });
  if (!demoAdmin) {
    demoAdmin = await User.create({
      name: config.demoAdmin.name,
      email: demoEmail,
      phone: '+91 98765 43210',
      passwordHash,
      role: 'shop_admin',
      assignedShopIds: [demoShop._id],
      isActive: true,
      isVerified: true,
      isDemo: true,
      mustChangePassword: false,
    });
    console.log(`[SeedDemo] ✅ Created Demo Admin User: ${demoEmail} (${demoAdmin._id})`);
  } else {
    demoAdmin.passwordHash = passwordHash;
    demoAdmin.role = 'shop_admin';
    demoAdmin.isDemo = true;
    demoAdmin.isActive = true;
    demoAdmin.isVerified = true;
    demoAdmin.mustChangePassword = false;
    if (!demoAdmin.assignedShopIds.some((id) => id.toString() === demoShop!._id.toString())) {
      demoAdmin.assignedShopIds = [demoShop._id];
    }
    await demoAdmin.save();
    console.log(`[SeedDemo] 🔄 Refreshed Demo Admin User: ${demoEmail} (${demoAdmin._id})`);
  }

  // Link shop createdBy to demoAdmin if not set
  if (!demoShop.createdBy) {
    demoShop.createdBy = demoAdmin._id;
    await demoShop.save();
  }

  // 3. Clear ONLY demo shop's previous categories, products, and orders to keep demo fresh & idempotent
  console.log('[SeedDemo] Cleaning previous demo shop data (categories, products, orders)...');
  await Promise.all([
    Category.deleteMany({ shopId: demoShop._id }),
    Product.deleteMany({ shopId: demoShop._id }),
    Order.deleteMany({ shopId: demoShop._id }),
  ]);

  // 4. Create 4 Realistic Wholesale Categories
  console.log('[SeedDemo] Creating wholesale product categories...');
  const catTech = await Category.create({
    shopId: demoShop._id,
    name: 'Consumer Electronics & Accessories',
    slug: 'electronics-accessories',
    description: 'Bulk smart chargers, premium audio, cables, and connected mobile accessories.',
    displayOrder: 1,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
  });

  const catApparel = await Category.create({
    shopId: demoShop._id,
    name: 'Apparel & Uniforms',
    slug: 'apparel-uniforms',
    description: 'Wholesale combed cotton t-shirts, corporate poloshirts, and industrial workwear.',
    displayOrder: 2,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
  });

  const catHome = await Category.create({
    shopId: demoShop._id,
    name: 'Commercial & Home Essentials',
    slug: 'commercial-home-essentials',
    description: 'Hospitality-grade towels, microfiber linens, and bulk storage solutions.',
    displayOrder: 3,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=600&q=80',
  });

  const catFmcg = await Category.create({
    shopId: demoShop._id,
    name: 'Packaged Provisions & Beverages',
    slug: 'packaged-provisions-beverages',
    description: 'Master cartons of artisan coffee beans, natural juices, and organic spices.',
    displayOrder: 4,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80',
  });

  // 5. Create 18 Realistic Wholesale Products
  console.log('[SeedDemo] Seeding 18 wholesale products with volume pricing & MOQs...');
  const productsData = [
    // Category 1: Electronics (5 products)
    {
      name: 'GaN 65W Dual USB-C Fast Charger (Master Carton of 30)',
      slug: 'gan-65w-dual-usbc-charger-carton-30',
      sku: 'CAT-TECH-001',
      description: 'Compact 65W Gallium Nitride wall chargers with dual PD Type-C and USB-A ports. Compatible with laptops, tablets, and smartphones. Individually packaged for retail sale with CE/RoHS certification.',
      categoryId: catTech._id,
      price: 28500,
      compareAtPrice: 36000,
      unit: 'carton (30 units)',
      minimumOrderQuantity: 1,
      trackInventory: true,
      stockQuantity: 45,
      isActive: true,
      isFeatured: true,
      images: ['https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Braided Nylon USB-C to USB-C Cable 1.5m (Pack of 50)',
      slug: 'braided-usbc-cable-15m-pack-50',
      sku: 'CAT-TECH-002',
      description: 'Durable 100W rated fast-charging USB-C cables with reinforced aluminum alloy connector shells. High flex testing rated at 15,000+ bends.',
      categoryId: catTech._id,
      price: 7500,
      compareAtPrice: 10000,
      unit: 'box (50 units)',
      minimumOrderQuantity: 2,
      trackInventory: true,
      stockQuantity: 120,
      isActive: true,
      isFeatured: false,
      images: ['https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'True Wireless ANC Stereo Earbuds (Case of 20)',
      slug: 'true-wireless-anc-earbuds-case-20',
      sku: 'CAT-TECH-003',
      description: 'Active Noise Cancelling Bluetooth 5.3 wireless earphones with 32-hour combined battery life and USB-C wireless charging case. Retail display box ready.',
      categoryId: catTech._id,
      price: 24000,
      compareAtPrice: 32000,
      unit: 'case (20 units)',
      minimumOrderQuantity: 1,
      trackInventory: true,
      stockQuantity: 38,
      isActive: true,
      isFeatured: true,
      images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Magnetic MagSafe 10,000mAh Power Bank (Box of 15)',
      slug: 'magnetic-magsafe-power-bank-box-15',
      sku: 'CAT-TECH-004',
      description: 'Slimline wireless magnetic power bank with 15W wireless charging and 20W PD Type-C input/output. LED digital battery indicator.',
      categoryId: catTech._id,
      price: 19500,
      compareAtPrice: 25500,
      unit: 'box (15 units)',
      minimumOrderQuantity: 1,
      trackInventory: true,
      stockQuantity: 50,
      isActive: true,
      isFeatured: true,
      images: ['https://images.unsplash.com/photo-1609592807963-31f46b43f054?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Industrial Aluminum Laptop Riser Stand (Master Box of 25)',
      slug: 'aluminum-laptop-riser-box-25',
      sku: 'CAT-TECH-005',
      description: 'Ergonomic heavy-gauge aluminum alloy foldable laptop elevator stand with silicone anti-slip buffers and heat dissipation hollow design.',
      categoryId: catTech._id,
      price: 16250,
      compareAtPrice: 22500,
      unit: 'box (25 units)',
      minimumOrderQuantity: 1,
      trackInventory: true,
      stockQuantity: 65,
      isActive: true,
      isFeatured: false,
      images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80'],
    },

    // Category 2: Apparel (5 products)
    {
      name: '180 GSM Bio-Washed Combed Cotton T-Shirts (Lot of 100)',
      slug: '180gsm-combed-cotton-tshirts-lot-100',
      sku: 'CAT-APP-001',
      description: 'Pre-shrunk 100% premium super-combed cotton crew-neck plain t-shirts. Ideal for corporate branding, screen printing, and retail merchandisers. Assorted S/M/L/XL sizing bundle.',
      categoryId: catApparel._id,
      price: 18500,
      compareAtPrice: 25000,
      unit: 'bundle (100 pcs)',
      minimumOrderQuantity: 1,
      trackInventory: true,
      stockQuantity: 200,
      isActive: true,
      isFeatured: true,
      images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: '240 GSM Honeycomb Cotton Pique Polo Shirts (Box of 50)',
      slug: '240gsm-cotton-polo-shirts-box-50',
      sku: 'CAT-APP-002',
      description: 'Heavyweight corporate collar polo t-shirts with knit ribbed collars and side slits. Colorfast reactive dyes engineered for institutional longevity.',
      categoryId: catApparel._id,
      price: 16500,
      compareAtPrice: 21000,
      unit: 'box (50 pcs)',
      minimumOrderQuantity: 1,
      trackInventory: true,
      stockQuantity: 90,
      isActive: true,
      isFeatured: false,
      images: ['https://images.unsplash.com/photo-1625910513413-7e5d263914a8?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'High-Visibility Industrial Safety Vests (Bundle of 100)',
      slug: 'high-visibility-safety-vests-bundle-100',
      sku: 'CAT-APP-003',
      description: 'EN471 standard fluorescent neon yellow safety vests with 2-inch wide 3M reflective tape bands and heavy-duty front zipper closure.',
      categoryId: catApparel._id,
      price: 9500,
      compareAtPrice: 13000,
      unit: 'bundle (100 pcs)',
      minimumOrderQuantity: 1,
      trackInventory: true,
      stockQuantity: 150,
      isActive: true,
      isFeatured: false,
      images: ['https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Fleece Lined Unisex Zip Hoodies 320 GSM (Pack of 30)',
      slug: 'fleece-lined-zip-hoodies-pack-30',
      sku: 'CAT-APP-004',
      description: 'Brushed fleece heavyweight winter zip hoodies with kangaroo pockets and nickel-finish YKK zippers. Premium ribbed cuffs and hem.',
      categoryId: catApparel._id,
      price: 19800,
      compareAtPrice: 27000,
      unit: 'pack (30 pcs)',
      minimumOrderQuantity: 1,
      trackInventory: true,
      stockQuantity: 70,
      isActive: true,
      isFeatured: true,
      images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Commercial Canvas Work Aprons with Leather Straps (Pack of 20)',
      slug: 'canvas-work-aprons-pack-20',
      sku: 'CAT-APP-005',
      description: '16oz heavy water-repellent duck canvas utility aprons with cross-back genuine leather harness straps for baristas, chefs, and salon staff.',
      categoryId: catApparel._id,
      price: 11000,
      compareAtPrice: 15000,
      unit: 'pack (20 pcs)',
      minimumOrderQuantity: 1,
      trackInventory: true,
      stockQuantity: 40,
      isActive: true,
      isFeatured: false,
      images: ['https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=600&q=80'],
    },

    // Category 3: Home & Hospitality (4 products)
    {
      name: 'Hotel Luxury 600 GSM Cotton Bath Towel Set (Bale of 24)',
      slug: 'hotel-luxury-600gsm-bath-towels-bale-24',
      sku: 'CAT-HOM-001',
      description: '100% Turkish zero-twist combed cotton bath towels. Super absorbent, plush pile with double-stitched reinforced hems designed for repeated commercial laundering.',
      categoryId: catHome._id,
      price: 14400,
      compareAtPrice: 19200,
      unit: 'bale (24 pcs)',
      minimumOrderQuantity: 1,
      trackInventory: true,
      stockQuantity: 60,
      isActive: true,
      isFeatured: true,
      images: ['https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Stainless Steel Double-Wall Vacuum Bottles 750ml (Box of 40)',
      slug: 'vacuum-insulated-bottles-box-40',
      sku: 'CAT-HOM-002',
      description: 'Food grade 18/8 stainless steel thermo flasks keeping liquids cold for 24 hours or hot for 12 hours. Matte powder-coated exterior ready for laser engraving.',
      categoryId: catHome._id,
      price: 16800,
      compareAtPrice: 22000,
      unit: 'box (40 units)',
      minimumOrderQuantity: 1,
      trackInventory: true,
      stockQuantity: 85,
      isActive: true,
      isFeatured: false,
      images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Microfiber Multi-Surface Cleaning Cloths (Master Pack of 200)',
      slug: 'microfiber-cleaning-cloths-pack-200',
      sku: 'CAT-HOM-003',
      description: '300 GSM lint-free streak-free microfiber cloths. Color-coded packs of 50 for sanitation protocols in commercial kitchens, auto detailing, and facilities management.',
      categoryId: catHome._id,
      price: 5200,
      compareAtPrice: 7500,
      unit: 'case (200 pcs)',
      minimumOrderQuantity: 1,
      trackInventory: true,
      stockQuantity: 140,
      isActive: true,
      isFeatured: false,
      images: ['https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Aromatherapy Ceramic Ultrasonic Diffusers (Case of 18)',
      slug: 'ceramic-ultrasonic-diffusers-case-18',
      sku: 'CAT-HOM-004',
      description: 'Handcrafted ceramic cover cold mist essential oil diffusers with 280ml reservoir, ambient LED night light, and auto-shutoff safety timer.',
      categoryId: catHome._id,
      price: 21600,
      compareAtPrice: 28800,
      unit: 'case (18 units)',
      minimumOrderQuantity: 1,
      trackInventory: true,
      stockQuantity: 35,
      isActive: true,
      isFeatured: true,
      images: ['https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=600&q=80'],
    },

    // Category 4: FMCG & Provisions (4 products)
    {
      name: 'Estate Arabica Coffee Beans Medium Roast (10kg Vacuum Sack)',
      slug: 'estate-arabica-coffee-beans-10kg',
      sku: 'CAT-FMC-001',
      description: 'Single-origin washed Arabica coffee beans cultivated at 1,400m altitude in Chikmagalur. Cupping notes of dark chocolate and citrus blossom with rich crema.',
      categoryId: catFmcg._id,
      price: 8800,
      compareAtPrice: 11500,
      unit: 'sack (10kg)',
      minimumOrderQuantity: 1,
      trackInventory: true,
      stockQuantity: 50,
      isActive: true,
      isFeatured: true,
      images: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Organic Wild Honey with Comb (Carton of 24 Jars x 500g)',
      slug: 'organic-wild-honey-carton-24-jars',
      sku: 'CAT-FMC-002',
      description: 'Raw unprocessed forest honey packed in hexagonal glass jars with safety tamper seals. Certified organic and tested 100% pure NMR standard.',
      categoryId: catFmcg._id,
      price: 7680,
      compareAtPrice: 9600,
      unit: 'carton (24 jars)',
      minimumOrderQuantity: 1,
      trackInventory: true,
      stockQuantity: 75,
      isActive: true,
      isFeatured: false,
      images: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Sparkling Alphonso Mango Pulp Soda 250ml (Case of 24 Cans)',
      slug: 'sparkling-mango-soda-case-24',
      sku: 'CAT-FMC-003',
      description: 'Refreshing carbonated real fruit juice with 20% Ratnagiri Alphonso mango pulp. Slim matte aluminium cans, shelf-stable for 12 months.',
      categoryId: catFmcg._id,
      price: 960,
      compareAtPrice: 1200,
      unit: 'case (24 cans)',
      minimumOrderQuantity: 5,
      trackInventory: true,
      stockQuantity: 240,
      isActive: true,
      isFeatured: true,
      images: ['https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Cold-Pressed Virgin Coconut Oil (Master Carton of 12 x 1L)',
      slug: 'virgin-coconut-oil-carton-12',
      sku: 'CAT-FMC-004',
      description: '100% pure raw cold-pressed extra virgin coconut oil from fresh mature kernel milk. Packed in food-grade amber PET bottles with flip-top dispenser.',
      categoryId: catFmcg._id,
      price: 4320,
      compareAtPrice: 5400,
      unit: 'carton (12 bottles)',
      minimumOrderQuantity: 2,
      trackInventory: true,
      stockQuantity: 95,
      isActive: true,
      isFeatured: false,
      images: ['https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80'],
    },
  ];

  const createdProducts = await Product.create(
    productsData.map((p) => ({
      ...p,
      shopId: demoShop!._id,
    }))
  );
  console.log(`[SeedDemo] ✅ Successfully seeded ${createdProducts.length} wholesale products`);

  // 6. Create 6 Realistic Sample Orders with Diverse Statuses for Rich Analytics
  console.log('[SeedDemo] Generating 6 sample B2B wholesale orders for dashboard metrics...');
  const now = Date.now();
  const sampleOrdersData = [
    {
      orderNumber: 'DEMO-ORD-1001',
      status: 'delivered' as const,
      paymentStatus: 'paid' as const,
      hoursAgo: 168, // 7 days ago
      customer: {
        name: 'Aditya Birla Retail Supplies',
        phone: '+91 98200 44551',
        email: 'procurement@abretail.sample.com',
        businessName: 'AB Retail Stores Ltd',
        city: 'Pune',
        state: 'Maharashtra',
      },
      items: [
        { product: createdProducts[0], qty: 2 }, // GaN Charger x 2
        { product: createdProducts[1], qty: 3 }, // USB-C Cables x 3
      ],
      paymentRef: 'NEFT-AXIS-9928172',
    },
    {
      orderNumber: 'DEMO-ORD-1002',
      status: 'shipped' as const,
      paymentStatus: 'paid' as const,
      hoursAgo: 72, // 3 days ago
      customer: {
        name: 'Nexus Corp Solutions',
        phone: '+91 99300 11223',
        email: 'nexus.purchasing@corp.sample.com',
        businessName: 'Nexus Tech Parks',
        city: 'Bengaluru',
        state: 'Karnataka',
      },
      items: [
        { product: createdProducts[5], qty: 2 }, // Cotton T-Shirts x 2 lots
        { product: createdProducts[8], qty: 1 }, // Fleece Hoodies x 1
      ],
      paymentRef: 'UPI-HDFC-6638102',
    },
    {
      orderNumber: 'DEMO-ORD-1003',
      status: 'processing' as const,
      paymentStatus: 'paid' as const,
      hoursAgo: 36, // 1.5 days ago
      customer: {
        name: 'Grand Hyatt Procurement Desk',
        phone: '+91 98450 77889',
        email: 'hyatt.linen@hotels.sample.com',
        businessName: 'Grand Hyatt Hospitality',
        city: 'Mumbai',
        state: 'Maharashtra',
      },
      items: [
        { product: createdProducts[10], qty: 4 }, // Luxury Towels x 4
        { product: createdProducts[13], qty: 2 }, // Ultrasonic Diffusers x 2
      ],
      paymentRef: 'RTGS-SBIN-4455667',
    },
    {
      orderNumber: 'DEMO-ORD-1004',
      status: 'confirmed' as const,
      paymentStatus: 'paid' as const,
      hoursAgo: 18, // 18 hours ago
      customer: {
        name: 'Blue Tokai Cafe Franchises',
        phone: '+91 97110 33445',
        email: 'supply@cafeblue.sample.com',
        businessName: 'Blue Tokai Stores',
        city: 'New Delhi',
        state: 'Delhi',
      },
      items: [
        { product: createdProducts[14], qty: 3 }, // Arabica Coffee x 3
        { product: createdProducts[16], qty: 10 }, // Mango Soda x 10
      ],
      paymentRef: 'IMPS-ICIC-2233441',
    },
    {
      orderNumber: 'DEMO-ORD-1005',
      status: 'pending' as const,
      paymentStatus: 'unpaid' as const,
      hoursAgo: 6, // 6 hours ago
      customer: {
        name: 'Metro Hypermarket Chain',
        phone: '+91 98920 66778',
        email: 'orders@metrohyper.sample.com',
        businessName: 'Metro Retail Mart',
        city: 'Ahmedabad',
        state: 'Gujarat',
      },
      items: [
        { product: createdProducts[3], qty: 2 }, // Power Banks x 2
        { product: createdProducts[15], qty: 4 }, // Honey x 4
      ],
      paymentRef: undefined,
    },
    {
      orderNumber: 'DEMO-ORD-1006',
      status: 'confirmed' as const,
      paymentStatus: 'paid' as const,
      hoursAgo: 2, // 2 hours ago
      customer: {
        name: 'Sunrise Tech Distribution',
        phone: '+91 98110 88990',
        email: 'sales@sunrisetech.sample.com',
        businessName: 'Sunrise Electronics Hub',
        city: 'Hyderabad',
        state: 'Telangana',
      },
      items: [
        { product: createdProducts[2], qty: 2 }, // ANC Earbuds x 2
        { product: createdProducts[4], qty: 2 }, // Laptop Risers x 2
      ],
      paymentRef: 'UPI-YESB-1122334',
    },
  ];

  for (const o of sampleOrdersData) {
    const createdAt = new Date(now - o.hoursAgo * 3600 * 1000);
    const lineItems = o.items.map((i) => ({
      productId: i.product._id,
      name: i.product.name,
      sku: i.product.sku,
      quantity: i.qty,
      unit: i.product.unit,
      unitPrice: i.product.price,
      lineTotal: i.product.price * i.qty,
      image: i.product.images[0] || '',
    }));

    const subtotal = lineItems.reduce((acc, curr) => acc + curr.lineTotal, 0);
    const grandTotal = subtotal;

    await Order.create({
      orderNumber: o.orderNumber,
      shopId: demoShop._id,
      customerSnapshot: {
        name: o.customer.name,
        email: o.customer.email,
        phone: o.customer.phone,
        whatsapp: o.customer.phone,
        businessName: o.customer.businessName,
      },
      deliveryAddress: {
        fullName: o.customer.name,
        phone: o.customer.phone,
        whatsapp: o.customer.phone,
        businessName: o.customer.businessName,
        addressLine1: 'Unit 102, Commercial Wing',
        addressLine2: 'Tech & Trade Center',
        street: 'Central Ring Road',
        city: o.customer.city,
        state: o.customer.state,
        postalCode: '400001',
        country: 'India',
      },
      items: lineItems,
      subtotal,
      deliveryCharge: 0,
      discount: 0,
      grandTotal,
      currency: 'INR',
      currencySymbol: '₹',
      orderStatus: o.status,
      paymentStatus: o.paymentStatus,
      customerNotes: 'Please confirm dispatch schedule via WhatsApp notification once ready.',
      internalNotes: o.paymentRef ? `Payment verified against reference: ${o.paymentRef}` : 'Awaiting payment verification.',
      statusHistory: [
        {
          status: 'pending',
          note: 'B2B order generated via Catalogue Storefront',
          timestamp: createdAt,
        },
        ...(o.status !== 'pending'
          ? [
              {
                status: 'confirmed',
                note: 'Order confirmed and inventory reserved',
                timestamp: new Date(createdAt.getTime() + 30 * 60 * 1000),
              },
            ]
          : []),
        ...(o.status === 'processing' || o.status === 'shipped' || o.status === 'delivered'
          ? [
              {
                status: 'processing',
                note: 'Warehouse packing and palletizing commenced',
                timestamp: new Date(createdAt.getTime() + 2 * 3600 * 1000),
              },
            ]
          : []),
        ...(o.status === 'shipped' || o.status === 'delivered'
          ? [
              {
                status: 'shipped',
                note: 'Dispatched via express road logistics tracking',
                timestamp: new Date(createdAt.getTime() + 6 * 3600 * 1000),
              },
            ]
          : []),
        ...(o.status === 'delivered'
          ? [
              {
                status: 'delivered',
                note: 'Delivery acknowledged with physical POD',
                timestamp: new Date(createdAt.getTime() + 24 * 3600 * 1000),
              },
            ]
          : []),
      ],
      paymentHistory: o.paymentRef
        ? [
            {
              status: 'paid',
              amount: grandTotal,
              reference: o.paymentRef,
              recordedBy: demoAdmin._id,
              note: 'B2B wholesale payment verified in full',
              timestamp: new Date(createdAt.getTime() + 45 * 60 * 1000),
            },
          ]
        : [],
      whatsappHandoffInitiated: true,
      whatsappHandoffTimestamp: createdAt,
      createdAt,
      updatedAt: createdAt,
    });
  }

  console.log(`[SeedDemo] ✅ Created 6 diverse demonstration orders with live status histories`);

  console.log('\n===========================================================');
  console.log('🎉 CATALOZA DEMO STORE PROVISIONING COMPLETE!');
  console.log('===========================================================');
  console.log('Demo Administrator Credentials:');
  console.log(`  Email:            ${demoEmail}`);
  console.log(`  Password:         ${demoPassword}`);
  console.log(`  OTP Requirement:  BYPASS (Direct email + password sign-in)`);
  console.log('Demo Shop Details:');
  console.log(`  Shop Name:        ${demoShop.name}`);
  console.log(`  Public Link:      /${demoShop.slug}`);
  console.log(`  Categories:       4 seeded`);
  console.log(`  Products:         ${createdProducts.length} seeded`);
  console.log(`  Sample Orders:    6 seeded`);
  console.log('===========================================================\n');
}

// If executed directly from CLI: tsx scripts/seedDemo.ts
if (require.main === module) {
  (async () => {
    try {
      console.log('[SeedDemo] Connecting to MongoDB...');
      await mongoose.connect(config.mongoUri);
      console.log(`[SeedDemo] Connected to: ${mongoose.connection.name}`);
      await seedDemo();
    } catch (err: any) {
      console.error('[SeedDemo] Fatal error during seeding:', err);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
      process.exit(0);
    }
  })();
}
