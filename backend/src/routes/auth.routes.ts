import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  superAdminLoginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  setupPasswordSchema,
} from '../validators/auth.validator';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Standard customer and admin authentication
router.post('/register', authLimiter, validate(registerSchema), AuthController.register);
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);
router.post('/refresh', AuthController.refreshToken);

// Super Admin 2-Step OTP Authentication
router.post(
  '/super-admin/login',
  authLimiter,
  validate(superAdminLoginSchema),
  AuthController.superAdminLogin
);
router.post(
  '/super-admin/verify-otp',
  authLimiter,
  validate(verifyOtpSchema),
  AuthController.superAdminVerifyOtp
);
router.post(
  '/super-admin/resend-otp',
  authLimiter,
  validate(resendOtpSchema),
  AuthController.superAdminResendOtp
);

// Shop Admin invitation password setup
router.post(
  '/setup-admin-password',
  authLimiter,
  validate(setupPasswordSchema),
  AuthController.setupAdminPassword
);

// Password recovery & initial password updates
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), AuthController.resetPassword);
router.post('/change-password', authenticate, validate(changePasswordSchema), AuthController.changePassword);
router.post('/change-initial-password', authenticate, AuthController.forceChangeInitialPassword);

// Super Admin explicit bootstrap / repair endpoint
router.post('/bootstrap-super-admin', AuthController.triggerBootstrap);

export default router;
