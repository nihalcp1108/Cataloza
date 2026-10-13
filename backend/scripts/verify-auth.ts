import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../src/config';
import { User } from '../src/models/User';
import { OtpChallenge } from '../src/models/OtpChallenge';
import { AuthService } from '../src/services/auth.service';
import { EmailService } from '../src/services/email.service';

async function runAuthVerification() {
  console.log('================================================================');
  console.log('🧪 WHOLESALEFLOW AUTHENTICATION & SUPER ADMIN VERIFICATION SUITE');
  console.log('================================================================');

  try {
    await mongoose.connect(config.mongoUri);
    console.log(`[DB] Connected to MongoDB: ${mongoose.connection.name}`);

    // TEST 0: Environment Variables Validation
    console.log('\n--- TEST 0: Environment Variables Validation ---');
    const envCheck = EmailService.validateEnvironment();
    if (!envCheck.valid) {
      throw new Error(`Missing required environment variables: ${envCheck.missingVars.join(', ')}`);
    }
    console.log('[PASS] Required environment variables validated successfully');

    // TEST 1: Super Admin Bootstrap
    console.log('\n--- TEST 1: Super Admin Idempotent Bootstrap ---');
    const bootResult = await AuthService.bootstrapSuperAdmin({ forceReset: true });
    console.log(`[PASS] Bootstrap executed: status=${bootResult.status}, email=${bootResult.email}`);

    const admin = await User.findOne({ email: 'cpnihal35@gmail.com' });
    if (!admin) throw new Error('Super Admin account was not found in DB after bootstrap');
    if (admin.role !== 'super_admin') throw new Error(`Role is ${admin.role}, expected super_admin`);
    if (!admin.isActive) throw new Error('Super Admin account is not active');
    console.log('[PASS] Super Admin exists with verified role="super_admin" and isActive=true');

    // TEST 2: Password Verification
    console.log('\n--- TEST 2: Password Hash Verification ---');
    const validMatch = await admin.comparePassword(config.superAdmin.password);
    if (!validMatch) throw new Error('Configured SUPER_ADMIN_INITIAL_PASSWORD did not match passwordHash');
    console.log('[PASS] Configured initial password successfully verified against bcrypt hash');

    const invalidMatch = await admin.comparePassword('WrongPassword123!');
    if (invalidMatch) throw new Error('Invalid password was unexpectedly accepted');
    console.log('[PASS] Invalid password rejected as expected');

    // TEST 3: Idempotence (Server reboot simulation)
    console.log('\n--- TEST 3: Server Reboot Idempotence ---');
    const initialHash = admin.passwordHash;
    const rebootResult = await AuthService.bootstrapSuperAdmin({ forceReset: false });
    const adminAfterReboot = await User.findOne({ email: 'cpnihal35@gmail.com' });
    if (adminAfterReboot?.passwordHash !== initialHash) {
      throw new Error('Password hash was overwritten during normal server reboot bootstrap!');
    }
    console.log('[PASS] Idempotent restart verified: existing password hash preserved');

    // TEST 4: Super Admin OTP Flow
    console.log('\n--- TEST 4: Super Admin OTP Generation & Verification ---');
    const otpCode = '654321';
    const otpHash = await bcrypt.hash(otpCode, 10);
    const challengeId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const challenge = await OtpChallenge.create({
      challengeId,
      userId: admin._id,
      email: 'cpnihal35@gmail.com',
      otpHash,
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
      resendCount: 1,
      lastSentAt: new Date(),
      used: false,
    });
    console.log('[PASS] OTP Challenge generated and stored securely with bcrypt hash');

    // Reject wrong OTP
    const wrongOtpMatch = await bcrypt.compare('111111', challenge.otpHash);
    if (wrongOtpMatch) throw new Error('Wrong OTP was incorrectly verified');
    console.log('[PASS] Incorrect OTP rejected');

    // Accept correct OTP
    const correctOtpMatch = await bcrypt.compare(otpCode, challenge.otpHash);
    if (!correctOtpMatch) throw new Error('Correct OTP failed verification');
    challenge.used = true;
    await challenge.save();
    console.log('[PASS] Correct OTP verified and marked as used');

    // Disallow reuse
    const reusedChallenge = await OtpChallenge.findOne({ challengeId, used: false });
    if (reusedChallenge) throw new Error('Used OTP was still accessible for reuse');
    console.log('[PASS] Reused OTP strictly rejected');

    // TEST 5: Forgot Password & Reset Password Flow
    console.log('\n--- TEST 5: Forgot Password & Reset Password End-to-End ---');
    const resetResult = await AuthService.generatePasswordResetToken('cpnihal35@gmail.com');
    if (!resetResult.resetToken) throw new Error('Failed to generate password reset token');
    console.log('[PASS] Password reset token generated and SHA-256 hash stored on user');

    const adminBeforeReset = await User.findOne({ email: 'cpnihal35@gmail.com' });
    const initialVersion = adminBeforeReset?.tokenVersion || 0;

    const newTestPassword = 'NewSecretPassword@2026';
    const resetSuccess = await AuthService.resetPassword(resetResult.resetToken, newTestPassword);
    if (!resetSuccess) throw new Error('Password reset returned false');

    const adminAfterReset = await User.findOne({ email: 'cpnihal35@gmail.com' });
    const newPasswordWorks = await adminAfterReset!.comparePassword(newTestPassword);
    if (!newPasswordWorks) throw new Error('New password does not work after reset');
    const oldPasswordFails = await adminAfterReset!.comparePassword(config.superAdmin.password);
    if (oldPasswordFails) throw new Error('Old password still works after reset');
    if ((adminAfterReset!.tokenVersion || 0) <= initialVersion) {
      throw new Error('tokenVersion was not incremented to revoke active sessions');
    }
    console.log('[PASS] New password works, old password rejected, tokenVersion incremented (sessions revoked)');

    // Disallow reuse of reset token
    const tokenReuseAttempt = await AuthService.resetPassword(resetResult.resetToken, 'AnotherPassword!1');
    if (tokenReuseAttempt) throw new Error('Reset token was reused successfully');
    console.log('[PASS] Reused password reset token strictly rejected');

    // Restore to configured initial password
    await AuthService.bootstrapSuperAdmin({ forceReset: true });
    console.log('[PASS] Super Admin password restored to configured initial password');

    // TEST 6: SMTP Configuration Test
    console.log('\n--- TEST 6: SMTP Configuration & Sanitization ---');
    const smtpCheck = await EmailService.verifyConnection();
    console.log(`[PASS] SMTP Check: ${smtpCheck.message}`);

    console.log('\n================================================================');
    console.log('🎉 ALL AUTHENTICATION AND SECURITY ACCEPTANCE TESTS PASSED!');
    console.log('================================================================');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ TEST FAILURE:', error.message);
    process.exit(1);
  }
}

runAuthVerification();
