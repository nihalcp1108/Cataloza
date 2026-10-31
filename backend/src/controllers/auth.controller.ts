import { Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';
import { AuditService } from '../services/audit.service';
import { AuthenticatedRequest } from '../types';
import { User } from '../models/User';
import { OtpChallenge } from '../models/OtpChallenge';
import { config } from '../config';

const AUTHORIZED_SUPER_ADMIN_EMAIL = 'cpnihal35@gmail.com';

const isDatabaseUnavailable = (): boolean => mongoose.connection.readyState !== 1;

const isDatabaseError = (error: any): boolean => {
  return (
    mongoose.connection.readyState !== 1 ||
    error?.name === 'MongooseError' ||
    error?.name === 'MongoServerSelectionError' ||
    error?.name === 'MongoNetworkError' ||
    Boolean(error?.message?.includes('buffering timed out')) ||
    Boolean(error?.message?.includes('ECONNREFUSED'))
  );
};

export class AuthController {
  /**
   * User Registration with mandatory OTP verification
   */
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      if (isDatabaseUnavailable()) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }

      const { name, email, phone, password } = req.body;
      const normalizedEmail = (email || '').toLowerCase().trim();

      if (!normalizedEmail || !password || !name) {
        res.status(400).json({
          success: false,
          message: 'Name, email, and password are required',
        });
        return;
      }

      const { challengeId } = await AuthService.initiateRegistration({
        name,
        email: normalizedEmail,
        phone,
        password,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json({
        success: true,
        requiresOtp: true,
        message: `A 6-digit verification code has been dispatched to ${normalizedEmail}. Please enter it to complete registration.`,
        data: {
          challengeId,
          email: normalizedEmail,
          expiresInSeconds: 600,
        },
      });
    } catch (error: any) {
      if (isDatabaseError(error)) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed',
      });
    }
  }

  /**
   * Unified OTP verification endpoint (registration & login)
   */
  public static async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      if (isDatabaseUnavailable()) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }

      const { challengeId, otp } = req.body;
      if (!challengeId || !otp) {
        res.status(400).json({
          success: false,
          message: 'Challenge ID and 6-digit OTP code are required',
        });
        return;
      }

      const { user, accessToken, refreshToken } = await AuthService.verifyOtp(challengeId, otp);
      AuthService.setAuthCookies(res, accessToken, refreshToken);

      if (user.role === 'super_admin') {
        await AuditService.logAction({
          actorId: user._id.toString(),
          actorRole: user.role,
          action: 'SUPER_ADMIN_2FA_LOGIN_SUCCESS',
          targetEntity: 'User',
          targetId: user._id.toString(),
        });
      }

      res.status(200).json({
        success: true,
        message: 'Account verified successfully',
        data: {
          user,
          accessToken,
        },
      });
    } catch (error: any) {
      if (isDatabaseError(error)) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }

      const statusCode = error.message?.includes('Maximum verification attempts') ? 429 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Verification failed',
      });
    }
  }

  /**
   * Resend OTP endpoint with rate limiting
   */
  public static async resendOtp(req: Request, res: Response): Promise<void> {
    try {
      if (isDatabaseUnavailable()) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }

      const { challengeId } = req.body;
      if (!challengeId) {
        res.status(400).json({
          success: false,
          message: 'Challenge ID is required',
        });
        return;
      }

      const result = await AuthService.resendOtp(challengeId);

      res.status(200).json({
        success: true,
        message: `A fresh verification code has been dispatched to ${result.email}`,
        data: {
          expiresInSeconds: result.expiresInSeconds,
        },
      });
    } catch (error: any) {
      if (isDatabaseError(error)) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }

      const statusCode = error.message?.includes('wait') || error.message?.includes('Maximum') ? 429 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to resend verification code',
      });
    }
  }

  /**
   * Unified login endpoint
   * If cpnihal35@gmail.com logs in, delegates to two-step superAdminLogin flow
   */
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      if (isDatabaseUnavailable()) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }

      const email = (req.body?.email || '').toLowerCase().trim();
      const password = req.body?.password;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
        return;
      }

      // If logging in as the authorized Super Admin, enforce two-step verification
      if (email === AUTHORIZED_SUPER_ADMIN_EMAIL) {
        return AuthController.superAdminLogin(req, res);
      }

      const { user, accessToken, refreshToken } = await AuthService.loginUser(email, password);

      // Prevent non-authorized accounts from possessing or using super_admin role
      if (user.role === 'super_admin' && user.email !== AUTHORIZED_SUPER_ADMIN_EMAIL) {
        res.status(403).json({
          success: false,
          message: 'Access denied: unauthorized administrator credential',
        });
        return;
      }

      // Check if user is unverified
      if (!user.isVerified && user.role !== 'super_admin') {
        const otpCode = crypto.randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otpCode, 10);
        const challengeId = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        try {
          await EmailService.sendVerificationOtp(user.email, user.name, otpCode);
        } catch (mailErr: any) {
          console.error(`[Auth] Failed to dispatch login verification OTP to ${user.email}:`, mailErr.message);
        }

        await OtpChallenge.create({
          challengeId,
          userId: user._id,
          email: user.email,
          otpHash,
          purpose: 'registration',
          expiresAt,
          attempts: 0,
          maxAttempts: 5,
          resendCount: 1,
          lastSentAt: new Date(),
          used: false,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });

        res.status(200).json({
          success: true,
          requiresOtp: true,
          message: 'Your email address is not yet verified. A 6-digit verification code has been dispatched to your email.',
          data: {
            challengeId,
            email: user.email,
            expiresInSeconds: 600,
          },
        });
        return;
      }

      AuthService.setAuthCookies(res, accessToken, refreshToken);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user,
          accessToken,
        },
      });
    } catch (error: any) {
      if (isDatabaseError(error)) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }

      res.status(401).json({
        success: false,
        message: error.message || 'Invalid credentials',
      });
    }
  }

  /**
   * Step 1: Super Admin Login & OTP Generation
   */
  public static async superAdminLogin(req: Request, res: Response): Promise<void> {
    try {
      if (isDatabaseUnavailable()) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }

      const email = (req.body?.email || '').toLowerCase().trim();
      const password = req.body?.password;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
        return;
      }

      if (email !== AUTHORIZED_SUPER_ADMIN_EMAIL) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      let user = await User.findOne({ email: AUTHORIZED_SUPER_ADMIN_EMAIL });
      if (!user && config.superAdmin.password) {
        try {
          await AuthService.bootstrapSuperAdmin({ forceReset: false });
          user = await User.findOne({ email: AUTHORIZED_SUPER_ADMIN_EMAIL });
        } catch (err: any) {
          console.warn('[Auth] On-demand Super Admin bootstrap warning:', err.message);
        }
      }

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      if (user.role !== 'super_admin') {
        user.role = 'super_admin';
        user.isActive = true;
        user.isVerified = true;
        await user.save();
      }

      if (!user.isActive) {
        user.isActive = true;
        await user.save();
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const recentOtpCount = await OtpChallenge.countDocuments({
        userId: user._id,
        createdAt: { $gte: fifteenMinutesAgo },
      });

      if (recentOtpCount >= 5) {
        res.status(429).json({
          success: false,
          message: 'Too many verification code requests. Please wait 15 minutes before requesting a new code.',
        });
        return;
      }

      await OtpChallenge.updateMany({ userId: user._id, used: false }, { used: true });

      const otpCode = crypto.randomInt(100000, 1000000).toString();
      const salt = await bcrypt.genSalt(10);
      const otpHash = await bcrypt.hash(otpCode, salt);

      const challengeId = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      try {
        await EmailService.sendSuperAdminOtp(AUTHORIZED_SUPER_ADMIN_EMAIL, otpCode);
      } catch (deliveryError: any) {
        console.error('[Auth] Failed to dispatch Super Admin OTP email:', deliveryError.message);
        res.status(502).json({
          success: false,
          message: `Email delivery failed: ${deliveryError.message}. Please verify SMTP settings in backend/.env`,
        });
        return;
      }

      await OtpChallenge.create({
        challengeId,
        userId: user._id,
        email: AUTHORIZED_SUPER_ADMIN_EMAIL,
        otpHash,
        purpose: 'super_admin_2fa',
        expiresAt,
        attempts: 0,
        maxAttempts: 5,
        resendCount: 1,
        lastSentAt: new Date(),
        used: false,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      await AuditService.logAction({
        actorId: user._id.toString(),
        actorRole: user.role,
        action: 'SUPER_ADMIN_OTP_DISPATCHED',
        targetEntity: 'User',
        targetId: user._id.toString(),
        metadata: { recipient: AUTHORIZED_SUPER_ADMIN_EMAIL },
      });

      res.status(200).json({
        success: true,
        requiresOtp: true,
        message: `A 6-digit verification code has been sent to ${AUTHORIZED_SUPER_ADMIN_EMAIL}`,
        data: {
          challengeId,
          email: AUTHORIZED_SUPER_ADMIN_EMAIL,
          expiresInSeconds: 600,
        },
      });
    } catch (error: any) {
      if (isDatabaseError(error)) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }

      console.error('[Auth] Super Admin login error:', error.message);
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }

  /**
   * Super Admin OTP Verification (delegates to verifyOtp)
   */
  public static async superAdminVerifyOtp(req: Request, res: Response): Promise<void> {
    return AuthController.verifyOtp(req, res);
  }

  /**
   * Super Admin OTP Resend (delegates to resendOtp)
   */
  public static async superAdminResendOtp(req: Request, res: Response): Promise<void> {
    return AuthController.resendOtp(req, res);
  }

  /**
   * Shop Admin Password Setup via Invitation Token
   */
  public static async setupAdminPassword(req: Request, res: Response): Promise<void> {
    try {
      if (isDatabaseUnavailable()) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }

      const { token, password } = req.body;
      if (!token || !password) {
        res.status(400).json({ success: false, message: 'Invitation token and new password are required' });
        return;
      }

      const user = await User.findOne({
        invitationToken: token,
        invitationExpires: { $gt: new Date() },
      });

      if (!user) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired invitation token. Please ask the Super Admin to resend your invitation.',
        });
        return;
      }

      const salt = await bcrypt.genSalt(12);
      user.passwordHash = await bcrypt.hash(password, salt);
      user.invitationToken = undefined;
      user.invitationExpires = undefined;
      user.mustChangePassword = false;
      user.isActive = true;
      user.isVerified = true;
      user.lastLogin = new Date();
      await user.save();

      const accessToken = AuthService.generateAccessToken(user);
      const refreshToken = AuthService.generateRefreshToken(user);
      AuthService.setAuthCookies(res, accessToken, refreshToken);

      res.status(200).json({
        success: true,
        message: 'Password successfully configured. Welcome to your Shop Admin portal.',
        data: {
          user,
          accessToken,
        },
      });
    } catch (error: any) {
      if (isDatabaseError(error)) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }

  public static async logout(_req: Request, res: Response): Promise<void> {
    AuthService.clearAuthCookies(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  public static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (isDatabaseUnavailable()) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const user = await User.findById(req.user.userId)
        .populate('assignedShopIds', 'name slug logo status')
        .lean();
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error: any) {
      if (isDatabaseError(error)) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }

  public static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      if (isDatabaseUnavailable()) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }

      const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
      if (!refreshToken) {
        res.status(401).json({ success: false, message: 'Refresh token required' });
        return;
      }

      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { userId: string };
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        res.status(401).json({ success: false, message: 'Invalid session or user inactive' });
        return;
      }

      const newAccessToken = AuthService.generateAccessToken(user);
      const newRefreshToken = AuthService.generateRefreshToken(user);
      AuthService.setAuthCookies(res, newAccessToken, newRefreshToken);

      res.status(200).json({
        success: true,
        data: {
          accessToken: newAccessToken,
        },
      });
    } catch {
      res.status(401).json({ success: false, message: 'Session expired, please log in again' });
    }
  }

  public static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      if (isDatabaseUnavailable()) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }

      const email = (req.body?.email || '').toLowerCase().trim();
      if (!email) {
        res.status(400).json({ success: false, message: 'Email address is required' });
        return;
      }

      const appUrl = (req.headers.origin as string) || config.publicAppUrl || config.frontendUrl;

      try {
        await AuthService.generatePasswordResetToken(email, appUrl);
      } catch (err: any) {
        console.error('[Auth] Failed to dispatch password reset email:', err.message);
        res.status(502).json({
          success: false,
          message: `Email delivery failed: ${err.message}. Please verify SMTP settings in backend/.env`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'If an account is associated with this email address, a password reset link has been dispatched to your inbox.',
      });
    } catch (error: any) {
      if (isDatabaseError(error)) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }

  public static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      if (isDatabaseUnavailable()) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }

      const { token, password, confirmPassword } = req.body;
      if (!token) {
        res.status(400).json({ success: false, message: 'Reset token is required' });
        return;
      }

      if (!password || password.length < 8) {
        res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long and include an uppercase letter and number',
        });
        return;
      }

      if (confirmPassword && password !== confirmPassword) {
        res.status(400).json({ success: false, message: 'Passwords do not match' });
        return;
      }

      const success = await AuthService.resetPassword(token, password);
      if (!success) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired password reset link. Please request a new link.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully. Please sign in with your new password.',
      });
    } catch (error: any) {
      if (isDatabaseError(error)) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }

  public static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (isDatabaseUnavailable()) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, message: 'Current password and new password are required' });
        return;
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        res.status(400).json({ success: false, message: 'New password and confirmation do not match' });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
        return;
      }

      const user = await User.findById(req.user!.userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        res.status(400).json({ success: false, message: 'Current password is incorrect' });
        return;
      }

      const salt = await bcrypt.genSalt(12);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      user.mustChangePassword = false;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();

      const accessToken = AuthService.generateAccessToken(user);
      const refreshToken = AuthService.generateRefreshToken(user);
      AuthService.setAuthCookies(res, accessToken, refreshToken);

      res.status(200).json({
        success: true,
        message: 'Password updated successfully across all sessions.',
        data: { accessToken },
      });
    } catch (error: any) {
      if (isDatabaseError(error)) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }

  public static async triggerBootstrap(req: Request, res: Response): Promise<void> {
    try {
      if (isDatabaseUnavailable()) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }

      const secret = req.headers['x-bootstrap-secret'] || req.body?.secret || req.query?.secret;
      if (secret !== config.superAdmin.bootstrapSecret) {
        res.status(403).json({ success: false, message: 'Unauthorized bootstrap request' });
        return;
      }

      const forceReset = req.body?.forceReset === true || req.query?.forceReset === 'true';
      const result = await AuthService.bootstrapSuperAdmin({ forceReset });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (isDatabaseError(error)) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }

  public static async forceChangeInitialPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (isDatabaseUnavailable()) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, message: 'Current and new password are required' });
        return;
      }
      if (confirmPassword && newPassword !== confirmPassword) {
        res.status(400).json({ success: false, message: 'New passwords do not match' });
        return;
      }
      if (newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
        return;
      }

      const user = await User.findById(req.user!.userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        res.status(400).json({ success: false, message: 'Current password is incorrect' });
        return;
      }

      const salt = await bcrypt.genSalt(12);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      user.mustChangePassword = false;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password successfully changed. You now have full access to your account.',
        data: { user },
      });
    } catch (error: any) {
      if (isDatabaseError(error)) {
        res.status(503).json({
          success: false,
          message: 'Database service unavailable. Please ensure MongoDB is connected.',
        });
        return;
      }
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }
}
