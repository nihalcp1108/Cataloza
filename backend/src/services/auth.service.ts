import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Response } from 'express';
import { config } from '../config';
import { User, IUser } from '../models/User';
import { OtpChallenge } from '../models/OtpChallenge';
import { IUserPayload, UserRole } from '../types';
import { EmailService } from './email.service';

export class AuthService {
  public static generateAccessToken(user: IUser): string {
    const payload: IUserPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      assignedShopIds: user.assignedShopIds ? user.assignedShopIds.map((id) => id.toString()) : [],
      tokenVersion: user.tokenVersion || 0,
      isDemo: Boolean(user.isDemo),
    };

    return jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn as any,
    });
  }

  public static generateRefreshToken(user: IUser): string {
    return jwt.sign(
      { userId: user._id.toString() },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn as any }
    );
  }

  public static setAuthCookies(res: Response, accessToken: string, refreshToken?: string): void {
    const isProduction = config.isProduction;

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: config.cookie.sameSite,
      maxAge: 60 * 60 * 1000, // 1 hour
      domain: config.cookie.domain,
    });

    if (refreshToken) {
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: config.cookie.sameSite,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        domain: config.cookie.domain,
      });
    }
  }

  public static clearAuthCookies(res: Response): void {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: config.cookie.sameSite,
      domain: config.cookie.domain,
    });
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: config.cookie.sameSite,
      domain: config.cookie.domain,
    });
  }

  /**
   * Safely mask an email address for public display (e.g. c****5@gmail.com)
   */
  public static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email || '';
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`;
    }
    const first = local[0];
    const last = local[local.length - 1];
    const maskedLength = Math.max(local.length - 2, 3);
    return `${first}${'*'.repeat(maskedLength)}${last}@${domain}`;
  }

  /**
   * Find user by email or username (name) case-insensitively
   */
  public static async findUserByIdentifier(identifier: string): Promise<IUser | null> {
    const trimmed = (identifier || '').trim();
    if (!trimmed) return null;
    const normalizedEmail = trimmed.toLowerCase();

    // 1. Check exact email first
    let user = await User.findOne({ email: normalizedEmail });
    if (user) return user;

    // 2. Check name (username) case-insensitively
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    user = await User.findOne({ name: { $regex: new RegExp(`^${escaped}$`, 'i') } });
    return user;
  }

  /**
   * Authenticate user credentials (email or username + password)
   * Validates account status and password hash
   */
  public static async authenticateCredentials(
    identifier: string,
    password: string
  ): Promise<IUser> {
    const user = await this.findUserByIdentifier(identifier);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('This account has been deactivated. Please contact support.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    return user;
  }

  /**
   * Register customer with mandatory OTP email verification
   */
  public static async initiateRegistration(data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{ challengeId: string; user: IUser }> {
    const normalizedEmail = data.email.toLowerCase().trim();

    if (normalizedEmail === 'cpnihal35@gmail.com') {
      throw new Error('This email address is reserved for platform administration and cannot be registered publicly.');
    }

    let user = await User.findOne({ email: normalizedEmail });
    if (user && user.isVerified) {
      throw new Error('An account with this email address already exists. Please log in.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    if (user && !user.isVerified) {
      user.name = data.name.trim();
      user.phone = data.phone ? data.phone.trim() : user.phone;
      user.passwordHash = passwordHash;
      user.isActive = true;
      await user.save();
    } else {
      user = await User.create({
        name: data.name.trim(),
        email: normalizedEmail,
        phone: data.phone ? data.phone.trim() : undefined,
        passwordHash,
        role: 'customer' as UserRole,
        assignedShopIds: [],
        isActive: true,
        isVerified: false,
      });
    }

    // Invalidate prior pending challenges for this user
    await OtpChallenge.updateMany({ userId: user._id, used: false }, { used: true });

    // Generate secure 6-digit OTP
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const saltOtp = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otpCode, saltOtp);
    const challengeId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Dispatch verification email to the user's registered email address
    try {
      await EmailService.sendVerificationOtp(normalizedEmail, user.name, otpCode);
    } catch (deliveryError: any) {
      console.error(`[Auth] Failed to dispatch registration OTP email to ${normalizedEmail}:`, deliveryError.message);
      throw new Error(`Email delivery failed: ${deliveryError.message}`);
    }

    // Store challenge only after email was accepted by email provider
    await OtpChallenge.create({
      challengeId,
      userId: user._id,
      email: normalizedEmail,
      otpHash,
      purpose: 'registration',
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
      resendCount: 1,
      lastSentAt: new Date(),
      used: false,
      ipAddress: data.ip,
      userAgent: data.userAgent,
    });

    return { challengeId, user };
  }

  /**
   * General OTP verification for both registration and login
   */
  public static async verifyOtp(
    challengeId: string,
    otp: string
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const challenge = await OtpChallenge.findOne({ challengeId, used: false });
    if (!challenge) {
      throw new Error('Invalid or expired verification session. Please request a new code.');
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      challenge.used = true;
      await challenge.save();
      throw new Error('Verification code has expired. Please request a new code.');
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      challenge.used = true;
      await challenge.save();
      throw new Error('Maximum verification attempts exceeded. Please request a new code.');
    }

    challenge.attempts += 1;
    await challenge.save();

    const isMatch = await bcrypt.compare(otp.trim(), challenge.otpHash);
    if (!isMatch) {
      const remaining = challenge.maxAttempts - challenge.attempts;
      if (remaining <= 0) {
        challenge.used = true;
        await challenge.save();
        throw new Error('Invalid verification code. Maximum attempts reached. Please request a new code.');
      }
      throw new Error(`Invalid verification code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
    }

    challenge.used = true;
    challenge.consumedAt = new Date();
    await challenge.save();

    const user = await User.findById(challenge.userId);
    if (!user) {
      throw new Error('Associated user account was not found.');
    }

    if (!user.isActive) {
      throw new Error('This account has been deactivated. Please contact support.');
    }

    // Role-based security validation
    if (challenge.purpose === 'super_admin_2fa' && user.role !== 'super_admin') {
      throw new Error('Access denied: Challenge does not belong to an authorized Super Administrator.');
    }

    if (challenge.purpose === 'login_2fa' && user.role !== 'shop_admin') {
      throw new Error('Access denied: Challenge does not belong to an authorized Administrator.');
    }

    if (challenge.purpose === 'registration' && user.role !== 'customer') {
      throw new Error('Access denied: Invalid registration challenge.');
    }

    user.isVerified = true;
    user.isActive = true;
    user.lastLogin = new Date();
    await user.save();

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return { user, accessToken, refreshToken };
  }

  /**
   * General OTP resend handler with rate limiting
   */
  public static async resendOtp(
    challengeId: string
  ): Promise<{ email: string; expiresInSeconds: number }> {
    const challenge = await OtpChallenge.findOne({ challengeId, used: false });
    if (!challenge) {
      throw new Error('Invalid or expired verification session. Please initiate a new sign-in or registration.');
    }

    const user = await User.findById(challenge.userId);
    if (!user) {
      throw new Error('Associated user account was not found.');
    }

    if (!user.isActive) {
      throw new Error('This account has been deactivated. Please contact support.');
    }

    if (challenge.purpose === 'super_admin_2fa' && user.role !== 'super_admin') {
      throw new Error('Access denied: Challenge does not belong to a Super Administrator.');
    }

    if (challenge.purpose === 'login_2fa' && user.role !== 'shop_admin') {
      throw new Error('Access denied: Challenge does not belong to an Administrator.');
    }

    // 60-second cooldown
    const elapsedMs = Date.now() - new Date(challenge.lastSentAt).getTime();
    const cooldownMs = 60 * 1000;
    if (elapsedMs < cooldownMs) {
      const remainingSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
      throw new Error(`Please wait ${remainingSec} second${remainingSec !== 1 ? 's' : ''} before requesting a new code.`);
    }

    if (challenge.resendCount >= 5) {
      throw new Error('Maximum code resend limit reached for this session. Please initiate a new sign-in or registration.');
    }

    const recipientName = user?.name || 'User';

    const newOtpCode = crypto.randomInt(100000, 1000000).toString();
    const salt = await bcrypt.genSalt(10);
    const newOtpHash = await bcrypt.hash(newOtpCode, salt);

    try {
      if (challenge.purpose === 'super_admin_2fa') {
        await EmailService.sendSuperAdminOtp(challenge.email, newOtpCode);
      } else if (challenge.purpose === 'login_2fa') {
        await EmailService.sendAdminOtp(challenge.email, recipientName, newOtpCode);
      } else {
        await EmailService.sendVerificationOtp(challenge.email, recipientName, newOtpCode);
      }
    } catch (err: any) {
      console.error(`[Auth] Failed to resend verification OTP to ${challenge.email}:`, err.message);
      throw new Error(`Email delivery failed: ${err.message}`);
    }

    challenge.otpHash = newOtpHash;
    challenge.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    challenge.attempts = 0;
    challenge.resendCount += 1;
    challenge.lastSentAt = new Date();
    await challenge.save();

    return { email: challenge.email, expiresInSeconds: 300 };
  }

  /**
   * Direct programmatic customer registration (preserves backwards compatibility)
   */
  public static async registerCustomer(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const normalizedEmail = data.email.toLowerCase().trim();

    if (normalizedEmail === 'cpnihal35@gmail.com') {
      throw new Error('This email address is reserved for platform administration and cannot be registered publicly.');
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && existingUser.isVerified) {
      throw new Error('An account with this email address already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    let user = existingUser;
    if (user) {
      user.name = data.name.trim();
      user.phone = data.phone.trim();
      user.passwordHash = passwordHash;
      user.isVerified = true;
      user.isActive = true;
      await user.save();
    } else {
      user = await User.create({
        name: data.name.trim(),
        email: normalizedEmail,
        phone: data.phone.trim(),
        passwordHash,
        role: 'customer' as UserRole,
        assignedShopIds: [],
        isActive: true,
        isVerified: true,
        lastLogin: new Date(),
      });
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return { user, accessToken, refreshToken };
  }

  /**
   * Programmatic user login (email or username)
   */
  public static async loginUser(
    identifier: string,
    password: string
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const user = await this.authenticateCredentials(identifier, password);
    user.lastLogin = new Date();
    await user.save();

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return { user, accessToken, refreshToken };
  }

  public static async generatePasswordResetToken(
    email: string,
    appUrl?: string
  ): Promise<{ resetToken: string | null; userFound: boolean }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Return quietly to prevent email enumeration
      return { resetToken: null, userFound: false };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await user.save();

    const baseUrl = appUrl || config.publicAppUrl || config.frontendUrl;
    const resetUrl = `${baseUrl.replace(/\/+$/, '')}/reset-password?token=${resetToken}`;

    // Dispatch email securely. If mail delivery fails, propagate error so client is aware.
    await EmailService.sendPasswordResetEmail(user.email, resetUrl, resetToken);

    return { resetToken, userFound: true };
  }

  public static async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return false;
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.mustChangePassword = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    await user.save();
    return true;
  }

  public static async bootstrapSuperAdmin(options?: { forceReset?: boolean }): Promise<{
    status: 'created' | 'repaired' | 'exists';
    email: string;
    message: string;
  }> {
    const email = config.superAdmin.email;
    const initialPassword = config.superAdmin.password;
    const name = config.superAdmin.name || 'Platform Super Administrator';
    const forceReset = Boolean(options?.forceReset);

    if (!initialPassword) {
      const existing = await User.findOne({ email });
      if (existing) {
        return {
          status: 'exists',
          email,
          message: 'Super Admin exists; SUPER_ADMIN_INITIAL_PASSWORD not set in env so existing password preserved.',
        };
      }
      throw new Error(
        'Cannot bootstrap Super Admin: SUPER_ADMIN_INITIAL_PASSWORD is not set in backend/.env'
      );
    }

    await User.updateMany(
      { role: 'super_admin', email: { $ne: email } },
      { $set: { role: 'shop_admin', isVerified: true } }
    );

    let superAdmin = await User.findOne({ email });

    if (!superAdmin) {
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(initialPassword, salt);

      superAdmin = await User.create({
        name,
        email,
        passwordHash,
        role: 'super_admin',
        assignedShopIds: [],
        isActive: true,
        isVerified: true,
        mustChangePassword: false,
        tokenVersion: 0,
      });

      console.log(`[Bootstrap] Super Admin account created for ${email}`);
      return {
        status: 'created',
        email,
        message: `Super Admin account initialized successfully for ${email}`,
      };
    }

    if (forceReset) {
      const salt = await bcrypt.genSalt(12);
      superAdmin.passwordHash = await bcrypt.hash(initialPassword, salt);
      superAdmin.role = 'super_admin';
      superAdmin.isActive = true;
      superAdmin.isVerified = true;
      superAdmin.tokenVersion = (superAdmin.tokenVersion || 0) + 1;
      await superAdmin.save();

      console.log(`[Bootstrap] Super Admin password explicitly reset for ${email}`);
      return {
        status: 'repaired',
        email,
        message: `Super Admin password securely reset for ${email}`,
      };
    }

    let updated = false;
    if (superAdmin.role !== 'super_admin') {
      superAdmin.role = 'super_admin';
      updated = true;
    }
    if (!superAdmin.isActive) {
      superAdmin.isActive = true;
      updated = true;
    }
    if (!superAdmin.isVerified) {
      superAdmin.isVerified = true;
      updated = true;
    }
    if (updated) {
      await superAdmin.save();
    }

    return {
      status: 'exists',
      email,
      message: `Super Admin account exists for ${email}. Existing password preserved.`,
    };
  }
}
