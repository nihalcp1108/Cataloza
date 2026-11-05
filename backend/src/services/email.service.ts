import { Resend } from 'resend';
import { config } from '../config';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailDiagnosticResult {
  success: boolean;
  message: string;
  provider: string;
  from?: string;
  missingVariables?: string[];
}

// Backwards-compatible alias for any legacy imports
export type SmtpDiagnosticResult = EmailDiagnosticResult;

export class EmailService {
  private static resendClient: Resend | null = null;

  /**
   * Lazily initializes and returns the Resend client
   */
  private static getResendClient(): Resend {
    if (!this.resendClient) {
      const apiKey = config.resend.apiKey;
      if (!apiKey) {
        throw new Error(
          'Resend API key is not configured. Please set RESEND_API_KEY in your environment variables.'
        );
      }
      this.resendClient = new Resend(apiKey);
    }
    return this.resendClient;
  }

  /**
   * Validate required environment variables at startup.
   * Reports missing variable NAMES without revealing secret values.
   */
  public static validateEnvironment(): { valid: boolean; missingVars: string[] } {
    const missingVars: string[] = [];
    const { apiKey, from } = config.resend;

    if (!apiKey) missingVars.push('RESEND_API_KEY');
    if (!from) missingVars.push('RESEND_FROM_EMAIL');
    if (!config.superAdmin.email) missingVars.push('SUPER_ADMIN_EMAIL');

    return {
      valid: missingVars.length === 0,
      missingVars,
    };
  }

  /**
   * Central email dispatch method using Resend HTTPS API
   * Compatible with Railway Hobby plan (no outbound SMTP port 587/465 required).
   */
  public static async sendEmail(options: EmailOptions): Promise<{ id: string }> {
    const resend = this.getResendClient();
    const fromAddress = config.resend.from || 'Cataloza <onboarding@resend.dev>';
    const sanitizedTo = (options.to || '').toLowerCase().trim();

    if (!sanitizedTo || !sanitizedTo.includes('@')) {
      throw new Error(`Invalid recipient email address: "${options.to}"`);
    }

    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [sanitizedTo],
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      if (error) {
        console.error(`[EmailService] ❌ Resend API delivery failed for ${sanitizedTo}:`, error.message);

        // Handle Resend onboarding sandbox restrictions
        if (
          error.statusCode === 403 &&
          error.message?.includes('You can only send testing emails to your own email address')
        ) {
          throw new Error(
            `Resend sandbox testing restriction: ${error.message} ` +
            `(To deliver emails to general users in production, please verify your custom domain at https://resend.com/domains and set RESEND_FROM_EMAIL).`
          );
        }

        // Handle rate limiting (Free tier: 2 requests/second)
        if (error.statusCode === 429) {
          throw new Error('Resend rate limit exceeded (max 2 requests/sec on free tier). Please retry in a few moments.');
        }

        // Handle invalid API keys or validation errors
        if (error.name === 'validation_error' || error.message?.includes('API key')) {
          throw new Error(`Resend configuration error: ${error.message}`);
        }

        throw new Error(`Email delivery failed: ${error.message}`);
      }

      if (!data?.id) {
        throw new Error('Resend accepted request but did not return a message ID.');
      }

      console.log(`[EmailService] ✅ Email dispatched via Resend HTTPS API to ${sanitizedTo} (MessageId: ${data.id})`);
      return { id: data.id };
    } catch (err: any) {
      if (
        err.message &&
        (err.message.startsWith('Resend') ||
          err.message.startsWith('Email delivery failed') ||
          err.message.startsWith('Invalid recipient'))
      ) {
        throw err;
      }
      console.error(`[EmailService] ❌ Unexpected Resend exception for ${sanitizedTo}:`, err.message);
      throw new Error(`Email delivery failed: ${err.message}`);
    }
  }

  /**
   * Diagnostic connection tester
   * Validates Resend API authentication over HTTPS without sending an email.
   */
  public static async verifyConnection(): Promise<EmailDiagnosticResult> {
    const envValidation = this.validateEnvironment();
    if (!envValidation.valid) {
      return {
        success: false,
        message: `Missing required environment variables: ${envValidation.missingVars.join(', ')}`,
        provider: 'resend',
        from: config.resend.from || 'not set',
        missingVariables: envValidation.missingVars,
      };
    }

    try {
      const resend = this.getResendClient();
      const check = await resend.apiKeys.list();

      // If valid full-access key
      if (!check.error) {
        return {
          success: true,
          message: 'Resend API authenticated successfully over HTTPS (Full Access API Key)',
          provider: 'resend',
          from: config.resend.from,
        };
      }

      // If valid sending-access key (standard/recommended permission)
      if (check.error.name === 'restricted_api_key') {
        return {
          success: true,
          message: 'Resend API authenticated successfully over HTTPS (Sending Access API Key)',
          provider: 'resend',
          from: config.resend.from,
        };
      }

      // Invalid key
      return {
        success: false,
        message: `Resend authentication failed: ${check.error.message}`,
        provider: 'resend',
        from: config.resend.from,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Resend connectivity error: ${err.message}`,
        provider: 'resend',
        from: config.resend.from,
      };
    }
  }

  /**
   * Send Cataloza-branded OTP verification email for account registration and user verification
   */
  public static async sendVerificationOtp(
    email: string,
    name: string,
    otp: string
  ): Promise<void> {
    const sanitizedEmail = email.toLowerCase().trim();
    const displayName = (name || '').trim() || 'there';

    const subject = 'Verify Your Email — Cataloza';

    const text =
      `Welcome to Cataloza!\n\n` +
      `Hello ${displayName},\n\n` +
      `Use the following verification code to complete your account verification:\n\n` +
      `${otp}\n\n` +
      `This verification code will expire in 10 minutes.\n\n` +
      `If you did not request this code, please ignore this email.\n\n` +
      `Cataloza Team`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email — Cataloza</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);">
              <div style="display: inline-block; background-color: #ffffff; color: #2563eb; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; font-weight: 900; font-size: 22px; margin-bottom: 12px;">
                C
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">
                Cataloza
              </h1>
              <p style="margin: 6px 0 0 0; color: #bfdbfe; font-size: 13px;">
                Wholesale E-Commerce Platform
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 18px; font-weight: 700;">
                Welcome to Cataloza!
              </h2>
              <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                Hello <strong>${displayName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                Use the following verification code to complete your account verification:
              </p>

              <!-- OTP Code Display -->
              <div style="background-color: #f8fafc; border: 2px dashed #2563eb; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; color: #1e293b; letter-spacing: 10px; display: inline-block; margin-left: 10px;">
                  ${otp}
                </span>
                <p style="margin: 8px 0 0 0; color: #64748b; font-size: 12px; font-weight: 600;">
                  ⏱ This verification code will expire in 10 minutes.
                </p>
              </div>

              <!-- Notice -->
              <p style="margin: 0 0 24px 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                If you did not request this code, please ignore this email.
              </p>

              <p style="margin: 0; color: #334155; font-size: 14px; font-weight: 600;">
                Cataloza Team
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                © ${new Date().getFullYear()} Cataloza • Automated account security message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    await this.sendEmail({
      to: sanitizedEmail,
      subject,
      text,
      html,
    });
  }

  /**
   * Send Super Admin 2FA OTP code
   */
  public static async sendSuperAdminOtp(email: string, otp: string): Promise<void> {
    const targetEmail = (email || config.superAdmin.email || 'cpnihal35@gmail.com').toLowerCase().trim();
    const subject = '🔐 Super Admin Login Verification Code — Cataloza';

    const text =
      `Cataloza Security Verification\n\n` +
      `Your Super Admin login verification code is: ${otp}\n\n` +
      `This code will expire in 5 minutes.\n` +
      `If you did not initiate this login attempt, please review your account security immediately.\n\n` +
      `— Cataloza Security HQ`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Super Admin Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #334155;">
              <div style="display: inline-block; background-color: #4f46e5; color: #ffffff; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; font-weight: 900; font-size: 20px; margin-bottom: 12px;">
                C
              </div>
              <h1 style="margin: 0; color: #f8fafc; font-size: 20px; font-weight: 800; letter-spacing: -0.025em;">
                Cataloza Security HQ
              </h1>
              <p style="margin: 6px 0 0; color: #94a3b8; font-size: 13px;">
                Super Admin Two-Factor Authentication
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; color: #e2e8f0; font-size: 14px; line-height: 1.6;">
                A sign-in attempt was initiated for the Super Administrator account (<strong>${targetEmail}</strong>).
              </p>
              <p style="margin: 0 0 24px; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                Enter the six-digit verification code below to authorize your session:
              </p>
              <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border: 2px solid #6366f1; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; color: #ffffff; letter-spacing: 12px; display: inline-block; margin-left: 12px;">
                  ${otp}
                </span>
                <p style="margin: 8px 0 0; color: #a5b4fc; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                  Valid for 5 minutes only
                </p>
              </div>
              <div style="background-color: #334155; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 12px 16px; margin-top: 24px;">
                <p style="margin: 0; color: #cbd5e1; font-size: 12px; line-height: 1.5;">
                  <strong style="color: #fbbf24;">Security Notice:</strong> Cataloza administrators will never request this code. Do not share it with anyone.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #0f172a; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0; color: #64748b; font-size: 11px;">
                Cataloza Platform • Multi-Tenant Wholesale Commerce System
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    await this.sendEmail({
      to: targetEmail,
      subject,
      text,
      html,
    });
  }

  /**
   * Send Store Admin (Dealer) 2FA login verification code
   */
  public static async sendAdminOtp(email: string, name: string, otp: string): Promise<void> {
    const targetEmail = (email || '').toLowerCase().trim();
    const displayName = (name || '').trim() || 'Store Administrator';
    const subject = '🔐 Store Admin Login Verification Code — Cataloza';

    const text =
      `Cataloza Store Administrator Verification\n\n` +
      `Hello ${displayName},\n\n` +
      `Your Store Admin login verification code is: ${otp}\n\n` +
      `This code will expire in 5 minutes.\n` +
      `If you did not initiate this sign-in attempt, please review your account security immediately.\n\n` +
      `— Cataloza Security Team`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Login Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #334155;">
              <div style="display: inline-block; background-color: #059669; color: #ffffff; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; font-weight: 900; font-size: 20px; margin-bottom: 12px;">
                C
              </div>
              <h1 style="margin: 0; color: #f8fafc; font-size: 20px; font-weight: 800; letter-spacing: -0.025em;">
                Cataloza Admin Portal
              </h1>
              <p style="margin: 6px 0 0; color: #94a3b8; font-size: 13px;">
                Store Administrator Two-Factor Authentication
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; color: #e2e8f0; font-size: 14px; line-height: 1.6;">
                Hello <strong>${displayName}</strong>,
              </p>
              <p style="margin: 0 0 16px; color: #e2e8f0; font-size: 14px; line-height: 1.6;">
                A sign-in attempt was initiated for your Dealer Administrator account.
              </p>
              <p style="margin: 0 0 24px; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                Enter the six-digit verification code below to authorize your session:
              </p>
              <div style="background: linear-gradient(135deg, #0f172a 0%, #064e3b 100%); border: 2px solid #10b981; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; color: #ffffff; letter-spacing: 12px; display: inline-block; margin-left: 12px;">
                  ${otp}
                </span>
                <p style="margin: 8px 0 0; color: #6ee7b7; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                  Valid for 5 minutes only
                </p>
              </div>
              <div style="background-color: #334155; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 12px 16px; margin-top: 24px;">
                <p style="margin: 0; color: #cbd5e1; font-size: 12px; line-height: 1.5;">
                  <strong style="color: #fbbf24;">Security Notice:</strong> Cataloza administrators will never request this code. Do not share it with anyone.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #0f172a; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0; color: #64748b; font-size: 11px;">
                Cataloza Platform • Multi-Tenant Wholesale Commerce System
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    await this.sendEmail({
      to: targetEmail,
      subject,
      text,
      html,
    });
  }

  /**
   * Send Shop Admin Invitation & Password Setup Link
   */
  public static async sendShopAdminInvitation(
    email: string,
    adminName: string,
    shopName: string,
    inviteUrl: string
  ): Promise<void> {
    const subject = `You've been invited to manage ${shopName} on Cataloza`;

    const text =
      `Hello ${adminName},\n\n` +
      `You have been provisioned as a Shop Administrator for ${shopName} on Cataloza.\n\n` +
      `Click the link below to set your secure password and access your dashboard:\n` +
      `${inviteUrl}\n\n` +
      `This invitation link is valid for 7 days.\n\n` +
      `— Cataloza Platform`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Shop Admin Invitation</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 10px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 500px; background-color:#ffffff; border-radius:12px; border:1px solid #e2e8f0; padding:32px;">
          <tr>
            <td>
              <h2 style="color:#0f172a; margin-top:0;">Welcome to Cataloza</h2>
              <p style="color:#475569; font-size:14px; line-height:1.6;">
                Hello <strong>${adminName}</strong>,<br><br>
                You have been assigned as a Shop Administrator for <strong>${shopName}</strong>.
              </p>
              <div style="text-align:center; margin:32px 0;">
                <a href="${inviteUrl}" style="background-color:#2563eb; color:#ffffff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:14px; display:inline-block;">
                  Set Up Admin Password
                </a>
              </div>
              <p style="color:#94a3b8; font-size:12px;">
                Link expires in 7 days. If the button doesn't work, copy this URL:<br>
                <a href="${inviteUrl}" style="color:#2563eb;">${inviteUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    await this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  /**
   * Send Password Reset Email with link and security token
   */
  public static async sendPasswordResetEmail(
    email: string,
    resetUrl: string,
    resetToken: string
  ): Promise<void> {
    const sanitizedEmail = email.toLowerCase().trim();
    const subject = '🔑 Password Reset Request — Cataloza';

    const text =
      `Cataloza Password Reset Request\n\n` +
      `We received a request to reset your Cataloza password.\n\n` +
      `Click the link below to configure a new password:\n` +
      `${resetUrl}\n\n` +
      `Alternatively, you can manually use your reset token:\n${resetToken}\n\n` +
      `This link will expire in 15 minutes.\n` +
      `If you did not make this request, please ignore this email or review your account security.\n\n` +
      `— Cataloza Platform Security`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #334155;">
              <div style="display: inline-block; background-color: #4f46e5; color: #ffffff; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; font-weight: 900; font-size: 20px; margin-bottom: 12px;">
                C
              </div>
              <h1 style="margin: 0; color: #f8fafc; font-size: 20px; font-weight: 800;">
                Password Reset Request
              </h1>
              <p style="margin: 6px 0 0; color: #94a3b8; font-size: 13px;">
                Cataloza Security Authentication
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; color: #e2e8f0; font-size: 14px; line-height: 1.6;">
                A request was made to reset the password for account <strong>${sanitizedEmail}</strong>.
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${resetUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; display: inline-block;">
                  Reset My Password
                </a>
              </div>
              <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; text-align: center;">
                This link will expire in <strong>15 minutes</strong>.
              </p>
              <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; margin-top: 20px; word-break: break-all;">
                <p style="margin: 0; color: #64748b; font-size: 11px;">
                  If the button does not work, copy and paste this URL into your browser:<br>
                  <a href="${resetUrl}" style="color: #818cf8; text-decoration: underline;">${resetUrl}</a>
                </p>
              </div>
              <p style="margin: 20px 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                If you did not request a password reset, you can safely disregard this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #0f172a; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0; color: #64748b; font-size: 11px;">
                Cataloza Platform • Automated Security Notification
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    await this.sendEmail({
      to: sanitizedEmail,
      subject,
      text,
      html,
    });
  }

  /**
   * Diagnostic test email sent to an explicitly configured recipient
   */
  public static async sendTestEmail(email: string): Promise<{ success: boolean; message: string }> {
    const sanitizedEmail = (email || config.superAdmin.email).toLowerCase().trim();

    if (!sanitizedEmail || !sanitizedEmail.includes('@')) {
      throw new Error(`Invalid test email recipient: ${sanitizedEmail}`);
    }

    const subject = '✅ Cataloza Resend API Delivery Test Successful';
    const text =
      `Cataloza Resend Email Delivery Diagnostic\n\n` +
      `This message confirms that your Resend API integration is authenticating over HTTPS and delivering messages successfully.\n\n` +
      `Recipient: ${sanitizedEmail}\n` +
      `Sender: ${config.resend.from}\n` +
      `Timestamp: ${new Date().toISOString()}\n` +
      `— Cataloza Security HQ`;

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 20px;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; padding: 32px; border-radius: 12px; border: 1px solid #334155;">
    <h2 style="color: #10b981; margin-top: 0;">✅ Resend Delivery Verified</h2>
    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
      This email confirms that Cataloza Resend API integration is functional and delivering messages to <strong>${sanitizedEmail}</strong>.
    </p>
    <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
      Sender Address: <code>${config.resend.from}</code><br>
      Provider: Resend HTTPS API (Port 443)<br>
      Timestamp: ${new Date().toUTCString()}
    </p>
  </div>
</body>
</html>
`;

    const result = await this.sendEmail({
      to: sanitizedEmail,
      subject,
      text,
      html,
    });

    return {
      success: true,
      message: `Test email successfully dispatched to ${sanitizedEmail} (Resend ID: ${result.id})`,
    };
  }
}
