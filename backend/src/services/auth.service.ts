import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Response } from 'express';
import { config } from '../config';
import { User, IUser } from '../models/User';
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
    if (existingUser) {
      throw new Error('An account with this email address already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    // CRITICAL SECURITY RULE: Public customer registration NEVER assigns administrative role
    const user = await User.create({
      name: data.name.trim(),
      email: normalizedEmail,
      phone: data.phone.trim(),
      passwordHash,
      role: 'customer' as UserRole,
      assignedShopIds: [],
      isActive: true,
      lastLogin: new Date(),
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return { user, accessToken, refreshToken };
  }

  public static async loginUser(
    email: string,
    password: string
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
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
    // Invalidate existing sessions by incrementing tokenVersion
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    await user.save();
    return true;
  }

  /**
   * Safe, idempotent Super Admin bootstrap and repair mechanism.
   * If cpnihal35@gmail.com does NOT exist, creates the account with SUPER_ADMIN_INITIAL_PASSWORD.
   * If cpnihal35@gmail.com exists and forceReset is false: DOES NOT overwrite password (preserves user changes).
   * If cpnihal35@gmail.com exists and forceReset is true: explicitly repairs password hash with SUPER_ADMIN_INITIAL_PASSWORD.
   */
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

    // Demote or deactivate any unauthorized accounts that falsely claimed super_admin role
    await User.updateMany(
      { role: 'super_admin', email: { $ne: email } },
      { $set: { role: 'shop_admin' } }
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
      superAdmin.tokenVersion = (superAdmin.tokenVersion || 0) + 1;
      await superAdmin.save();

      console.log(`[Bootstrap] Super Admin password explicitly reset for ${email}`);
      return {
        status: 'repaired',
        email,
        message: `Super Admin password securely reset for ${email}`,
      };
    }

    // Idempotent preservation: account exists, ensure super_admin role & active status without touching password
    let updated = false;
    if (superAdmin.role !== 'super_admin') {
      superAdmin.role = 'super_admin';
      updated = true;
    }
    if (!superAdmin.isActive) {
      superAdmin.isActive = true;
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
