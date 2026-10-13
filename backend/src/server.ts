import app from './app';
import { config } from './config';
import { connectDatabase } from './config/database';
import { AuthService } from './services/auth.service';
import { EmailService } from './services/email.service';

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Validate required SMTP & administrative environment variables at startup
    const envCheck = EmailService.validateEnvironment();
    if (!envCheck.valid) {
      console.warn(
        `[Startup] ⚠️ Missing recommended email configuration: ${envCheck.missingVars.join(', ')}`
      );
    } else {
      console.log(
        `[Startup] ✅ Email environment validated: ${config.smtp.host}:${config.smtp.port} (${config.smtp.user})`
      );
    }

    // Idempotent Super Admin initialization (preserves existing credentials across reboots)
    try {
      const bootstrapResult = await AuthService.bootstrapSuperAdmin({ forceReset: false });
      console.log(`[Security] ${bootstrapResult.message}`);
    } catch (bootstrapErr: any) {
      console.warn(`[Security] Super Admin bootstrap warning: ${bootstrapErr.message}`);
    }

    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log('============================================================');
      console.log(`🚀 WholesaleFlow Server started on port ${config.port} (0.0.0.0)`);
      console.log(`📡 Environment: ${config.env}`);
      console.log(`🔗 API Base: ${config.apiBaseUrl}`);
      console.log('============================================================');
    });

    // Graceful shutdown handling
    const shutdown = (): void => {
      console.log('\n[Server] Gracefully shutting down...');
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('[Server] Critical startup error:', error);
    process.exit(1);
  }
};

startServer();
