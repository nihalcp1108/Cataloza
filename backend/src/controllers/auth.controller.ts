import { Request, Response } from 'express';
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

export class AuthController {
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await AuthService.registerCustomer(req.body);
      AuthService.setAuthCookies(res, accessToken, refreshToken);

      res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        data: {
          user,
          accessToken,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed',
      });
    }
  }

  /**
   * Unified login endpoint
   * If cpnihal35@gmail.com logs in, delegates to two-step superAdminLogin flow
   */
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const email = (req.body.email || '').toLowerCase().trim();

      // If logging in as the authorized Super Admin, enforce two-step verification
      if (email === AUTHORIZED_SUPER_ADMIN_EMAIL) {
        return AuthController.superAdminLogin(req, res);
      }

      const { password } = req.body;
      const { user, accessToken, refreshToken } = await AuthService.loginUser(email, password);

      // Prevent non-authorized accounts from possessing or using super_admin role
      if (user.role === 'super_admin' && user.email !== AUTHORIZED_SUPER_ADMIN_EMAIL) {
        res.status(403).json({
          success: false,
          message: 'Access denied: unauthorized administrator credential',
        });
        return;
      }

      AuthService.setAuthCookies(res, accessToken, refreshToken);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user,
          accessToken,
        },
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || 'Invalid credentials',
      });
    }
  }

  /**
   * Step 1: Super Admin Login & OTP Generation
   * Fixed authorized email: cpnihal35@gmail.com
   */
  public static async superAdminLogin(req: Request, res: Response): Promise<void> {
    try {
      const email = (req.body.email || '').toLowerCase().trim();
      const password = req.body.password;

      // 1. Strict email validation: Only cpnihal35@gmail.com is permitted
      if (email !== AUTHORIZED_SUPER_ADMIN_EMAIL) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      // 2. Fetch authoritative user from MongoDB
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

      // 3. Ensure super_admin role for authorized account
      if (user.role !== 'super_admin') {
        user.role = 'super_admin';
        user.isActive = true;
        await user.save();
      }

      // 4. Confirm account is active
      if (!user.isActive) {
        user.isActive = true;
        await user.save();
      }

      // 5. Verify password hash strictly against stored bcrypt hash (no bypasses)
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      // 6. Rate Limiting: Max 5 OTP sends per 15 minutes per account
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

      // 7. Invalidate all older outstanding challenges for this user
      await OtpChallenge.updateMany({ userId: user._id, used: false }, { used: true });

      // 8. Generate cryptographically secure 6-digit OTP
      const otpCode = crypto.randomInt(100000, 1000000).toString();
      const salt = await bcrypt.genSalt(10);
      const otpHash = await bcrypt.hash(otpCode, salt);

      // 9. Generate opaque challenge ID
      const challengeId = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // 10. Send OTP exclusively to cpnihal35@gmail.com
      try {
        await EmailService.sendSuperAdminOtp(AUTHORIZED_SUPER_ADMIN_EMAIL, otpCode);
      } catch (deliveryError: any) {
        // Sanitize error log: Never log OTP or secrets
        console.error('[Auth] Failed to dispatch Super Admin OTP email:', deliveryError.message);
        res.status(502).json({
          success: false,
          message: `Email delivery failed: ${deliveryError.message}. Please verify SMTP settings in backend/.env`,
        });
        return;
      }

      // 11. Store challenge record only after email delivery was accepted
      await OtpChallenge.create({
        challengeId,
        userId: user._id,
        email: AUTHORIZED_SUPER_ADMIN_EMAIL,
        otpHash,
        expiresAt,
        attempts: 0,
        maxAttempts: 5,
        resendCount: 1,
        lastSentAt: new Date(),
        used: false,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Audit event
      await AuditService.logAction({
        actorId: user._id.toString(),
        actorRole: user.role,
        action: 'SUPER_ADMIN_OTP_DISPATCHED',
        targetEntity: 'User',
        targetId: user._id.toString(),
        metadata: { recipient: AUTHORIZED_SUPER_ADMIN_EMAIL },
      });

      // Return challenge ID (never expose OTP)
      res.json({
        success: true,
        requiresOtp: true,
        message: `A 6-digit verification code has been sent to ${AUTHORIZED_SUPER_ADMIN_EMAIL}`,
        data: {
          challengeId,
          email: AUTHORIZED_SUPER_ADMIN_EMAIL,
          expiresInSeconds: 300,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Step 2: Super Admin OTP Verification
   */
  public static async superAdminVerifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const { challengeId, otp } = req.body;

      if (!challengeId || !otp) {
        res.status(400).json({ success: false, message: 'Challenge ID and 6-digit OTP code are required' });
        return;
      }

      // 1. Locate challenge
      const challenge = await OtpChallenge.findOne({ challengeId, used: false });
      if (!challenge) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired verification session. Please sign in again.',
        });
        return;
      }

      // 2. Check expiration (5 minutes)
      if (challenge.expiresAt.getTime() < Date.now()) {
        challenge.used = true;
        await challenge.save();
        res.status(400).json({
          success: false,
          message: 'Verification code has expired. Please sign in again.',
        });
        return;
      }

      // 3. Check attempt limit (max 5)
      if (challenge.attempts >= challenge.maxAttempts) {
        challenge.used = true;
        await challenge.save();
        res.status(429).json({
          success: false,
          message: 'Maximum verification attempts exceeded. Please initiate a new sign-in.',
        });
        return;
      }

      // 4. Increment attempt counter atomically
      challenge.attempts += 1;
      await challenge.save();

      // 5. Verify associated Super Admin account
      const user = await User.findById(challenge.userId);
      if (
        !user ||
        user.role !== 'super_admin' ||
        !user.isActive ||
        user.email !== AUTHORIZED_SUPER_ADMIN_EMAIL
      ) {
        challenge.used = true;
        await challenge.save();
        res.status(403).json({
          success: false,
          message: 'Unauthorized account state or role mismatch.',
        });
        return;
      }

      // 6. Verify cryptographic hash of OTP
      const isMatch = await bcrypt.compare(otp.trim(), challenge.otpHash);
      if (!isMatch) {
        const remainingAttempts = challenge.maxAttempts - challenge.attempts;
        if (remainingAttempts <= 0) {
          challenge.used = true;
          await challenge.save();
          res.status(400).json({
            success: false,
            message: 'Invalid verification code. Maximum attempts reached. Please sign in again.',
          });
          return;
        }

        res.status(400).json({
          success: false,
          message: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
        });
        return;
      }

      // 7. Successful verification: Consume challenge
      challenge.used = true;
      challenge.consumedAt = new Date();
      await challenge.save();

      // 8. Update user login time
      user.lastLogin = new Date();
      await user.save();

      // 9. Issue authoritative JWT tokens & secure HttpOnly cookies
      const accessToken = AuthService.generateAccessToken(user);
      const refreshToken = AuthService.generateRefreshToken(user);
      AuthService.setAuthCookies(res, accessToken, refreshToken);

      // Audit event
      await AuditService.logAction({
        actorId: user._id.toString(),
        actorRole: user.role,
        action: 'SUPER_ADMIN_2FA_LOGIN_SUCCESS',
        targetEntity: 'User',
        targetId: user._id.toString(),
      });

      res.json({
        success: true,
        message: 'Super Admin authentication successful',
        data: {
          user,
          accessToken,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Resend Super Admin OTP
   */
  public static async superAdminResendOtp(req: Request, res: Response): Promise<void> {
    try {
      const { challengeId } = req.body;
      if (!challengeId) {
        res.status(400).json({ success: false, message: 'Challenge ID is required' });
        return;
      }

      const challenge = await OtpChallenge.findOne({ challengeId, used: false });
      if (!challenge) {
        res.status(400).json({ success: false, message: 'Invalid or expired session. Please sign in again.' });
        return;
      }

      // 1. Resend cooldown: at least 60 seconds
      const elapsedMs = Date.now() - new Date(challenge.lastSentAt).getTime();
      const cooldownMs = 60 * 1000;
      if (elapsedMs < cooldownMs) {
        const remainingSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
        res.status(429).json({
          success: false,
          message: `Please wait ${remainingSec} second${remainingSec !== 1 ? 's' : ''} before requesting a new code.`,
        });
        return;
      }

      // 2. Maximum 3 sends per challenge
      if (challenge.resendCount >= 3) {
        res.status(429).json({
          success: false,
          message: 'Maximum code resend limit reached for this session. Please sign in again.',
        });
        return;
      }

      // 3. Generate new OTP
      const newOtpCode = crypto.randomInt(100000, 1000000).toString();
      const salt = await bcrypt.genSalt(10);
      const newOtpHash = await bcrypt.hash(newOtpCode, salt);

      // 4. Dispatch email
      try {
        await EmailService.sendSuperAdminOtp(AUTHORIZED_SUPER_ADMIN_EMAIL, newOtpCode);
      } catch (err: any) {
        res.status(502).json({
          success: false,
          message: `Failed to resend email: ${err.message}`,
        });
        return;
      }

      // 5. Update challenge
      challenge.otpHash = newOtpHash;
      challenge.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      challenge.attempts = 0; // reset attempts for fresh code
      challenge.resendCount += 1;
      challenge.lastSentAt = new Date();
      await challenge.save();

      res.json({
        success: true,
        message: `A fresh verification code has been dispatched to ${AUTHORIZED_SUPER_ADMIN_EMAIL}`,
        data: {
          expiresInSeconds: 300,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Shop Admin Password Setup via Invitation Token
   */
  public static async setupAdminPassword(req: Request, res: Response): Promise<void> {
    try {
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
      user.lastLogin = new Date();
      await user.save();

      const accessToken = AuthService.generateAccessToken(user);
      const refreshToken = AuthService.generateRefreshToken(user);
      AuthService.setAuthCookies(res, accessToken, refreshToken);

      res.json({
        success: true,
        message: 'Password successfully configured. Welcome to your Shop Admin portal.',
        data: {
          user,
          accessToken,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async logout(_req: Request, res: Response): Promise<void> {
    AuthService.clearAuthCookies(res);
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  public static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const user = await User.findById(req.user.userId).populate('assignedShopIds', 'name slug logo status');
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
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

      res.json({
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
      const email = (req.body.email || '').toLowerCase().trim();
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

      res.json({
        success: true,
        message: 'If an account is associated with this email address, a password reset link has been dispatched to your inbox.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
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

      res.json({
        success: true,
        message: 'Password has been reset successfully. Please sign in with your new password.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
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

      // Issue refreshed tokens for current active session
      const accessToken = AuthService.generateAccessToken(user);
      const refreshToken = AuthService.generateRefreshToken(user);
      AuthService.setAuthCookies(res, accessToken, refreshToken);

      res.json({
        success: true,
        message: 'Password updated successfully across all sessions.',
        data: { accessToken },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Protected administrative endpoint to repair or re-bootstrap Super Admin
   */
  public static async triggerBootstrap(req: Request, res: Response): Promise<void> {
    try {
      const secret = req.headers['x-bootstrap-secret'] || req.body?.secret || req.query?.secret;
      if (secret !== config.superAdmin.bootstrapSecret) {
        res.status(403).json({ success: false, message: 'Unauthorized bootstrap request' });
        return;
      }

      const forceReset = req.body?.forceReset === true || req.query?.forceReset === 'true';
      const result = await AuthService.bootstrapSuperAdmin({ forceReset });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async forceChangeInitialPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
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

      res.json({
        success: true,
        message: 'Password successfully changed. You now have full access to your account.',
        data: { user },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
