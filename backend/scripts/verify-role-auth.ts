import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../src/config';
import { User } from '../src/models/User';
import { Shop } from '../src/models/Shop';
import { OtpChallenge } from '../src/models/OtpChallenge';
import { AuthService } from '../src/services/auth.service';
import { AuthController } from '../src/controllers/auth.controller';
import { ShopAdminController } from '../src/controllers/shopAdmin.controller';
import { EmailService, ResendSandboxRestrictionError } from '../src/services/email.service';

async function runTests() {
  console.log('===========================================================');
  console.log('🧪 ROLE-BASED LOGIN & OTP AUTHENTICATION TEST SUITE');
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

  function mockReqRes(body: any, ip: string = '127.0.0.1') {
    let statusCode = 200;
    let responseData: any = null;
    let cookiesSet: any[] = [];

    const req: any = {
      body,
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

  try {
    // -------------------------------------------------------------
    // Setup test accounts
    // -------------------------------------------------------------
    console.log('\n--- Setting up test accounts ---');
    await User.deleteMany({
      email: { $in: [testAdminEmail, 'test_customer_verified@example.com', 'test_customer_unverified@example.com'] },
    });
    await OtpChallenge.deleteMany({
      email: { $in: [testAdminEmail, superAdminEmail, 'test_customer_verified@example.com', 'test_customer_unverified@example.com'] },
    });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(testAdminPassword, salt);

    const shopAdmin = await User.create({
      name: testAdminUsername,
      email: testAdminEmail,
      phone: '1234567890',
      passwordHash,
      role: 'shop_admin',
      assignedShopIds: [],
      isActive: true,
      isVerified: true,
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

    assert(Boolean(shopAdmin && shopAdmin.role === 'shop_admin'), 'Test shop_admin (Dealer) account ready');
    assert(Boolean(superAdmin && superAdmin.role === 'super_admin'), 'Super Admin account ready');
    assert(Boolean(verifiedCustomer && verifiedCustomer.isVerified), 'Verified customer account ready');
    assert(Boolean(unverifiedCustomer && !unverifiedCustomer.isVerified), 'Unverified customer account ready');

    // -------------------------------------------------------------
    // Test 1: Super Admin Login (Credentials -> OTP Email -> Verification -> Super Admin Dashboard)
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Super Admin Login with Mandatory OTP ---');
    sentEmails.superAdminOtps = [];
    const saCtx = mockReqRes({ email: superAdminEmail, password: superAdminPassword });
    await AuthController.login(saCtx.req, saCtx.res);

    assert(saCtx.getStatus() === 200, 'Super Admin login returns HTTP 200');
    assert(saCtx.getData()?.requiresOtp === true, 'Super Admin login requiresOtp is TRUE');
    assert(saCtx.getData()?.requiresOTP === true, 'Super Admin login requiresOTP is TRUE');
    assert(!saCtx.getData()?.data?.accessToken, 'NO accessToken issued in Step 1 for Super Admin');
    assert(saCtx.getCookies().length === 0, 'NO auth cookies issued in Step 1 for Super Admin');
    assert(Boolean(saCtx.getData()?.data?.challengeId), 'Super Admin receives challengeId');
    assert(Boolean(saCtx.getData()?.data?.maskedEmail), 'Super Admin receives maskedEmail');
    assert(saCtx.getData()?.data?.expiresInSeconds === 300, 'Super Admin OTP expiration is 300 seconds (5 min)');
    assert(sentEmails.superAdminOtps.length === 1, 'EmailService.sendSuperAdminOtp was invoked');
    assert(sentEmails.superAdminOtps[0].to === superAdminEmail, 'OTP was sent to Super Admin email');

    const saChallengeId = saCtx.getData()?.data?.challengeId;
    const saOtp = sentEmails.superAdminOtps[0].otp;

    // Verify Super Admin OTP
    const saVerifyCtx = mockReqRes({ challengeId: saChallengeId, otp: saOtp });
    await AuthController.verifyOtp(saVerifyCtx.req, saVerifyCtx.res);
    assert(saVerifyCtx.getStatus() === 200, 'Super Admin OTP verification returns HTTP 200');
    assert(Boolean(saVerifyCtx.getData()?.data?.accessToken), 'Super Admin receives JWT accessToken after OTP');
    assert(saVerifyCtx.getData()?.data?.user?.role === 'super_admin', 'Super Admin role verified for dashboard access');
    assert(saVerifyCtx.getCookies().length >= 1, 'Super Admin receives HTTP-only cookies');

    // -------------------------------------------------------------
    // Test 2: Admin (Dealer) Login via Email (Credentials -> OTP Email -> Verification -> Dealer Dashboard)
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Admin (Dealer) Login via Email with Mandatory OTP ---');
    sentEmails.adminOtps = [];
    const dealerEmailCtx = mockReqRes({ email: testAdminEmail, password: testAdminPassword });
    await AuthController.login(dealerEmailCtx.req, dealerEmailCtx.res);

    assert(dealerEmailCtx.getStatus() === 200, 'Dealer email login returns HTTP 200');
    assert(dealerEmailCtx.getData()?.requiresOtp === true, 'Dealer email login requiresOtp is TRUE');
    assert(dealerEmailCtx.getData()?.requiresOTP === true, 'Dealer email login requiresOTP is TRUE');
    assert(!dealerEmailCtx.getData()?.data?.accessToken, 'NO accessToken issued in Step 1 for Dealer');
    assert(dealerEmailCtx.getCookies().length === 0, 'NO auth cookies issued in Step 1 for Dealer');
    assert(Boolean(dealerEmailCtx.getData()?.data?.challengeId), 'Dealer receives challengeId');
    assert(Boolean(dealerEmailCtx.getData()?.data?.maskedEmail), 'Dealer receives maskedEmail');
    assert(dealerEmailCtx.getData()?.data?.expiresInSeconds === 300, 'Dealer OTP expiration is 300 seconds (5 min)');
    assert(sentEmails.adminOtps.length === 1, 'EmailService.sendAdminOtp was invoked for dealer');
    assert(sentEmails.adminOtps[0].to === testAdminEmail, 'OTP was sent to Dealer email address');

    const dealerChallengeId = dealerEmailCtx.getData()?.data?.challengeId;
    const dealerOtp = sentEmails.adminOtps[0].otp;

    // Verify Dealer OTP
    const dealerVerifyCtx = mockReqRes({ challengeId: dealerChallengeId, otp: dealerOtp });
    await AuthController.verifyOtp(dealerVerifyCtx.req, dealerVerifyCtx.res);
    assert(dealerVerifyCtx.getStatus() === 200, 'Dealer OTP verification returns HTTP 200');
    assert(Boolean(dealerVerifyCtx.getData()?.data?.accessToken), 'Dealer receives JWT accessToken after OTP');
    assert(dealerVerifyCtx.getData()?.data?.user?.role === 'shop_admin', 'Dealer role verified for /admin/dashboard access');
    assert(dealerVerifyCtx.getCookies().length >= 1, 'Dealer receives HTTP-only cookies');

    // -------------------------------------------------------------
    // Test 3: Admin (Dealer) Login via Username
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Admin (Dealer) Login via Username with Mandatory OTP ---');
    sentEmails.adminOtps = [];
    const dealerUserCtx = mockReqRes({ username: testAdminUsername, password: testAdminPassword });
    await AuthController.login(dealerUserCtx.req, dealerUserCtx.res);

    assert(dealerUserCtx.getStatus() === 200, 'Dealer username login returns HTTP 200');
    assert(dealerUserCtx.getData()?.requiresOtp === true, 'Dealer username login requiresOtp is TRUE');
    assert(Boolean(dealerUserCtx.getData()?.data?.challengeId), 'Dealer receives challengeId via username login');
    assert(sentEmails.adminOtps.length === 1, 'EmailService.sendAdminOtp sent code to registered email');
    assert(sentEmails.adminOtps[0].to === testAdminEmail, 'Username resolved to correct Dealer email');

    // Verify OTP from username login
    const userOtp = sentEmails.adminOtps[0].otp;
    const userVerifyCtx = mockReqRes({ challengeId: dealerUserCtx.getData()?.data?.challengeId, otp: userOtp });
    await AuthController.verifyOtp(userVerifyCtx.req, userVerifyCtx.res);
    assert(userVerifyCtx.getStatus() === 200, 'Dealer OTP verified successfully from username login');
    assert(userVerifyCtx.getData()?.data?.user?.role === 'shop_admin', 'User has role shop_admin');

    // -------------------------------------------------------------
    // Test 4: Incorrect OTP Rejection & Remaining Attempts
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Incorrect OTP Rejection & Remaining Attempts ---');
    sentEmails.adminOtps = [];
    const wrongOtpLoginCtx = mockReqRes({ email: testAdminEmail, password: testAdminPassword });
    await AuthController.login(wrongOtpLoginCtx.req, wrongOtpLoginCtx.res);
    const wrongChallengeId = wrongOtpLoginCtx.getData()?.data?.challengeId;

    const wrongOtpCtx = mockReqRes({ challengeId: wrongChallengeId, otp: '000000' });
    await AuthController.verifyOtp(wrongOtpCtx.req, wrongOtpCtx.res);
    assert(wrongOtpCtx.getStatus() === 400, 'Incorrect OTP returns HTTP 400');
    assert(wrongOtpCtx.getData()?.message?.includes('attempt'), 'Error message states remaining attempts');

    const challengeAfterFailed = await OtpChallenge.findOne({ challengeId: wrongChallengeId });
    assert(challengeAfterFailed?.attempts === 1, 'Challenge attempts counter incremented to 1');

    // -------------------------------------------------------------
    // Test 5: Expired OTP Rejection
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Expired OTP Rejection ---');
    // Set challenge to expired
    await OtpChallenge.updateOne(
      { challengeId: wrongChallengeId },
      { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );
    const correctOtp = sentEmails.adminOtps[0].otp;
    const expiredCtx = mockReqRes({ challengeId: wrongChallengeId, otp: correctOtp });
    await AuthController.verifyOtp(expiredCtx.req, expiredCtx.res);
    assert(expiredCtx.getStatus() === 400, 'Expired OTP returns HTTP 400');
    assert(expiredCtx.getData()?.message?.includes('expired'), 'Error message indicates code has expired');

    // -------------------------------------------------------------
    // Test 6: Resend OTP with 60-Second Cooldown
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Resend OTP with 60-Second Cooldown ---');
    sentEmails.adminOtps = [];
    const resendLoginCtx = mockReqRes({ email: testAdminEmail, password: testAdminPassword });
    await AuthController.login(resendLoginCtx.req, resendLoginCtx.res);
    const freshChallengeId = resendLoginCtx.getData()?.data?.challengeId;

    // Immediate resend should be blocked by 60s cooldown
    const earlyResendCtx = mockReqRes({ challengeId: freshChallengeId });
    await AuthController.resendOtp(earlyResendCtx.req, earlyResendCtx.res);
    assert(earlyResendCtx.getStatus() === 429, 'Immediate resend rejected with HTTP 429 Too Many Requests');
    assert(earlyResendCtx.getData()?.message?.includes('wait'), 'Cooldown message informs user to wait');

    // Simulate 61 seconds elapsed
    await OtpChallenge.updateOne(
      { challengeId: freshChallengeId },
      { $set: { lastSentAt: new Date(Date.now() - 65 * 1000) } }
    );

    // Resend after cooldown
    sentEmails.adminOtps = [];
    const validResendCtx = mockReqRes({ challengeId: freshChallengeId });
    await AuthController.resendOtp(validResendCtx.req, validResendCtx.res);
    assert(validResendCtx.getStatus() === 200, 'Resend after cooldown returns HTTP 200');
    assert(sentEmails.adminOtps.length === 1, 'Fresh OTP dispatched via EmailService.sendAdminOtp');
    assert(validResendCtx.getData()?.data?.expiresInSeconds === 300, 'Resent OTP has 300 seconds expiration');

    // -------------------------------------------------------------
    // Test 7: Previously Used OTP Rejection (Cannot be reused)
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Previously Used OTP Cannot Be Reused ---');
    const freshOtp = sentEmails.adminOtps[0].otp;
    const firstUseCtx = mockReqRes({ challengeId: freshChallengeId, otp: freshOtp });
    await AuthController.verifyOtp(firstUseCtx.req, firstUseCtx.res);
    assert(firstUseCtx.getStatus() === 200, 'First OTP verification succeeds with HTTP 200');

    // Second use of same OTP and challengeId
    const reuseCtx = mockReqRes({ challengeId: freshChallengeId, otp: freshOtp });
    await AuthController.verifyOtp(reuseCtx.req, reuseCtx.res);
    assert(reuseCtx.getStatus() === 400, 'Reusing previously verified OTP is rejected with HTTP 400');
    assert(reuseCtx.getData()?.message?.includes('expired') || reuseCtx.getData()?.message?.includes('Invalid'), 'Error indicates invalid/expired session');

    // -------------------------------------------------------------
    // Test 8: Direct Dashboard Access Without OTP Is Blocked
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Direct Access Blocked Without OTP Verification ---');
    const dealerStep1 = mockReqRes({ email: testAdminEmail, password: testAdminPassword });
    await AuthController.login(dealerStep1.req, dealerStep1.res);
    assert(!dealerStep1.getData()?.data?.accessToken, 'Step 1 response has no accessToken');
    assert(dealerStep1.getCookies().length === 0, 'Step 1 response has no cookies');

    const saStep1 = mockReqRes({ email: superAdminEmail, password: superAdminPassword });
    await AuthController.login(saStep1.req, saStep1.res);
    assert(!saStep1.getData()?.data?.accessToken, 'Super Admin Step 1 response has no accessToken');
    assert(saStep1.getCookies().length === 0, 'Super Admin Step 1 response has no cookies');

    // Cross-role verification block: customer challenge cannot be verified by shop_admin
    const crossChallenge = await OtpChallenge.create({
      challengeId: 'cross-role-test-challenge',
      userId: shopAdmin._id,
      email: testAdminEmail,
      otpHash: await bcrypt.hash('654321', salt),
      purpose: 'registration',
      expiresAt: new Date(Date.now() + 300000),
      attempts: 0,
      maxAttempts: 5,
      resendCount: 1,
      lastSentAt: new Date(),
      used: false,
    });
    const crossVerifyCtx = mockReqRes({ challengeId: 'cross-role-test-challenge', otp: '654321' });
    await AuthController.verifyOtp(crossVerifyCtx.req, crossVerifyCtx.res);
    assert(crossVerifyCtx.getStatus() === 400, 'Shop admin cannot verify customer registration challenge');
    await OtpChallenge.deleteOne({ challengeId: 'cross-role-test-challenge' });

    // -------------------------------------------------------------
    // Test 9: Incorrect Password -> OTP Is NOT Generated
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Incorrect Password Does Not Generate OTP ---');
    sentEmails.adminOtps = [];
    const wrongPassCtx = mockReqRes({ email: testAdminEmail, password: 'WrongPassword999!' });
    await AuthController.login(wrongPassCtx.req, wrongPassCtx.res);

    assert(wrongPassCtx.getStatus() === 401, 'Invalid password returns HTTP 401 Unauthorized');
    assert(wrongPassCtx.getData()?.success === false, 'Response success is false');
    assert(sentEmails.adminOtps.length === 0, 'NO OTP email was dispatched for bad password');

    // -------------------------------------------------------------
    // Test 10: Customer Storefront Functionality Unchanged
    // -------------------------------------------------------------
    console.log('\n--- Test 10: Customer Storefront Functionality Unchanged ---');
    // 10A: Verified Customer logs in directly without OTP
    sentEmails.customerOtps = [];
    const verifiedCustCtx = mockReqRes({ email: 'test_customer_verified@example.com', password: testAdminPassword });
    await AuthController.login(verifiedCustCtx.req, verifiedCustCtx.res);

    assert(verifiedCustCtx.getStatus() === 200, 'Verified customer login returns HTTP 200');
    assert(verifiedCustCtx.getData()?.requiresOtp === false, 'Verified customer requiresOtp is FALSE');
    assert(Boolean(verifiedCustCtx.getData()?.data?.accessToken), 'Verified customer receives accessToken immediately');
    assert(verifiedCustCtx.getData()?.data?.user?.role === 'customer', 'User role is customer');
    assert(sentEmails.customerOtps.length === 0, 'No OTP email sent to verified customer');

    // 10B: Unverified Customer receives registration verification OTP
    sentEmails.customerOtps = [];
    const unverifiedCustCtx = mockReqRes({ email: 'test_customer_unverified@example.com', password: testAdminPassword });
    await AuthController.login(unverifiedCustCtx.req, unverifiedCustCtx.res);

    assert(unverifiedCustCtx.getStatus() === 200, 'Unverified customer login returns HTTP 200');
    assert(unverifiedCustCtx.getData()?.requiresOtp === true, 'Unverified customer requiresOtp is TRUE');
    assert(Boolean(unverifiedCustCtx.getData()?.data?.challengeId), 'Unverified customer receives registration challengeId');
    assert(sentEmails.customerOtps.length === 1, 'EmailService.sendVerificationOtp sent to unverified customer');

    // -------------------------------------------------------------
    // Test 11: Dedicated Demo Session Endpoint (Explore Demo)
    // -------------------------------------------------------------
    console.log('\n--- Test 11: Dedicated Demo Session Endpoint (Explore Demo) ---');
    sentEmails.adminOtps = [];
    const demoSessionCtx = mockReqRes({});
    await AuthController.demoSession(demoSessionCtx.req, demoSessionCtx.res);

    assert(demoSessionCtx.getStatus() === 200, 'Demo session endpoint returns HTTP 200');
    assert(demoSessionCtx.getData()?.success === true, 'Demo session success is true');
    assert(Boolean(demoSessionCtx.getData()?.data?.accessToken), 'Demo session returns valid accessToken');
    assert(demoSessionCtx.getData()?.data?.user?.email === 'demo@gmail.com', 'Demo user email is demo@gmail.com');
    assert(demoSessionCtx.getData()?.data?.user?.isDemo === true, 'Demo user has isDemo === true');
    assert(demoSessionCtx.getData()?.data?.user?.role === 'shop_admin', 'Demo user role is shop_admin');
    assert(sentEmails.adminOtps.length === 0, 'No OTP email was dispatched for Explore Demo');
    assert(demoSessionCtx.getCookies().some(c => c.name === 'access_token'), 'Session cookie access_token was set');

    // -------------------------------------------------------------
    // Test 12: Direct Credential Login for Demo Admin
    // -------------------------------------------------------------
    console.log('\n--- Test 12: Direct Credential Login for Demo Admin ---');
    sentEmails.adminOtps = [];
    const demoCredLoginCtx = mockReqRes({ email: 'demo@gmail.com', password: '123456789' });
    await AuthController.login(demoCredLoginCtx.req, demoCredLoginCtx.res);

    assert(demoCredLoginCtx.getStatus() === 200, 'Demo credential login returns HTTP 200');
    assert(demoCredLoginCtx.getData()?.requiresOtp === false, 'Demo credential login requiresOtp is FALSE (OTP bypassed)');
    assert(Boolean(demoCredLoginCtx.getData()?.data?.accessToken), 'Demo credential login returns accessToken immediately');
    assert(demoCredLoginCtx.getData()?.data?.user?.isDemo === true, 'Demo credential user has isDemo === true');
    assert(sentEmails.adminOtps.length === 0, 'No OTP email was dispatched for demo credential login');

    // -------------------------------------------------------------
    // Test 13: Demo Security Isolation (Password & Email Lock)
    // -------------------------------------------------------------
    console.log('\n--- Test 13: Demo Security Isolation (Password & Email Lock) ---');
    const demoUser = await User.findOne({ email: 'demo@gmail.com' });
    assert(Boolean(demoUser && demoUser.isDemo), 'Server-verified demo user exists in database');

    const demoReq: any = {
      user: {
        userId: demoUser!._id.toString(),
        role: demoUser!.role,
        isDemo: true,
        assignedShopIds: demoUser!.assignedShopIds,
      },
      body: {
        currentPassword: '123456789',
        newPassword: 'HackedPassword999!',
        confirmPassword: 'HackedPassword999!',
      },
    };
    let passChangeStatus = 200;
    let passChangeData: any = null;
    const demoRes: any = {
      status(code: number) {
        passChangeStatus = code;
        return this;
      },
      json(data: any) {
        passChangeData = data;
        return this;
      },
    };
    await ShopAdminController.changeAccountPassword(demoReq, demoRes);
    assert(passChangeStatus === 403, 'Demo Admin password modification returns HTTP 403 Forbidden');
    assert(passChangeData?.message?.includes('Password modification is disabled in Demo Mode'), 'Descriptive forbidden message returned for password change');

    // Test email change restriction
    let emailChangeStatus = 200;
    let emailChangeData: any = null;
    const demoEmailRes: any = {
      status(code: number) {
        emailChangeStatus = code;
        return this;
      },
      json(data: any) {
        emailChangeData = data;
        return this;
      },
    };
    const demoEmailReq: any = {
      user: {
        userId: demoUser!._id.toString(),
        role: demoUser!.role,
        isDemo: true,
        assignedShopIds: demoUser!.assignedShopIds,
      },
      body: {
        name: 'Demo Admin Changed',
        email: 'attacker@evil.com',
      },
    };
    await ShopAdminController.updateAccountProfile(demoEmailReq, demoEmailRes);
    assert(emailChangeStatus === 403, 'Demo Admin email alteration returns HTTP 403 Forbidden');

    // -------------------------------------------------------------
    // Test 14: Demo Shop Existence, Products, and Metrics
    // -------------------------------------------------------------
    console.log('\n--- Test 14: Demo Shop Existence, Products, and Metrics ---');
    const demoShop = await Shop.findOne({ slug: 'cataloza-demo-store' });
    assert(Boolean(demoShop), 'Demo shop "cataloza-demo-store" exists in database');
    assert(demoShop?.isDemo === true, 'Demo shop has isDemo === true');
    assert(demoShop?.name === 'Cataloza Demo Store', 'Demo shop name is Cataloza Demo Store');

    // -------------------------------------------------------------
    // Test 15: Email Delivery Failure (Network / Outage) -> Unverified Login
    // -------------------------------------------------------------
    console.log('\n--- Test 15: Email Delivery Failure -> Login Remains Unverified ---');
    await OtpChallenge.deleteMany({ userId: shopAdmin._id });
    // Temporarily mock sendAdminOtp to simulate email service failure
    EmailService.sendAdminOtp = async () => {
      throw new Error('Outbound email network socket timeout');
    };

    const deliveryFailCtx = mockReqRes({ email: testAdminEmail, password: testAdminPassword });
    await AuthController.login(deliveryFailCtx.req, deliveryFailCtx.res);

    assert(deliveryFailCtx.getStatus() === 502, 'Email delivery failure returns HTTP 502 Bad Gateway');
    assert(deliveryFailCtx.getData()?.success === false, 'Response success is false on email failure');
    assert(deliveryFailCtx.getData()?.error === 'EMAIL_DELIVERY_FAILED', 'Error code is EMAIL_DELIVERY_FAILED');
    assert(deliveryFailCtx.getData()?.message?.includes('socket timeout'), 'Error message contains root failure detail');
    assert(!deliveryFailCtx.getData()?.data?.accessToken, 'No accessToken issued when email delivery fails');
    assert(deliveryFailCtx.getCookies().length === 0, 'No auth cookies set when email delivery fails');

    // -------------------------------------------------------------
    // Test 16: Resend Sandbox Testing Restriction Detection & Actionable Guidance
    // -------------------------------------------------------------
    console.log('\n--- Test 16: Resend Sandbox Testing Restriction Detection ---');
    await OtpChallenge.deleteMany({ userId: shopAdmin._id });
    // Mock sendAdminOtp to simulate Resend sandbox rejection for external recipient
    EmailService.sendAdminOtp = async (to: string) => {
      throw new ResendSandboxRestrictionError(to, 'cpnihal35@gmail.com');
    };

    const sandboxFailCtx = mockReqRes({ email: testAdminEmail, password: testAdminPassword });
    await AuthController.login(sandboxFailCtx.req, sandboxFailCtx.res);

    assert(sandboxFailCtx.getStatus() === 502, 'Sandbox restriction returns HTTP 502 Bad Gateway');
    assert(sandboxFailCtx.getData()?.error === 'RESEND_SANDBOX_RESTRICTION', 'Error code is RESEND_SANDBOX_RESTRICTION');
    assert(sandboxFailCtx.getData()?.message?.includes('Resend sandbox testing restriction'), 'Descriptive sandbox error message returned');
    assert(sandboxFailCtx.getData()?.message?.includes('cpnihal35@gmail.com'), 'Mentions verified account email cpnihal35@gmail.com');
    assert(sandboxFailCtx.getData()?.details?.actionRequired?.includes('resend.com/domains'), 'Includes domain verification instructions');
    assert(!sandboxFailCtx.getData()?.data?.accessToken, 'Access token is NOT issued on sandbox rejection');

    // Restore stub
    EmailService.sendAdminOtp = async (to: string, name: string, otp: string) => {
      sentEmails.adminOtps.push({ to, name, otp });
      return { id: `mock-admin-msg-${Date.now()}` };
    };

    // -------------------------------------------------------------
    // Test 17: Multiple Dealer Admin Accounts with Different Email Addresses
    // -------------------------------------------------------------
    console.log('\n--- Test 17: Multiple Dealer Admin Accounts with Different Email Addresses ---');
    const dealerOneEmail = 'dealer_north@example.com';
    const dealerTwoEmail = 'dealer_south@example.com';
    const dealerPassword = 'DealerSecurePass2026!';
    const dealerHash = await bcrypt.hash(dealerPassword, salt);

    await User.deleteMany({ email: { $in: [dealerOneEmail, dealerTwoEmail] } });
    await OtpChallenge.deleteMany({ email: { $in: [dealerOneEmail, dealerTwoEmail] } });

    const dealerOne = await User.create({
      name: 'North Dealer Admin',
      email: dealerOneEmail,
      phone: '9876543210',
      passwordHash: dealerHash,
      role: 'shop_admin',
      assignedShopIds: [],
      isActive: true,
      isVerified: true,
    });

    const dealerTwo = await User.create({
      name: 'South Dealer Admin',
      email: dealerTwoEmail,
      phone: '9876543211',
      passwordHash: dealerHash,
      role: 'shop_admin',
      assignedShopIds: [],
      isActive: true,
      isVerified: true,
    });

    // 17A: Dealer 1 initiates login
    sentEmails.adminOtps = [];
    const dealerOneLoginCtx = mockReqRes({ email: dealerOneEmail, password: dealerPassword });
    await AuthController.login(dealerOneLoginCtx.req, dealerOneLoginCtx.res);

    assert(dealerOneLoginCtx.getStatus() === 200, 'Dealer 1 login request succeeds');
    assert(dealerOneLoginCtx.getData()?.requiresOtp === true, 'Dealer 1 requires OTP verification');
    const dealerOneChallengeId = dealerOneLoginCtx.getData()?.data?.challengeId;
    assert(Boolean(dealerOneChallengeId), 'Dealer 1 receives challengeId');
    assert(sentEmails.adminOtps.some(e => e.to === dealerOneEmail), 'OTP was dispatched to Dealer 1 email address');
    const dealerOneCode = sentEmails.adminOtps.find(e => e.to === dealerOneEmail)?.otp;

    // 17B: Dealer 2 initiates login
    const dealerTwoLoginCtx = mockReqRes({ email: dealerTwoEmail, password: dealerPassword });
    await AuthController.login(dealerTwoLoginCtx.req, dealerTwoLoginCtx.res);

    assert(dealerTwoLoginCtx.getStatus() === 200, 'Dealer 2 login request succeeds');
    assert(dealerTwoLoginCtx.getData()?.requiresOtp === true, 'Dealer 2 requires OTP verification');
    const dealerTwoChallengeId = dealerTwoLoginCtx.getData()?.data?.challengeId;
    assert(Boolean(dealerTwoChallengeId), 'Dealer 2 receives challengeId');
    assert(sentEmails.adminOtps.some(e => e.to === dealerTwoEmail), 'OTP was dispatched to Dealer 2 email address');
    const dealerTwoCode = sentEmails.adminOtps.find(e => e.to === dealerTwoEmail)?.otp;

    assert(dealerOneChallengeId !== dealerTwoChallengeId, 'Dealer 1 and Dealer 2 have separate distinct challenge IDs');

    // 17C: Cross-verification rejection (Dealer 1 cannot use Dealer 2 code on Dealer 1 challenge)
    const crossVerifyCtx2 = mockReqRes({ challengeId: dealerOneChallengeId, otp: dealerTwoCode });
    await AuthController.verifyOtp(crossVerifyCtx2.req, crossVerifyCtx2.res);
    assert(crossVerifyCtx2.getStatus() === 400, 'Cross-verifying Dealer 2 OTP on Dealer 1 challenge is rejected');

    // 17D: Verify Dealer 1 successfully
    const dealerOneVerifyCtx = mockReqRes({ challengeId: dealerOneChallengeId, otp: dealerOneCode });
    await AuthController.verifyOtp(dealerOneVerifyCtx.req, dealerOneVerifyCtx.res);
    assert(dealerOneVerifyCtx.getStatus() === 200, 'Dealer 1 OTP verification succeeds');
    assert(dealerOneVerifyCtx.getData()?.data?.user?.email === dealerOneEmail, 'Dealer 1 session resolves to dealer 1 email');
    assert(dealerOneVerifyCtx.getData()?.data?.user?.role === 'shop_admin', 'Dealer 1 role is shop_admin');

    // 17E: Verify Dealer 2 successfully
    const dealerTwoVerifyCtx = mockReqRes({ challengeId: dealerTwoChallengeId, otp: dealerTwoCode });
    await AuthController.verifyOtp(dealerTwoVerifyCtx.req, dealerTwoVerifyCtx.res);
    assert(dealerTwoVerifyCtx.getStatus() === 200, 'Dealer 2 OTP verification succeeds');
    assert(dealerTwoVerifyCtx.getData()?.data?.user?.email === dealerTwoEmail, 'Dealer 2 session resolves to dealer 2 email');
    assert(dealerTwoVerifyCtx.getData()?.data?.user?.role === 'shop_admin', 'Dealer 2 role is shop_admin');

    // Cleanup extra dealer accounts
    await User.deleteMany({ email: { $in: [dealerOneEmail, dealerTwoEmail] } });
    await OtpChallenge.deleteMany({ email: { $in: [dealerOneEmail, dealerTwoEmail] } });

    // -------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------
    console.log('\n--- Cleaning up test artifacts ---');
    await User.deleteMany({
      email: { $in: [testAdminEmail, 'test_customer_verified@example.com', 'test_customer_unverified@example.com'] },
    });
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
