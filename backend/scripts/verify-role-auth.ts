import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../src/config';
import { User } from '../src/models/User';
import { OtpChallenge } from '../src/models/OtpChallenge';
import { AuthService } from '../src/services/auth.service';
import { AuthController } from '../src/controllers/auth.controller';

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

  const testAdminEmail = 'test_dealer_admin@example.com';
  const testAdminUsername = 'DealerAdminTest';
  const testAdminPassword = 'DealerTestPassword123!';

  try {
    // -------------------------------------------------------------
    // Test 1: Setup test accounts
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Setting up test accounts ---');
    await User.deleteMany({
      email: { $in: [testAdminEmail, 'test_customer_verified@example.com', 'test_customer_unverified@example.com'] },
    });
    await OtpChallenge.deleteMany({
      email: { $in: [testAdminEmail, 'test_customer_verified@example.com', 'test_customer_unverified@example.com'] },
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

    assert(Boolean(shopAdmin && shopAdmin.role === 'shop_admin'), 'Created test shop_admin (Dealer) account');
    assert(Boolean(verifiedCustomer && verifiedCustomer.isVerified), 'Created verified customer account');
    assert(Boolean(unverifiedCustomer && !unverifiedCustomer.isVerified), 'Created unverified customer account');

    // -------------------------------------------------------------
    // Test 2: Regular Admin (Dealer) Login via Email
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Regular Admin (Dealer) Login via Email ---');
    const dealerEmailCtx = mockReqRes({ email: testAdminEmail, password: testAdminPassword });
    await AuthController.login(dealerEmailCtx.req, dealerEmailCtx.res);

    assert(dealerEmailCtx.getStatus() === 200, 'Dealer login returns HTTP 200');
    assert(dealerEmailCtx.getData()?.success === true, 'Dealer login response success is true');
    assert(dealerEmailCtx.getData()?.requiresOtp === false, 'Dealer login requiresOtp is FALSE (NO OTP prompt)');
    assert(dealerEmailCtx.getData()?.requiresOTP === false, 'Dealer login requiresOTP is FALSE');
    assert(Boolean(dealerEmailCtx.getData()?.data?.accessToken), 'Dealer receives JWT accessToken immediately');
    assert(dealerEmailCtx.getData()?.data?.user?.role === 'shop_admin', 'Dealer login returns user object with role shop_admin');

    const adminOtpChallenges = await OtpChallenge.countDocuments({ email: testAdminEmail });
    assert(adminOtpChallenges === 0, 'ZERO OTP challenges created for shop_admin login (no email sent)');

    // -------------------------------------------------------------
    // Test 3: Regular Admin (Dealer) Login via Username
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Regular Admin (Dealer) Login via Username ---');
    const dealerUserCtx = mockReqRes({ username: testAdminUsername, password: testAdminPassword });
    await AuthController.login(dealerUserCtx.req, dealerUserCtx.res);

    assert(dealerUserCtx.getStatus() === 200, 'Dealer login via username returns HTTP 200');
    assert(dealerUserCtx.getData()?.requiresOtp === false, 'Dealer login via username has requiresOtp === false');
    assert(dealerUserCtx.getData()?.data?.user?.email === testAdminEmail, 'Dealer login resolved correct email by username');
    assert(Boolean(dealerUserCtx.getData()?.data?.accessToken), 'Dealer receives JWT accessToken via username login');

    // -------------------------------------------------------------
    // Test 4: Security Guardrails for Regular Admin
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Security Guardrails for Regular Admin ---');
    // Guardrail A: Regular admin cannot access Super Admin dedicated endpoint
    const crossPortalCtx = mockReqRes({ email: testAdminEmail, password: testAdminPassword });
    await AuthController.superAdminLogin(crossPortalCtx.req, crossPortalCtx.res);
    assert(crossPortalCtx.getStatus() === 403, 'Regular admin calling superAdminLogin gets 403 Forbidden');

    // Guardrail B: Regular admin cannot obtain JWT by verifying an OTP challenge
    const fakeChallenge = await OtpChallenge.create({
      challengeId: 'fake-test-admin-challenge-id',
      userId: shopAdmin._id,
      email: testAdminEmail,
      otpHash: await bcrypt.hash('123456', 10),
      purpose: 'registration',
      expiresAt: new Date(Date.now() + 600000),
      attempts: 0,
      maxAttempts: 5,
      resendCount: 1,
      lastSentAt: new Date(),
      used: false,
    });

    const bypassCtx = mockReqRes({ challengeId: 'fake-test-admin-challenge-id', otp: '123456' });
    await AuthController.verifyOtp(bypassCtx.req, bypassCtx.res);
    assert(bypassCtx.getStatus() === 400, 'Regular admin cannot verify OTP challenge (400 rejected)');
    assert(
      bypassCtx.getData()?.message?.includes('Administrator accounts must log in with password credentials'),
      'OTP bypass attempt produces specific security denial message'
    );
    await OtpChallenge.deleteOne({ challengeId: 'fake-test-admin-challenge-id' });

    // Guardrail C: Wrong password fails with 401
    const wrongPassCtx = mockReqRes({ email: testAdminEmail, password: 'WrongPassword999!' });
    await AuthController.login(wrongPassCtx.req, wrongPassCtx.res);
    assert(wrongPassCtx.getStatus() === 401, 'Invalid password returns 401 Unauthorized');
    assert(wrongPassCtx.getData()?.success === false, 'Invalid password has success: false');

    // Guardrail D: Non-existent account fails with 401
    const nonExistentCtx = mockReqRes({ email: 'nonexistent_account@example.com', password: 'SomePassword123!' });
    await AuthController.login(nonExistentCtx.req, nonExistentCtx.res);
    assert(nonExistentCtx.getStatus() === 401, 'Non-existent user returns 401 Unauthorized without enumeration leak');

    // -------------------------------------------------------------
    // Test 5: Customer Login Behaviors
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Customer Login Behaviors ---');
    // Verified customer -> direct login without OTP
    const verifiedCustCtx = mockReqRes({ email: 'test_customer_verified@example.com', password: testAdminPassword });
    await AuthController.login(verifiedCustCtx.req, verifiedCustCtx.res);
    assert(verifiedCustCtx.getStatus() === 200, 'Verified customer login returns HTTP 200');
    assert(verifiedCustCtx.getData()?.requiresOtp === false, 'Verified customer login has requiresOtp: false');
    assert(Boolean(verifiedCustCtx.getData()?.data?.accessToken), 'Verified customer receives access token immediately');

    // Unverified customer -> registration OTP required
    const unverifiedCustCtx = mockReqRes({ email: 'test_customer_unverified@example.com', password: testAdminPassword });
    await AuthController.login(unverifiedCustCtx.req, unverifiedCustCtx.res);
    assert(unverifiedCustCtx.getStatus() === 200, 'Unverified customer login returns HTTP 200');
    assert(unverifiedCustCtx.getData()?.requiresOtp === true, 'Unverified customer login requires registration OTP');
    assert(Boolean(unverifiedCustCtx.getData()?.data?.challengeId), 'Unverified customer receives registration challengeId');

    // -------------------------------------------------------------
    // Test 6: Super Admin Login Behavior (Requires OTP)
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Super Admin Login Behavior (Password + Mandatory OTP) ---');
    const superAdmin = await User.findOne({ email: 'cpnihal35@gmail.com' });
    assert(Boolean(superAdmin), 'Super Admin user found in database');

    if (config.superAdmin.password) {
      const superAdminLoginCtx = mockReqRes({ email: 'cpnihal35@gmail.com', password: config.superAdmin.password });
      await AuthController.login(superAdminLoginCtx.req, superAdminLoginCtx.res);

      assert(superAdminLoginCtx.getStatus() === 200, 'Super Admin login returns HTTP 200');
      assert(superAdminLoginCtx.getData()?.success === true, 'Super Admin login response success is true');
      assert(superAdminLoginCtx.getData()?.requiresOtp === true, 'Super Admin requiresOtp is TRUE (OTP mandatory)');
      assert(superAdminLoginCtx.getData()?.requiresOTP === true, 'Super Admin requiresOTP is TRUE (backwards compatible)');
      assert(!superAdminLoginCtx.getData()?.data?.accessToken, 'NO accessToken issued in Step 1 for Super Admin');
      assert(superAdminLoginCtx.getCookies().length === 0, 'NO auth cookies set in Step 1 for Super Admin');

      const challengeId = superAdminLoginCtx.getData()?.data?.challengeId;
      assert(Boolean(challengeId), 'Super Admin receives valid challengeId');

      if (challengeId) {
        const challengeInDb = await OtpChallenge.findOne({ challengeId });
        assert(Boolean(challengeInDb), 'OtpChallenge record was created in database');
        assert(challengeInDb?.purpose === 'super_admin_2fa', 'OtpChallenge purpose is strictly super_admin_2fa');

        // Test Step 2: OTP Verification
        // Use known code to test verification
        const testOtp = '876543';
        const saltTest = await bcrypt.genSalt(10);
        challengeInDb!.otpHash = await bcrypt.hash(testOtp, saltTest);
        await challengeInDb!.save();

        const step2Ctx = mockReqRes({ challengeId, otp: testOtp });
        await AuthController.verifyOtp(step2Ctx.req, step2Ctx.res);

        assert(step2Ctx.getStatus() === 200, 'Super Admin Step 2 OTP verification returns HTTP 200');
        assert(step2Ctx.getData()?.success === true, 'Step 2 success is true');
        assert(Boolean(step2Ctx.getData()?.data?.accessToken), 'Step 2 issues JWT accessToken to Super Admin');
        assert(step2Ctx.getData()?.data?.user?.role === 'super_admin', 'Step 2 returns user profile with role super_admin');
        assert(step2Ctx.getCookies().length >= 1, 'Step 2 sets HTTP-only auth cookies');
      }
    } else {
      console.log('Skipping Super Admin password tests: SUPER_ADMIN_INITIAL_PASSWORD not configured.');
    }

    // -------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------
    await User.deleteMany({
      email: { $in: [testAdminEmail, 'test_customer_verified@example.com', 'test_customer_unverified@example.com'] },
    });
    await OtpChallenge.deleteMany({
      email: { $in: [testAdminEmail, 'test_customer_verified@example.com', 'test_customer_unverified@example.com'] },
    });

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

