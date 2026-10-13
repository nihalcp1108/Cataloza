import net from 'net';
import tls from 'tls';
import crypto from 'crypto';
import { config } from '../config';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface SmtpDiagnosticResult {
  success: boolean;
  message: string;
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  authenticatedUser: string;
  missingVariables?: string[];
}

// Dynamically detect if nodemailer is available in node_modules
let nodemailerModule: any = null;
try {
  nodemailerModule = require('nodemailer');
} catch {
  nodemailerModule = null;
}

export class EmailService {
  /**
   * Validate required environment variables at startup.
   * Reports missing variable NAMES without revealing their secret values.
   */
  public static validateEnvironment(): { valid: boolean; missingVars: string[] } {
    const missingVars: string[] = [];
    const { host, user, pass } = config.smtp;

    if (!host) missingVars.push('SMTP_HOST');
    if (!user) missingVars.push('SMTP_USER');
    if (!pass) missingVars.push('SMTP_PASS');
    if (!config.superAdmin.email) missingVars.push('SUPER_ADMIN_EMAIL');

    return {
      valid: missingVars.length === 0,
      missingVars,
    };
  }

  /**
   * Dispatches email using either Nodemailer (if available) or the built-in native TLS socket client.
   */
  private static async sendViaSmtp(options: EmailOptions): Promise<void> {
    const { host, port, secure, user, pass, from } = config.smtp;
    const sanitizedUser = (user || '').trim();
    const sanitizedPass = (pass || '').replace(/\s+/g, '');

    if (!host || !sanitizedUser || !sanitizedPass) {
      const missing = [];
      if (!host) missing.push('SMTP_HOST');
      if (!sanitizedUser) missing.push('SMTP_USER');
      if (!sanitizedPass) missing.push('SMTP_PASS');
      throw new Error(`SMTP service is not configured. Missing environment variables: ${missing.join(', ')}`);
    }

    // 1. If nodemailer is installed in the runtime environment, use it as primary
    if (nodemailerModule) {
      try {
        const isSecurePort = secure || port === 465;
        const transporter = nodemailerModule.createTransport({
          host,
          port,
          secure: isSecurePort,
          auth: {
            user: sanitizedUser,
            pass: sanitizedPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });

        // Ensure from contains sanitizedUser as the sender address
        const formattedFrom = from.includes('@') ? from : `Cateloge OTP <${sanitizedUser}>`;

        await transporter.sendMail({
          from: formattedFrom,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });

        return;
      } catch (nodemailerErr: any) {
        console.warn(`[EmailService] Nodemailer dispatch failed (${nodemailerErr.message}), falling back to native TLS socket engine.`);
      }
    }

    // 2. High-performance native Node.js SMTP engine (Port 465 direct SSL & Port 587 STARTTLS)
    return EmailService.sendViaNativeSocket(options, sanitizedUser, sanitizedPass);
  }

  /**
   * Native Node.js SMTP socket client using net/tls
   * Handles Port 465 direct TLS, Port 587 STARTTLS with asynchronous secureConnect, and RFC 5321 formatting.
   */
  private static async sendViaNativeSocket(
    options: EmailOptions,
    sanitizedUser: string,
    sanitizedPass: string
  ): Promise<void> {
    const { host, port, secure, from } = config.smtp;
    const isDirectTls = secure || port === 465;

    return new Promise((resolve, reject) => {
      let isResolvedOrRejected = false;
      const timeoutMs = 20000;

      let currentSocket: net.Socket | tls.TLSSocket;

      const finish = (err?: Error) => {
        if (isResolvedOrRejected) return;
        isResolvedOrRejected = true;
        clearTimeout(timer);
        try {
          if (currentSocket) currentSocket.destroy();
        } catch {}
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      };

      const timer = setTimeout(() => {
        finish(new Error(`SMTP connection timed out after ${timeoutMs / 1000}s while communicating with ${host}:${port}`));
      }, timeoutMs);

      // Establish initial socket
      if (isDirectTls) {
        currentSocket = tls.connect({
          host,
          port,
          rejectUnauthorized: false,
        });
      } else {
        currentSocket = net.connect({
          host,
          port,
        });
      }

      currentSocket.setEncoding('utf8');

      let buffer = '';
      let step = 0; // 0=connect, 1=ehlo, 2=starttls, 10=ehlo_after_tls, 3=auth_login, 4=user, 5=pass, 6=mail_from, 7=rcpt_to, 8=data, 9=data_body, 99=quit

      const sendCommand = (cmd: string) => {
        if (currentSocket && currentSocket.writable) {
          currentSocket.write(cmd + '\r\n');
        }
      };

      const handleResponse = (data: string) => {
        buffer += data;
        const lines = buffer.split('\r\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line) continue;
          const code = parseInt(line.substring(0, 3), 10);
          const isMultiline = line.charAt(3) === '-';
          if (isMultiline) continue;

          // Reject on SMTP negative error responses (4xx / 5xx)
          if (code >= 400) {
            return finish(new Error(`SMTP server rejected command with code ${code}: ${line.substring(4)}`));
          }

          if (step === 0 && code === 220) {
            // Connected to SMTP server
            step = 1;
            sendCommand('EHLO localhost');
          } else if (step === 1 && code === 250) {
            if (!isDirectTls) {
              // Port 587: Upgrade to STARTTLS
              step = 2;
              sendCommand('STARTTLS');
            } else {
              // Direct TLS (Port 465): Proceed directly to AUTH LOGIN
              step = 3;
              sendCommand('AUTH LOGIN');
            }
          } else if (step === 2 && code === 220) {
            // STARTTLS accepted by server: perform TLS handshake on the existing socket
            currentSocket.removeAllListeners('data');
            currentSocket.removeAllListeners('error');
            currentSocket.removeAllListeners('close');

            const tlsSocket = tls.connect({
              socket: currentSocket,
              host,
              rejectUnauthorized: false,
            });

            tlsSocket.setEncoding('utf8');
            tlsSocket.on('data', handleResponse);
            tlsSocket.on('error', (err) => finish(new Error(`TLS negotiation error on ${host}:${port}: ${err.message}`)));
            tlsSocket.on('close', () => {
              if (!isResolvedOrRejected && step !== 99) {
                finish(new Error('SMTP connection closed during TLS session'));
              }
            });

            currentSocket = tlsSocket;

            // CRITICAL FIX: Wait for secureConnect event before sending the secondary EHLO
            tlsSocket.once('secureConnect', () => {
              step = 10;
              sendCommand('EHLO localhost');
            });
          } else if (step === 10 && code === 250) {
            // Post-TLS EHLO acknowledged, proceed to AUTH LOGIN
            step = 3;
            sendCommand('AUTH LOGIN');
          } else if (step === 3 && code === 334) {
            // Username prompt
            step = 4;
            sendCommand(Buffer.from(sanitizedUser).toString('base64'));
          } else if (step === 4 && code === 334) {
            // Password prompt
            step = 5;
            sendCommand(Buffer.from(sanitizedPass).toString('base64'));
          } else if (step === 5 && code === 235) {
            // Authentication successful! Use sanitizedUser as envelope MAIL FROM to satisfy Gmail policy
            step = 6;
            sendCommand(`MAIL FROM:<${sanitizedUser}>`);
          } else if (step === 6 && code === 250) {
            step = 7;
            sendCommand(`RCPT TO:<${options.to}>`);
          } else if (step === 7 && code === 250) {
            step = 8;
            sendCommand('DATA');
          } else if (step === 8 && code === 354) {
            step = 9;
            const boundary = `====_Cateloge_${crypto.randomBytes(16).toString('hex')}_====`;
            const messageId = `<${Date.now()}.${crypto.randomBytes(8).toString('hex')}@cateloge.com>`;
            const dateStr = new Date().toUTCString();
            const formattedFrom = from.includes('@') ? from : `Cateloge OTP <${sanitizedUser}>`;

            const rawMessage = [
              `From: ${formattedFrom}`,
              `To: ${options.to}`,
              `Subject: ${options.subject}`,
              `Date: ${dateStr}`,
              `Message-ID: ${messageId}`,
              `MIME-Version: 1.0`,
              `Content-Type: multipart/alternative; boundary="${boundary}"`,
              '',
              `--${boundary}`,
              `Content-Type: text/plain; charset=UTF-8`,
              `Content-Transfer-Encoding: 7bit`,
              '',
              options.text,
              '',
              `--${boundary}`,
              `Content-Type: text/html; charset=UTF-8`,
              `Content-Transfer-Encoding: 7bit`,
              '',
              options.html,
              '',
              `--${boundary}--`,
              '.',
            ].join('\r\n');

            currentSocket.write(rawMessage + '\r\n');
          } else if (step === 9 && code === 250) {
            // Email accepted by provider for delivery!
            step = 99;
            sendCommand('QUIT');
            finish();
          }
        }
      };

      currentSocket.on('data', handleResponse);
      currentSocket.on('error', (err) => finish(new Error(`SMTP socket error on ${host}:${port}: ${err.message}`)));
      currentSocket.on('close', () => {
        if (!isResolvedOrRejected && step !== 99) {
          finish(new Error('SMTP connection closed prematurely by server before delivery was confirmed'));
        }
      });
    });
  }

  /**
   * Diagnostic connection tester
   * Actually connects and authenticates with the configured SMTP server without sending an email.
   * Reports sanitized information without revealing secret passwords or OTPs.
   */
  public static async verifyConnection(): Promise<SmtpDiagnosticResult> {
    const { host, port, secure, user, pass } = config.smtp;
    const sanitizedUser = (user || '').trim();
    const sanitizedPass = (pass || '').replace(/\s+/g, '');

    const envValidation = this.validateEnvironment();
    if (!envValidation.valid) {
      return {
        success: false,
        message: `Missing required environment variables: ${envValidation.missingVars.join(', ')}`,
        provider: 'smtp',
        host: host || 'not set',
        port,
        secure: Boolean(secure),
        authenticatedUser: sanitizedUser || 'not set',
        missingVariables: envValidation.missingVars,
      };
    }

    // Try Nodemailer verify if available
    if (nodemailerModule) {
      try {
        const isSecurePort = secure || port === 465;
        const transporter = nodemailerModule.createTransport({
          host,
          port,
          secure: isSecurePort,
          auth: {
            user: sanitizedUser,
            pass: sanitizedPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });

        await transporter.verify();
        return {
          success: true,
          message: `SMTP connection and authentication verified via Nodemailer (${host}:${port})`,
          provider: 'nodemailer',
          host,
          port,
          secure: isSecurePort,
          authenticatedUser: sanitizedUser,
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Nodemailer verification failed: ${err.message}`,
          provider: 'nodemailer',
          host,
          port,
          secure: Boolean(secure),
          authenticatedUser: sanitizedUser,
        };
      }
    }

    // Native Socket Authentication Verification (connect, EHLO, STARTTLS, AUTH LOGIN, check 235, QUIT)
    return new Promise((resolve) => {
      const isDirectTls = secure || port === 465;
      let currentSocket: net.Socket | tls.TLSSocket;
      let completed = false;

      const finishDiag = (success: boolean, message: string) => {
        if (completed) return;
        completed = true;
        clearTimeout(diagTimer);
        try {
          if (currentSocket) {
            currentSocket.write('QUIT\r\n');
            currentSocket.destroy();
          }
        } catch {}
        resolve({
          success,
          message,
          provider: isDirectTls ? 'native_direct_tls' : 'native_starttls',
          host,
          port,
          secure: isDirectTls,
          authenticatedUser: sanitizedUser,
        });
      };

      const diagTimer = setTimeout(() => {
        finishDiag(false, `SMTP verification timed out after 15s communicating with ${host}:${port}`);
      }, 15000);

      try {
        if (isDirectTls) {
          currentSocket = tls.connect({ host, port, rejectUnauthorized: false });
        } else {
          currentSocket = net.connect({ host, port });
        }
      } catch (err: any) {
        return finishDiag(false, `Socket connection failed: ${err.message}`);
      }

      currentSocket.setEncoding('utf8');
      let step = 0;
      let buffer = '';

      const sendCmd = (cmd: string) => {
        if (currentSocket && currentSocket.writable) currentSocket.write(cmd + '\r\n');
      };

      const onData = (data: string) => {
        buffer += data;
        const lines = buffer.split('\r\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line) continue;
          const code = parseInt(line.substring(0, 3), 10);
          if (line.charAt(3) === '-') continue;

          if (code >= 400) {
            return finishDiag(false, `SMTP server rejected command: ${line.substring(4)}`);
          }

          if (step === 0 && code === 220) {
            step = 1;
            sendCmd('EHLO localhost');
          } else if (step === 1 && code === 250) {
            if (!isDirectTls) {
              step = 2;
              sendCmd('STARTTLS');
            } else {
              step = 3;
              sendCmd('AUTH LOGIN');
            }
          } else if (step === 2 && code === 220) {
            currentSocket.removeAllListeners('data');
            currentSocket.removeAllListeners('error');
            const tlsSocket = tls.connect({ socket: currentSocket, host, rejectUnauthorized: false });
            tlsSocket.setEncoding('utf8');
            tlsSocket.on('data', onData);
            tlsSocket.on('error', (err) => finishDiag(false, `TLS negotiation failed: ${err.message}`));
            currentSocket = tlsSocket;

            tlsSocket.once('secureConnect', () => {
              step = 10;
              sendCmd('EHLO localhost');
            });
          } else if (step === 10 && code === 250) {
            step = 3;
            sendCmd('AUTH LOGIN');
          } else if (step === 3 && code === 334) {
            step = 4;
            sendCmd(Buffer.from(sanitizedUser).toString('base64'));
          } else if (step === 4 && code === 334) {
            step = 5;
            sendCmd(Buffer.from(sanitizedPass).toString('base64'));
          } else if (step === 5 && code === 235) {
            finishDiag(true, `SMTP authentication accepted by ${host}:${port} for ${sanitizedUser}`);
          }
        }
      };

      currentSocket.on('data', onData);
      currentSocket.on('error', (err) => finishDiag(false, `Socket communication error: ${err.message}`));
      currentSocket.on('close', () => {
        if (!completed) finishDiag(false, 'Connection closed by server during verification');
      });
    });
  }

  /**
   * Send Super Admin OTP exclusively to the verified Super Admin email
   */
  public static async sendSuperAdminOtp(email: string, otp: string): Promise<void> {
    const targetEmail = 'cpnihal35@gmail.com';
    const sanitizedEmail = email.toLowerCase().trim();

    if (sanitizedEmail !== targetEmail) {
      throw new Error(`Unauthorized recipient. Super Admin OTP can only be dispatched to ${targetEmail}`);
    }

    const subject = '🔐 Super Admin Login Verification Code — Cateloge';

    const text = `Cateloge Security Verification\n\n` +
      `Your Super Admin login verification code is: ${otp}\n\n` +
      `This code will expire in 5 minutes.\n` +
      `If you did not initiate this login attempt, please change your Super Admin credentials immediately.\n\n` +
      `— Cateloge Security HQ`;

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
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #334155;">
              <div style="display: inline-block; background-color: #4f46e5; color: #ffffff; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; font-weight: 900; font-size: 20px; margin-bottom: 12px;">
                C
              </div>
              <h1 style="margin: 0; color: #f8fafc; font-size: 20px; font-weight: 800; letter-spacing: -0.025em;">
                Cateloge Security HQ
              </h1>
              <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">
                Super Admin Two-Factor Authentication
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; color: #e2e8f0; font-size: 14px; line-height: 1.6;">
                A sign-in attempt was initiated for the Super Administrator account (<strong>${targetEmail}</strong>).
              </p>
              <p style="margin: 0 0 24px 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                Enter the six-digit verification code below to authorize your session:
              </p>

              <!-- OTP Code Display -->
              <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border: 2px solid #6366f1; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; color: #ffffff; letter-spacing: 12px; display: inline-block; margin-left: 12px;">
                  ${otp}
                </span>
                <p style="margin: 8px 0 0 0; color: #a5b4fc; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                  Valid for 5 minutes only
                </p>
              </div>

              <!-- Security notice -->
              <div style="background-color: #334155; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 12px 16px; margin-top: 24px;">
                <p style="margin: 0; color: #cbd5e1; font-size: 12px; line-height: 1.5;">
                  <strong style="color: #fbbf24;">Security Notice:</strong> Cateloge administrators will never request this code. Do not share it with anyone.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0f172a; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0; color: #64748b; font-size: 11px;">
                Cateloge B2B SaaS Platform • Multi-Tenant Wholesale Commerce System
              </p>
              <p style="margin: 4px 0 0 0; color: #475569; font-size: 10px;">
                This automated security notification was sent to authorized Super Admin ${targetEmail}.
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

    await this.sendViaSmtp({
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
    const subject = `You've been invited to manage ${shopName} on Cateloge`;

    const text = `Hello ${adminName},\n\n` +
      `You have been provisioned as a Shop Administrator for ${shopName} on Cateloge.\n\n` +
      `Click the link below to set your secure password and access your dashboard:\n` +
      `${inviteUrl}\n\n` +
      `This invitation link is valid for 7 days.\n\n` +
      `— Cateloge Platform`;

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
              <h2 style="color:#0f172a; margin-top:0;">Welcome to Cateloge</h2>
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

    await this.sendViaSmtp({
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

    if (sanitizedEmail === 'cpnihal35@gmail.com' && email.toLowerCase().trim() !== 'cpnihal35@gmail.com') {
      throw new Error('Super Admin password reset can only be delivered to cpnihal35@gmail.com');
    }

    const subject = '🔑 Password Reset Request — Cateloge';

    const text = `Cateloge Password Reset Request\n\n` +
      `We received a request to reset your Cateloge password.\n\n` +
      `Click the link below to configure a new password:\n` +
      `${resetUrl}\n\n` +
      `Alternatively, you can manually use your reset token:\n${resetToken}\n\n` +
      `This link will expire in 15 minutes.\n` +
      `If you did not make this request, please ignore this email or review your account security.\n\n` +
      `— Cateloge Platform Security`;

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
                Cateloge Security Authentication
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
                Cateloge B2B SaaS Platform • Automated Security Notification
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

    await this.sendViaSmtp({
      to: sanitizedEmail,
      subject,
      text,
      html,
    });
  }

  /**
   * Diagnostic test email exclusively sent to the authorized Super Admin
   */
  public static async sendTestEmail(email: string): Promise<{ success: boolean; message: string }> {
    const targetEmail = 'cpnihal35@gmail.com';
    const sanitizedEmail = email.toLowerCase().trim();

    if (sanitizedEmail !== targetEmail) {
      throw new Error(`Unauthorized test recipient. Test emails can only be dispatched to ${targetEmail}`);
    }

    const subject = '✅ Cateloge SMTP Delivery Test Successful';
    const text = `Cateloge SMTP Delivery Diagnostic\n\n` +
      `This message confirms that your SMTP provider configuration is accepting and delivering messages successfully.\n\n` +
      `Timestamp: ${new Date().toISOString()}\n` +
      `— Cateloge Security HQ`;

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 20px;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; padding: 32px; border-radius: 12px; border: 1px solid #334155;">
    <h2 style="color: #10b981; margin-top: 0;">✅ SMTP Delivery Verified</h2>
    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
      This email confirms that Cateloge SMTP integration is functional and delivering messages to <strong>${targetEmail}</strong>.
    </p>
    <p style="font-size: 12px; color: #64748b;">
      Timestamp: ${new Date().toUTCString()}
    </p>
  </div>
</body>
</html>
`;

    await this.sendViaSmtp({
      to: targetEmail,
      subject,
      text,
      html,
    });

    return {
      success: true,
      message: `Test email successfully accepted and dispatched to ${targetEmail}`,
    };
  }
}
