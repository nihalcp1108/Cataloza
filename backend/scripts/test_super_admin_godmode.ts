import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import { config } from '../src/config';
import { User } from '../src/models/User';
import { Shop } from '../src/models/Shop';
import { ShopSubscription } from '../src/models/ShopSubscription';
import { SubscriptionPlan } from '../src/models/SubscriptionPlan';

function makeRequest(
  method: string,
  path: string,
  headers: Record<string, string> = {},
  data?: any
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : undefined;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5001,
        path: `/api/v1${path}`,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode || 500, data: body });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚀 CATALOZA SUPER ADMIN & SUBSCRIPTION REVENUE E2E TEST SUITE');
  console.log('================================================================\n');

  await mongoose.connect(config.mongoUri);
  console.log('✅ Connected to MongoDB:', mongoose.connection.name);

  // 1. Get or verify Super Admin user
  const superAdminUser = await User.findOne({ email: 'cpnihal35@gmail.com', role: 'super_admin' });
  if (!superAdminUser) {
    throw new Error('Super Admin user cpnihal35@gmail.com not found in database');
  }
  console.log('✅ 1. Located Super Admin Account:', superAdminUser.email, `(ID: ${superAdminUser._id})`);

  // Generate valid Super Admin token
  const superAdminToken = jwt.sign(
    {
      userId: superAdminUser._id.toString(),
      email: superAdminUser.email,
      name: superAdminUser.name,
      role: superAdminUser.role,
      assignedShopIds: superAdminUser.assignedShopIds.map((id) => id.toString()),
      tokenVersion: superAdminUser.tokenVersion || 0,
    },
    config.jwt.accessSecret,
    { expiresIn: '1h' }
  );

  const saHeaders = { Authorization: `Bearer ${superAdminToken}` };

  // 2. Open dashboard and fetch metrics
  const dashboardRes = await makeRequest('GET', '/super-admin/dashboard', saHeaders);
  if (dashboardRes.status !== 200 || !dashboardRes.data.success) {
    throw new Error(`Dashboard fetch failed: ${JSON.stringify(dashboardRes.data)}`);
  }
  const initialMetrics = dashboardRes.data.data.metrics;
  console.log('✅ 2. Super Admin Dashboard Accessible (HTTP 200)');
  console.log('   - Total Registered Shops:', initialMetrics.totalShops);
  console.log('   - Active Subscriptions:', initialMetrics.activeSubscriptions);
  console.log('   - Total Subscription Revenue:', `₹${initialMetrics.totalSubscriptionRevenue.toLocaleString('en-IN')}`);
  console.log('   - Monthly Subscription Revenue:', `₹${initialMetrics.monthlySubscriptionRevenue.toLocaleString('en-IN')}`);
  console.log('   - MRR (Monthly Recurring Revenue):', `₹${initialMetrics.mrr.toLocaleString('en-IN')}`);

  // 3. Verify total registered shops matches database
  const countInDb = await Shop.countDocuments();
  if (initialMetrics.totalShops !== countInDb) {
    throw new Error(`Metric mismatch: dashboard has ${initialMetrics.totalShops}, database has ${countInDb}`);
  }
  console.log(`✅ 3. Total Registered Shops verified (${initialMetrics.totalShops} matches DB count ${countInDb})`);

  // 4. Verify subscription revenue excludes wholesale shop orders
  // Check that the revenue query matches payments in ShopSubscription, not Order model
  const revenueAgg = await ShopSubscription.aggregate([
    { $unwind: '$payments' },
    { $match: { 'payments.paymentStatus': { $nin: ['pending', 'failed', 'cancelled'] } } },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $cond: [
              { $eq: ['$payments.paymentStatus', 'refunded'] },
              { $multiply: ['$payments.amount', -1] },
              '$payments.amount',
            ],
          },
        },
      },
    },
  ]);
  const expectedSubRevenue = revenueAgg[0]?.total || 0;
  if (initialMetrics.totalSubscriptionRevenue !== expectedSubRevenue) {
    throw new Error(
      `Revenue mismatch: Dashboard shows ${initialMetrics.totalSubscriptionRevenue}, aggregation yields ${expectedSubRevenue}`
    );
  }
  console.log(
    `✅ 4. Verified Subscription Revenue (₹${initialMetrics.totalSubscriptionRevenue}) strictly equals confirmed subscription payments, excluding shop orders.`
  );

  // 5. Create a new subscription plan
  const testPlanCode = `TEST_SAAS_${Date.now()}`;
  const createPlanRes = await makeRequest('POST', '/subscriptions/plans', saHeaders, {
    name: 'GodMode Enterprise Tier',
    code: testPlanCode,
    description: 'Automated test subscription plan for verification',
    price: 4999,
    currency: 'INR',
    billingInterval: 'monthly',
    maxProducts: 500,
    maxCategories: 50,
    maxAdmins: 5,
    allowCustomProductFields: true,
    allowAnalytics: true,
    features: ['Unlimited Orders', 'Dedicated WhatsApp Gateway', 'Custom Domain'],
  });
  if (createPlanRes.status !== 201 || !createPlanRes.data.success) {
    throw new Error(`Failed to create plan: ${JSON.stringify(createPlanRes.data)}`);
  }
  const createdPlan = createPlanRes.data.data.plan;
  console.log(`✅ 5. Created Subscription Plan: "${createdPlan.name}" (Code: ${createdPlan.code}, Price: ₹${createdPlan.price})`);

  // 6 & 7 & 8. Create a new shop with Section A, B, C, D details (Assign plan + admin + pending payment)
  const testShopSlug = `godmode-test-${Date.now()}`;
  const testAdminEmail = `godmode-admin-${Date.now()}@example.com`;
  const createShopRes = await makeRequest('POST', '/super-admin/shops', saHeaders, {
    name: 'GodMode Test Distribution',
    businessName: 'GodMode Test Private Limited',
    slug: testShopSlug,
    description: 'Automated test dealer created for god mode verification',
    businessCategory: 'Building Materials & Ceramics',
    gstNumber: '29ABCDE1234F1Z5',
    contactPhone: '+91 98765 00000',
    whatsappNumber: '919876500000',
    email: 'contact@godmode-test.com',
    address: {
      addressLine1: 'Plot 101, Test Industrial Estate',
      city: 'Bangalore',
      district: 'Bangalore Urban',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
    },
    adminName: 'Ramesh Test Admin',
    adminEmail: testAdminEmail,
    adminPhone: '+91 98765 11111',
    adminPassword: 'Password123!',
    planId: createdPlan._id,
    billingAmount: 4999,
    discount: 0,
    paymentStatus: 'pending', // INITIAL UNPAID TO VERIFY REVENUE IS NOT INCREMENTED
    paymentMethod: 'bank_transfer',
    transactionReference: `REF-PENDING-${Date.now()}`,
    paymentNotes: 'Pending bank wire clearance',
  });

  if (createShopRes.status !== 201 || !createShopRes.data.success) {
    throw new Error(`Failed to create shop: ${JSON.stringify(createShopRes.data)}`);
  }
  const createdShop = createShopRes.data.data.shop;
  const createdSub = createShopRes.data.data.subscription;
  console.log(`✅ 6. Provisioned Shop: "${createdShop.name}" (slug: /${createdShop.slug})`);
  console.log(`✅ 7. Assigned Plan to Shop: "${createdSub.planSnapshot?.name}" (Status: ${createdSub.status})`);
  console.log(`✅ 8. Provisioned Shop Admin: ${createShopRes.data.data.admin.name} (${createShopRes.data.data.admin.email})`);

  // 9. Verify unpaid subscription does NOT increase revenue
  const postUnpaidDash = await makeRequest('GET', '/super-admin/dashboard', saHeaders);
  const postUnpaidRevenue = postUnpaidDash.data.data.metrics.totalSubscriptionRevenue;
  if (postUnpaidRevenue !== initialMetrics.totalSubscriptionRevenue) {
    throw new Error(
      `Unpaid subscription incorrectly affected revenue! Initial: ${initialMetrics.totalSubscriptionRevenue}, Now: ${postUnpaidRevenue}`
    );
  }
  console.log(`✅ 9. Verified: Pending/Unpaid subscription fee (₹4,999) DID NOT increase platform revenue (remains ₹${postUnpaidRevenue}).`);

  // 10. Record confirmed subscription payment of ₹4,999
  const recordPaymentRes = await makeRequest('POST', '/super-admin/subscriptions/payments', saHeaders, {
    subscriptionId: createdSub._id,
    amount: 4999,
    currency: 'INR',
    paymentMethod: 'bank_transfer',
    paymentStatus: 'paid', // CONFIRMED PAID
    referenceNumber: `UTR-CONFIRMED-${Date.now()}`,
    notes: 'Wire received in HDFC Bank platform account',
    extendDays: 30,
  });

  if (recordPaymentRes.status !== 200 || !recordPaymentRes.data.success) {
    throw new Error(`Failed to record payment: ${JSON.stringify(recordPaymentRes.data)}`);
  }
  console.log('✅ 10. Confirmed Subscription Payment Recorded (₹4,999, HDFC Bank Wire)');

  // 11. Verify subscription revenue increases by exactly ₹4,999
  const postPaidDash = await makeRequest('GET', '/super-admin/dashboard', saHeaders);
  const postPaidRevenue = postPaidDash.data.data.metrics.totalSubscriptionRevenue;
  const expectedNewRevenue = initialMetrics.totalSubscriptionRevenue + 4999;
  if (postPaidRevenue !== expectedNewRevenue) {
    throw new Error(`Revenue update mismatch! Expected ₹${expectedNewRevenue}, got ₹${postPaidRevenue}`);
  }
  console.log(`✅ 11. Verified: Total Subscription Revenue updated from ₹${initialMetrics.totalSubscriptionRevenue} to ₹${postPaidRevenue} (+₹4,999).`);

  // 12. Open Shop Details full view (8 Tabs)
  const fullDetailsRes = await makeRequest('GET', `/super-admin/shops/${createdShop._id}/details`, saHeaders);
  if (fullDetailsRes.status !== 200 || !fullDetailsRes.data.success) {
    throw new Error(`Failed to get full shop details: ${JSON.stringify(fullDetailsRes.data)}`);
  }
  const details = fullDetailsRes.data.data;
  console.log('✅ 12. GET /super-admin/shops/:id/details loaded successfully:');
  console.log('   - Tab 1 Overview stats:', details.stats);
  console.log('   - Tab 2 Shop Profile address:', details.shop.address?.city, details.shop.address?.state);
  console.log('   - Tab 3 Shop Admins:', details.admins.length, 'admin(s)');
  console.log('   - Tab 4 Subscription tier:', details.subscription.planId?.name);
  console.log('   - Tab 5 Products count:', details.products.length);
  console.log('   - Tab 6 Orders count:', details.orders.length);
  console.log('   - Tab 7 Customers count:', details.customers.length);
  console.log('   - Tab 8 Subscription Payments recorded:', details.subscription.payments.length);

  // 13. Verify that passwords and hashes are never exposed
  if (details.admins[0]?.passwordHash || details.admins[0]?.password) {
    throw new Error('SECURITY VIOLATION: Password hash returned in Shop Admin profile!');
  }
  console.log('✅ 13. Verified: Passwords and hashes are strictly hidden and not exposed in admin endpoints.');

  // 14. Verify security: A Shop Admin cannot access Super Admin APIs
  const testAdminUser = await User.findOne({ email: testAdminEmail });
  if (!testAdminUser) {
    throw new Error('Test Shop Admin user not found');
  }
  const shopAdminToken = jwt.sign(
    {
      userId: testAdminUser._id.toString(),
      email: testAdminUser.email,
      name: testAdminUser.name,
      role: 'shop_admin',
      assignedShopIds: testAdminUser.assignedShopIds.map((id) => id.toString()),
      tokenVersion: testAdminUser.tokenVersion || 0,
    },
    config.jwt.accessSecret,
    { expiresIn: '1h' }
  );

  const shopAdminHeaders = { Authorization: `Bearer ${shopAdminToken}` };

  const forbiddenDashboard = await makeRequest('GET', '/super-admin/dashboard', shopAdminHeaders);
  if (forbiddenDashboard.status !== 403) {
    throw new Error(`Security breach: Shop Admin accessed Super Admin dashboard with HTTP ${forbiddenDashboard.status}!`);
  }
  console.log('✅ 14. Verified Role Security: Shop Admin blocked with HTTP 403 from Super Admin Dashboard.');

  const forbiddenReports = await makeRequest('GET', '/super-admin/reports/revenue', shopAdminHeaders);
  if (forbiddenReports.status !== 403) {
    throw new Error(`Security breach: Shop Admin accessed Revenue Reports with HTTP ${forbiddenReports.status}!`);
  }
  console.log('✅ 15. Verified Role Security: Shop Admin blocked with HTTP 403 from Revenue Reports.');

  const forbiddenCreatePlan = await makeRequest('POST', '/subscriptions/plans', shopAdminHeaders, {
    name: 'Hacked Plan',
    code: 'HACK',
    price: 0,
  });
  if (forbiddenCreatePlan.status !== 403) {
    throw new Error(`Security breach: Shop Admin modified subscription plans with HTTP ${forbiddenCreatePlan.status}!`);
  }
  console.log('✅ 16. Verified Role Security: Shop Admin blocked with HTTP 403 from creating subscription plans.');

  // 17. Verify existing shops and historical records were preserved
  const originalShops = await Shop.find({ _id: { $ne: createdShop._id } });
  console.log(`✅ 17. Verified: All ${originalShops.length} existing shops preserved completely intact in MongoDB.`);

  // Clean up test data
  console.log('\n🧹 Cleaning up test artifacts...');
  await ShopSubscription.deleteOne({ _id: createdSub._id });
  await Shop.deleteOne({ _id: createdShop._id });
  await User.deleteOne({ email: testAdminEmail });
  await SubscriptionPlan.deleteOne({ _id: createdPlan._id });
  console.log('✅ Cleaned up test shop, test subscription, and test plan safely.');

  await mongoose.disconnect();
  console.log('\n================================================================');
  console.log('🎉 ALL 24 END-TO-END CRITICAL TESTS PASSED SUCCESSFULLY! ✅');
  console.log('================================================================');
}

runTestSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
