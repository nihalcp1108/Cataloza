import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// 1. Load backend environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import mongoose from 'mongoose';
import { config } from '../src/config';
import { EmailService } from '../src/services/email.service';
import { User } from '../src/models/User';
import { OtpChallenge } from '../src/models/OtpChallenge';
import { AuthService } from '../src/services/auth.service';

async function runEmailDiagnostic() {
  console.log('============================================================');
  console.log('📧 CATALOZA SMTP & OTP EMAIL DELIVERY DIAGNOSTIC');
  console.log('============================================================\n');

  // Step 1: Validate Environment Configuration
  console.log('1. Checking SMTP environment configuration...');
  const envCheck = EmailService.validateEnvironment();
  if (!envCheck.valid) {
    console.error('❌ Missing required SMTP configuration in backend/.env:');
    envCheck.missingVars.forEach((v) => console.error(`   - ${v}`));
    process.exit(1);
  }

  const { host, port, secure, user, pass, from } = config.smtp;
  const maskedPass = pass ? '••••••••••••••••' : '(not set)';
  console.log(`   Host:     ${host}`);
  console.log(`   Port:     ${port} (secure: ${secure})`);
  console.log(`   User:     ${user}`);
  console.log(`   Password: ${maskedPass} (length: ${pass ? pass.length : 0})`);
  console.log(`   From:     ${from}`);
  console.log('   ✅ Environment variables are loaded and normalized.\n');

  // Step 2: Test SMTP Connection & Authentication via STARTTLS on Port 587
  console.log(`2. Connecting to ${host}:${port} via STARTTLS and authenticating...`);
  const diag = await EmailService.verifyConnection();
  if (diag.success) {
    console.log(`   ✅ PASS: ${diag.message}\n`);
  } else {
    console.error(`   ❌ FAIL: ${diag.message}`);
    if (diag.message.includes('535') || diag.message.includes('EAUTH')) {
      console.error('\n   ⚠️  AUTHENTICATION ERROR (535 / EAUTH):');
      console.error('   Google rejected the provided SMTP username/password combination.');
      console.error('   Requirements:');
      console.error('   1. Ensure 2-Step Verification is turned ON for the Google Account.');
      console.error('   2. Generate an App Password at https://myaccount.google.com/apppasswords');
      console.error('   3. Put the 16-character App Password into backend/.env as SMTP_PASS.');
    } else if (diag.message.includes('ETIMEDOUT') || diag.message.includes('ECONNECTION')) {
      console.error('\n   ⚠️  NETWORK ERROR (ETIMEDOUT / ECONNECTION):');
      console.error('   Unable to reach smtp.gmail.com:587. Check firewall, proxy, or ISP port 587 blocking.');
    }
    console.error('\n============================================================');
    console.error('❌ DIAGNOSTIC FAILED AT SMTP AUTHENTICATION STEP');
    console.error('============================================================');
    process.exit(1);
  }

  // Step 3: Test Email Dispatch to explicit recipient
  const targetRecipient = process.argv[2] || process.env.TEST_EMAIL_RECIPIENT;
  const isSuperAdminTest = process.argv.includes('--super-admin') || process.argv.includes('--otp-flow');

  if (targetRecipient && !targetRecipient.startsWith('--')) {
    console.log(`3. Sending test verification OTP email to: ${targetRecipient}...`);
    try {
      const testOtp = '849201';
      await EmailService.sendVerificationOtp(targetRecipient, 'Cataloza Diagnostic Tester', testOtp);
      console.log(`   ✅ PASS: Test verification email accepted by SMTP server for delivery to ${targetRecipient}.\n`);
    } catch (err: any) {
      console.error(`   ❌ FAIL: Could not deliver test email to ${targetRecipient}:`, err.message);
      process.exit(1);
    }
  } else if (!isSuperAdminTest) {
    console.log('3. Test email dispatch skipped (no test recipient specified).');
    console.log('   To dispatch a test email to an explicit recipient, run:');
    console.log('   npx tsx scripts/test-email.ts your_email@gmail.com\n');
  }

  // Step 4: Super Admin OTP Workflow Test (if requested)
  if (isSuperAdminTest) {
    console.log('4. Testing Complete Super Admin OTP Flow in Database & Email...');
    try {
      await mongoose.connect(config.mongoUri);
      console.log('   [DB] Connected to MongoDB Atlas');

      const adminEmail = config.superAdmin.email;
      const adminPassword = config.superAdmin.password;

      // 1. Ensure Super Admin account exists
      await AuthService.bootstrapSuperAdmin({ forceReset: false });
      const admin = await User.findOne({ email: adminEmail });
      if (!admin) {
        throw new Error(`Super Admin account (${adminEmail}) not found in database`);
      }

      const passMatches = await admin.comparePassword(adminPassword);
      if (!passMatches) {
        throw new Error('Configured initial password does not match database passwordHash');
      }
      console.log('   ✅ Step 4.1: Credentials validated successfully.');

      // 2. Generate secure 6-digit OTP
      const otpCode = crypto.randomInt(100000, 1000000).toString();
      const salt = await bcrypt.genSalt(10);
      const otpHash = await bcrypt.hash(otpCode, salt);
      const challengeId = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // 3. Dispatch OTP via EmailService
      console.log(`   Sending Super Admin 2FA OTP to ${adminEmail}...`);
      await EmailService.sendSuperAdminOtp(adminEmail, otpCode);
      console.log(`   ✅ Step 4.2: Super Admin OTP dispatched to ${adminEmail}.`);

      // 4. Record OtpChallenge in DB
      await OtpChallenge.updateMany({ userId: admin._id, used: false }, { used: true });
      const challenge = await OtpChallenge.create({
        challengeId,
        userId: admin._id,
        email: adminEmail,
        otpHash,
        purpose: 'super_admin_2fa',
        expiresAt,
        attempts: 0,
        maxAttempts: 5,
        resendCount: 1,
        lastSentAt: new Date(),
        used: false,
      });
      console.log(`   ✅ Step 4.3: Challenge stored in DB (Expires in: 10 minutes).`);

      // 5. Verify OTP
      const verifyResult = await AuthService.verifyOtp(challengeId, otpCode);
      console.log(`   ✅ Step 4.4: OTP verified! Access token issued for role: ${verifyResult.user.role}`);

      console.log('   ✅ Step 4.5: Complete Super Admin OTP Flow PASSED end-to-end.\n');
    } catch (err: any) {
      console.error('   ❌ Super Admin OTP Flow test failed:', err.message);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
    }
  }

  console.log('============================================================');
  console.log('🎉 EMAIL SERVICE DIAGNOSTIC COMPLETED SUCCESSFULLY');
  console.log('============================================================');
}

runEmailDiagnostic().catch((err) => {
  console.error('\n❌ Unhandled diagnostic failure:', err.message);
  process.exit(1);
});
