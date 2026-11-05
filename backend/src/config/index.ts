import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory or fallback to current working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const rawMongoUri = (
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.DATABASE_URL ||
  'mongodb://localhost:27017/wholesale_catalogue'
)
  .trim()
  .replace(/^["']|["']$/g, '')
  .replace(/^MONGO(?:DB)?_URI=/, '')
  .replace(/^DATABASE_URL=/, '')
  .trim();

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '5001', 10),

  mongoUri: rawMongoUri,

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  publicAppUrl: process.env.PUBLIC_APP_URL || 'http://localhost:5173',
  apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || '5001'}/api/v1`,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_wholesale_platform_123',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_wholesale_platform_456',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cookie: {
    domain: process.env.COOKIE_DOMAIN || undefined,
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    sameSite: (process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    isConfigured: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
  },

  resend: {
    apiKey: (process.env.RESEND_API_KEY || '').trim(),
    from: (process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'Cataloza <onboarding@resend.dev>').replace(/^["']|["']$/g, '').trim(),
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    user: (process.env.SMTP_USER || '').trim(),
    pass: (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim(),
    from: (process.env.EMAIL_FROM || `Cataloza OTP <${process.env.SMTP_USER || 'catalozaofficial@gmail.com'}>`).replace(/^["']|["']$/g, '').trim(),
  },

  superAdmin: {
    email: (process.env.SUPER_ADMIN_EMAIL || 'cpnihal35@gmail.com').toLowerCase().trim(),
    password: process.env.SUPER_ADMIN_INITIAL_PASSWORD || process.env.SUPER_ADMIN_PASSWORD || '',
    name: process.env.SUPER_ADMIN_NAME || 'Platform Super Administrator',
    bootstrapSecret: process.env.SUPER_ADMIN_BOOTSTRAP_SECRET || 'super_bootstrap_secure_token_2026',
  },

  reservedSlugs: [
    'admin',
    'superadmin',
    'login',
    'register',
    'cart',
    'checkout',
    'orders',
    'my-orders',
    'account',
    'profile',
    'api',
    'products',
    'categories',
    'settings',
    'dashboard',
    'auth',
    'forgot-password',
    'reset-password',
    'privacy-policy',
    'terms',
    '404',
    'null',
    'undefined',
    'favicon.ico',
    'assets',
    'public',
    'static',
    'shop',
    'shops'
  ],
};

export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!config.mongoUri) {
    errors.push('MongoDB connection URI is missing. Set MONGODB_URI or MONGO_URI in .env');
  } else if (!config.mongoUri.startsWith('mongodb://') && !config.mongoUri.startsWith('mongodb+srv://')) {
    errors.push(`Invalid MongoDB URI scheme. Must start with 'mongodb://' or 'mongodb+srv://'.`);
  }
  if (!config.jwt.accessSecret) {
    errors.push('JWT_ACCESS_SECRET is required.');
  }
  if (!config.jwt.refreshSecret) {
    errors.push('JWT_REFRESH_SECRET is required.');
  }
  return { valid: errors.length === 0, errors };
};
