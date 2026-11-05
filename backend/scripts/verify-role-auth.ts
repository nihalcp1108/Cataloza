import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../src/config';
import { User } from '../src/models/User';
import { Shop } from '../src/models/Shop';
import { Category } from '../src/models/Category';
import { Product } from '../src/models/Product';
import { Order } from '../src/models/Order';
import { OtpChallenge } from '../src/models/OtpChallenge';
import { AuthService } from '../src/services/auth.service';
import { AuthController } from '../src/controllers/auth.controller';
import { ShopAdminController } from '../src/controllers/shopAdmin.controller';
import { EmailService } from '../src/services/email.service';
import { requireShopAccess, authorizeRole } from '../src/middleware/auth';
import { seedDemo } from './seedDemo';

async function runTests() {
  console.log('===========================================================');
  console.log('🧪 ROLE-BASED & DEMO ADMIN AUTHENTICATION TEST SUITE');
  console.log('===========================================================');

  console.log('Connecting to database...');
  await mongoose.connect(config.mongoUri);
  console.log(`Connected to MongoDB Atlas: ${mongoose.connection.name}`);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  function mockReqRes(body: any = {}, params: any = {}, query: any = {}, user: any = null, ip: string = '127.0.0.1') {
    let statusCode = 200;
    let responseData: any = null;
    let cookiesSet: any[] = [];

    const req: any = {
      body,
      params,
      query,
      user,
      ip,
      headers: { 'user-agent': 'TestAgent/1.0' },
    };

    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        responseData = data;
        return this;
      },
      cookie(name: string, value: string, options: any) {
        cookiesSet.push({ name, value, options });
        return this;
      },
      clearCookie(name: string) {
        return this;
      },
      send(data: any) {
        responseData = data;
        return this;
      },
    };

    return {
      req,
      res,
      getStatus: () => statusCode,
      getData: () => responseData,
      getCookies: () => cookiesSet,
    };
  }

  // Spy & stub email dispatch functions to monitor outgoing OTPs without triggering external rate limits
  const sentEmails: {
    superAdminOtps: { to: string; otp: string }[];
    adminOtps: { to: string; name: string; otp: string }[];
    customerOtps: { to: string; name: string; otp: string }[];
  } = {
    superAdminOtps: [],
    adminOtps: [],
    customerOtps: [],
  };

  const origSendSuperAdminOtp = EmailService.sendSuperAdminOtp;
  const origSendAdminOtp = EmailService.sendAdminOtp;
  const origSendVerificationOtp = EmailService.sendVerificationOtp;

  EmailService.sendSuperAdminOtp = async (to: string, otp: string) => {
    sentEmails.superAdminOtps.push({ to, otp });
    return { id: `mock-superadmin-msg-${Date.now()}` };
  };

  EmailService.sendAdminOtp = async (to: string, name: string, otp: string) => {
    sentEmails.adminOtps.push({ to, name, otp });
    return { id: `mock-admin-msg-${Date.now()}` };
  };

  EmailService.sendVerificationOtp = async (to: string, name: string, otp: string) => {
    sentEmails.customerOtps.push({ to, name, otp });
    return { id: `mock-customer-msg-${Date.now()}` };
  };

  const testAdminEmail = 'test_dealer_admin@example.com';
  const testAdminUsername = 'DealerAdminTest';
  const testAdminPassword = 'DealerTestPassword123!';

  const superAdminEmail = 'cpnihal35@gmail.com';
  const superAdminPassword = config.superAdmin.password || 'SuperAdminPassword123!';

  const demoEmail = config.demoAdmin.email.toLowerCase().trim();
  const demoPassword = config.demoAdmin.password;

  try {
    // -------------------------------------------------------------
    // Provision Demo Store and Accounts
    // -------------------------------------------------------------
    console.log('\n--- Provisioning Demo Store via seedDemo ---');
    await seedDemo();

    console.log('\n--- Setting up additional test accounts ---');
    await User.deleteMany({
      email: { $in: [testAdminEmail, 'test_customer_verified@example.com', 'test_customer_unverified@example.com', 'impostor_admin@example.com'] },
    });
    await OtpChallenge.deleteMany({
      email: { $in: [testAdminEmail, superAdminEmail, demoEmail, 'test_customer_verified@example.com', 'test_customer_unverified@example.com'] },
    });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(testAdminPassword, salt);

    // Create a real shop for regular dealer
    let realShop = await Shop.findOne({ slug: 'test-real-dealer-shop' });
    if (!realShop) {
      realShop = await Shop.create({
        name: 'Real Dealer Enterprise',
        slug: 'test-real-dealer-shop',
        whatsappNumber: '919876543210',
        currency: 'INR',
        currencySymbol: '₹',
        status: 'active',
      });
    }

    const shopAdmin = await User.create({
      name: testAdminUsername,
      email: testAdminEmail,
      phone: '1234567890',
      passwordHash,
      role: 'shop_admin',
      assignedShopIds: [realShop._id],
      isActive: true,
      isVerified: true,
      isDemo: false,
    });

    // Ensure Super Admin user exists and has correct password hash
    let superAdmin = await User.findOne({ email: superAdminEmail });
    if (!superAdmin) {
      const superHash = await bcrypt.hash(superAdminPassword, salt);
      superAdmin = await User.create({
        name: 'Super Admin',
        email: superAdminEmail,
        passwordHash: superHash,
        role: 'super_admin',
        assignedShopIds: [],
        isActive: true,
        isVerified: true,
      });
    } else {
      superAdmin.passwordHash = await bcrypt.hash(superAdminPassword, salt);
      superAdmin.isActive = true;
      superAdmin.isVerified = true;
      await superAdmin.save();
    }

    const verifiedCustomer = await User.create({
      name: 'VerifiedCustomer',
      email: 'test_customer_verified@example.com',
      passwordHash,
      role: 'customer',
      assignedShopIds: [],
      isActive: true,
      isVerified: true,
    });

    const unverifiedCustomer = await User.create({
      name: 'UnverifiedCustomer',
      email: 'test_customer_unverified@example.com',
      passwordHash,
      role: 'customer',
      assignedShopIds: [],
      isActive: true,
      isVerified: false,
    });

    assert(Boolean(shopAdmin && shopAdmin.role === 'shop_admin'), 'Regular shop_admin (Dealer) account ready');
    assert(Boolean(superAdmin && superAdmin.role === 'super_admin'), 'Super Admin account ready');
    assert(Boolean(verifiedCustomer && verifiedCustomer.isVerified), 'Verified customer account ready');
    assert(Boolean(unverifiedCustomer && !unverifiedCustomer.isVerified), 'Unverified customer account ready');

    // -------------------------------------------------------------
    // Test 1: Super Admin Login (Password + Mandatory OTP)
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Super Admin Login with Mandatory OTP ---');
    sentEmails.superAdminOtps = [];
    const saCtx = mockReqRes({ email: superAdminEmail, password: superAdminPassword });
    await AuthController.login(saCtx.req, saCtx.res);

    assert(saCtx.getStatus() === 200, 'Super Admin login returns HTTP 200');
    assert(saCtx.getData()?.requiresOtp === true, 'Super Admin login requiresOtp is TRUE');
    assert(!saCtx.getData()?.data?.accessToken, 'NO accessToken issued in Step 1 for Super Admin');
    assert(sentEmails.superAdminOtps.length === 1, 'EmailService.sendSuperAdminOtp was invoked');

    const saChallengeId = saCtx.getData()?.data?.challengeId;
    const saOtp = sentEmails.superAdminOtps[0].otp;

    const saVerifyCtx = mockReqRes({ challengeId: saChallengeId, otp: saOtp });
    await AuthController.verifyOtp(saVerifyCtx.req, saVerifyCtx.res);
    assert(saVerifyCtx.getStatus() === 200, 'Super Admin OTP verification returns HTTP 200');
    assert(Boolean(saVerifyCtx.getData()?.data?.accessToken), 'Super Admin receives JWT accessToken after OTP');
    assert(saVerifyCtx.getData()?.data?.user?.role === 'super_admin', 'Super Admin role verified');

    // -------------------------------------------------------------
    // Test 2: Regular Admin Login (Password + Mandatory OTP)
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Regular Admin Login with Mandatory OTP ---');
    sentEmails.adminOtps = [];
    const dealerEmailCtx = mockReqRes({ email: testAdminEmail, password: testAdminPassword });
    await AuthController.login(dealerEmailCtx.req, dealerEmailCtx.res);

    assert(dealerEmailCtx.getStatus() === 200, 'Regular Dealer login returns HTTP 200');
    assert(dealerEmailCtx.getData()?.requiresOtp === true, 'Regular Dealer login requiresOtp is TRUE');
    assert(!dealerEmailCtx.getData()?.data?.accessToken, 'NO accessToken issued in Step 1 for Regular Dealer');
    assert(sentEmails.adminOtps.length === 1, 'EmailService.sendAdminOtp was invoked for Regular Dealer');

    const dealerChallengeId = dealerEmailCtx.getData()?.data?.challengeId;
    const dealerOtp = sentEmails.adminOtps[0].otp;

    const dealerVerifyCtx = mockReqRes({ challengeId: dealerChallengeId, otp: dealerOtp });
    await AuthController.verifyOtp(dealerVerifyCtx.req, dealerVerifyCtx.res);
    assert(dealerVerifyCtx.getStatus() === 200, 'Regular Dealer OTP verification returns HTTP 200');
    assert(Boolean(dealerVerifyCtx.getData()?.data?.accessToken), 'Regular Dealer receives JWT after OTP');
    assert(dealerVerifyCtx.getData()?.data?.user?.role === 'shop_admin', 'User has role shop_admin');

    // -------------------------------------------------------------
    // Test 3: Demo Admin Login (Direct Login, OTP BYPASS)
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Demo Admin Login (Direct Sign-In with OTP Bypass) ---');
    sentEmails.adminOtps = [];
    sentEmails.superAdminOtps = [];
    const demoLoginCtx = mockReqRes({ email: demoEmail, password: demoPassword });
    await AuthController.login(demoLoginCtx.req, demoLoginCtx.res);

    assert(demoLoginCtx.getStatus() === 200, 'Demo Admin login returns HTTP 200');
    assert(demoLoginCtx.getData()?.success === true, 'Demo Admin login success is true');
    assert(demoLoginCtx.getData()?.requiresOtp === false, 'Demo Admin requiresOtp is FALSE (OTP BYPASS)');
    assert(demoLoginCtx.getData()?.requiresOTP === false, 'Demo Admin requiresOTP is FALSE');
    assert(demoLoginCtx.getData()?.isDemo === true, 'Response contains isDemo: true flag');
    assert(Boolean(demoLoginCtx.getData()?.data?.accessToken), 'Demo Admin receives JWT accessToken immediately');
    assert(demoLoginCtx.getData()?.data?.user?.role === 'shop_admin', 'Demo Admin has role shop_admin');
    assert(demoLoginCtx.getData()?.data?.user?.isDemo === true, 'Demo Admin user profile has isDemo: true');
    assert(demoLoginCtx.getCookies().length >= 1, 'Demo Admin receives authentication session cookies');
    assert(sentEmails.adminOtps.length === 0, 'ZERO emails sent for Demo Admin login');

    const demoAccessToken = demoLoginCtx.getData()?.data?.accessToken;
    const demoUser = demoLoginCtx.getData()?.data?.user;

    // -------------------------------------------------------------
    // Test 4: Demo Admin Security Restrictions
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Demo Admin Security Restrictions ---');
    // Guardrail A: Demo Admin cannot access Super Admin dedicated login endpoint
    const saPortalCtx = mockReqRes({ email: demoEmail, password: demoPassword });
    await AuthController.superAdminLogin(saPortalCtx.req, saPortalCtx.res);
    assert(saPortalCtx.getStatus() === 403, 'Demo Admin blocked from superAdminLogin with 403 Forbidden');

    // Guardrail B: Demo Admin cannot access Super Admin authorized routes
    let superAdminRouteBlocked = false;
    const saMiddleware = authorizeRole('super_admin');
    const saReq: any = { user: { role: demoUser.role, isDemo: true, userId: demoUser._id } };
    const saRes: any = {
      status(code: number) {
        if (code === 403) superAdminRouteBlocked = true;
        return this;
      },
      json() { return this; },
    };
    saMiddleware(saReq, saRes, () => {});
    assert(superAdminRouteBlocked, 'Super Admin authorizeRole middleware blocks Demo Admin with 403');

    // Guardrail C: Demo Admin cannot change account password
    const changePassCtx = mockReqRes(
      { currentPassword: demoPassword, newPassword: 'HackedPassword999!' },
      {},
      {},
      { userId: demoUser._id, role: 'shop_admin', isDemo: true }
    );
    await ShopAdminController.changeAccountPassword(changePassCtx.req, changePassCtx.res);
    assert(changePassCtx.getStatus() === 403, 'Demo Admin password change rejected with 403 Forbidden');
    assert(changePassCtx.getData()?.message?.includes('Demo Mode'), 'Message specifies password changes disabled in demo mode');

    // Guardrail D: Demo Admin cannot change account email
    const changeEmailCtx = mockReqRes(
      { name: 'New Name', email: 'real_hacker@example.com' },
      {},
      {},
      { userId: demoUser._id, role: 'shop_admin', isDemo: true }
    );
    await ShopAdminController.updateAccountProfile(changeEmailCtx.req, changeEmailCtx.res);
    assert(changeEmailCtx.getStatus() === 403, 'Demo Admin email change rejected with 403 Forbidden');

    // -------------------------------------------------------------
    // Test 5: Tenant Isolation - Demo Admin Cannot Access Other Dealers' Data
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Tenant Isolation for Demo Admin ---');
    let realShopAccessBlocked = false;
    const tenantReq: any = {
      user: {
        userId: demoUser._id,
        role: 'shop_admin',
        isDemo: true,
        assignedShopIds: demoUser.assignedShopIds.map((id: any) => id.toString()),
      },
      params: { shopId: realShop._id.toString() },
      query: {},
      body: {},
    };
    const tenantRes: any = {
      status(code: number) {
        if (code === 403) realShopAccessBlocked = true;
        return this;
      },
      json() { return this; },
    };
    await requireShopAccess(tenantReq, tenantRes, () => {});
    assert(realShopAccessBlocked, 'Demo Admin attempting to access another shop is blocked with 403 Forbidden');

    // -------------------------------------------------------------
    // Test 6: Non-Demo Account Cannot Bypass OTP
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Non-Demo Account Cannot Bypass OTP ---');
    // Even if an impostor user in database has isDemo: true with arbitrary email
    const impostorUser = await User.create({
      name: 'Impostor Admin',
      email: 'impostor_admin@example.com',
      passwordHash: await bcrypt.hash('ImpostorPass123!', salt),
      role: 'shop_admin',
      assignedShopIds: [realShop._id],
      isActive: true,
      isVerified: true,
      isDemo: true, // Attempted trick
    });

    sentEmails.adminOtps = [];
    const impostorCtx = mockReqRes({ email: 'impostor_admin@example.com', password: 'ImpostorPass123!' });
    await AuthController.login(impostorCtx.req, impostorCtx.res);

    assert(impostorCtx.getStatus() === 200, 'Impostor login returns HTTP 200');
    assert(impostorCtx.getData()?.requiresOtp === true, 'Impostor is NOT bypassed; requiresOtp is TRUE');
    assert(!impostorCtx.getData()?.data?.accessToken, 'NO accessToken given to impostor in Step 1');
    assert(sentEmails.adminOtps.length === 1, 'OTP email dispatched for non-designated demo account');

    await User.deleteOne({ _id: impostorUser._id });

    // -------------------------------------------------------------
    // Test 7: Demo Shop Public Storefront Data Integrity
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Demo Shop Public Storefront Integrity ---');
    const demoShop = await Shop.findOne({ slug: config.demoAdmin.shopSlug });
    assert(Boolean(demoShop), 'Demo shop found by slug');
    assert(demoShop?.isDemo === true, 'Demo shop has isDemo: true flag');

    const demoCategoriesCount = await Category.countDocuments({ shopId: demoShop!._id });
    assert(demoCategoriesCount === 4, `Demo shop has 4 seeded categories (found: ${demoCategoriesCount})`);

    const demoProductsCount = await Product.countDocuments({ shopId: demoShop!._id });
    assert(demoProductsCount >= 15, `Demo shop has 15-20 seeded products (found: ${demoProductsCount})`);

    const demoOrdersCount = await Order.countDocuments({ shopId: demoShop!._id });
    assert(demoOrdersCount === 6, `Demo shop has 6 seeded orders (found: ${demoOrdersCount})`);

    // Test dashboard analytics computation for demo shop
    const dashboardCtx = mockReqRes({}, {}, {}, {
      userId: demoUser._id,
      role: 'shop_admin',
      assignedShopIds: [demoShop!._id.toString()],
      isDemo: true,
    });
    dashboardCtx.req.shopId = demoShop!._id.toString();
    await ShopAdminController.getDashboard(dashboardCtx.req, dashboardCtx.res);

    assert(dashboardCtx.getStatus() === 200, 'Demo dashboard query returns HTTP 200');
    assert(dashboardCtx.getData()?.success === true, 'Demo dashboard success is true');
    assert(dashboardCtx.getData()?.data?.metrics?.totalProducts === demoProductsCount, 'Dashboard displays correct total products');
    assert(dashboardCtx.getData()?.data?.metrics?.totalOrders === demoOrdersCount, 'Dashboard displays correct total orders');
    assert(dashboardCtx.getData()?.data?.metrics?.confirmedSales > 0, 'Dashboard computes non-zero confirmed sales');

    // -------------------------------------------------------------
    // Test 8: Customer Functionality Preserved
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Customer Functionality Preserved ---');
    const custCtx = mockReqRes({ email: 'test_customer_verified@example.com', password: testAdminPassword });
    await AuthController.login(custCtx.req, custCtx.res);
    assert(custCtx.getStatus() === 200, 'Customer login returns HTTP 200');
    assert(custCtx.getData()?.requiresOtp === false, 'Verified customer requiresOtp is false');
    assert(Boolean(custCtx.getData()?.data?.accessToken), 'Customer receives accessToken');

    // -------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------
    console.log('\n--- Cleaning up temporary test artifacts ---');
    await User.deleteMany({
      email: { $in: [testAdminEmail, 'test_customer_verified@example.com', 'test_customer_unverified@example.com'] },
    });
    await Shop.deleteOne({ slug: 'test-real-dealer-shop' });
    await OtpChallenge.deleteMany({
      email: { $in: [testAdminEmail, superAdminEmail, 'test_customer_verified@example.com', 'test_customer_unverified@example.com'] },
    });

    // Restore original email functions
    EmailService.sendSuperAdminOtp = origSendSuperAdminOtp;
    EmailService.sendAdminOtp = origSendAdminOtp;
    EmailService.sendVerificationOtp = origSendVerificationOtp;

    console.log(`\n===========================================================`);
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`===========================================================`);
  } catch (err: any) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
