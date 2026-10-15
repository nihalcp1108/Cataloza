import app from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/database';
import { AuthService } from './services/auth.service';
import { EmailService } from './services/email.service';
import {
  probeCatalozaHealth,
  getProcessListeningOnPort,
  terminateStaleCataloza,
  waitForPortRelease,
} from './utils/processGuard';

let isShuttingDown = false;

const startServer = async (): Promise<void> => {
  try {
    // Phase 3: In local development, check if the configured port is already occupied
    if (config.env !== 'production') {
      const probe = await probeCatalozaHealth(config.port, 1000);
      if (probe.isRunning && probe.isHealthy) {
        console.log('============================================================');
        console.log(`[Server] ℹ️ Cataloza backend is already running and healthy on port ${config.port}.`);
        console.log(`[Server] 🔗 Reusing running instance: ${config.apiBaseUrl}`);
        console.log(`[Server] 📡 Health status: healthy (uptime: ${Math.round(probe.details?.uptime || 0)}s)`);
        console.log('============================================================');
        process.exit(0);
      }

      // If port is listening but not healthy, inspect the process
      const proc = await getProcessListeningOnPort(config.port);
      if (proc) {
        if (!proc.isCataloza) {
          console.error('============================================================');
          console.error(`[Server] ❌ Port ${config.port} is occupied by an unrelated application:`);
          console.error(`         Process ID:   ${proc.pid}`);
          console.error(`         Process Name: ${proc.name}`);
          if (proc.commandLine) {
            console.error(`         CommandLine:  ${proc.commandLine.slice(0, 120)}`);
          }
          console.error(`[Server] Cataloza will NEVER terminate unrelated applications.`);
          console.error(`[Server] Please free port ${config.port} or configure a different PORT in .env.`);
          console.error('============================================================');
          process.exit(1);
        } else {
          console.warn(`[Server] ⚠️ Stale Cataloza process detected on port ${config.port} (PID: ${proc.pid}).`);
          console.warn(`[Server] Gracefully terminating stale process ${proc.pid}...`);
          await terminateStaleCataloza(proc.pid);
          const released = await waitForPortRelease(config.port, 3000);
          if (!released) {
            console.error(`[Server] ❌ Failed to release port ${config.port} within timeout.`);
            process.exit(1);
          }
          console.log(`[Server] ✅ Port ${config.port} released successfully.`);
        }
      }
    }

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

    // Idempotent Super Admin initialization
    try {
      const bootstrapResult = await AuthService.bootstrapSuperAdmin({ forceReset: false });
      console.log(`[Security] ${bootstrapResult.message}`);
    } catch (bootstrapErr: any) {
      console.warn(`[Security] Super Admin bootstrap warning: ${bootstrapErr.message}`);
    }

    // Start HTTP server
    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log('============================================================');
      console.log(`🚀 WholesaleFlow Server started on port ${config.port} (0.0.0.0)`);
      console.log(`📡 Environment: ${config.env}`);
      console.log(`🔗 API Base: ${config.apiBaseUrl}`);
      console.log('============================================================');
    });

    // Handle listen errors safely
    server.on('error', async (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error('============================================================');
        console.error(`[Server] ❌ Port ${config.port} is already in use (EADDRINUSE).`);
        console.error(`[Server] An existing instance of Cataloza backend or another service is running.`);
        console.error('============================================================');
        await disconnectDatabase();
        process.exit(1);
      } else if (err.code === 'EACCES') {
        console.error(`[Server] ❌ Insufficient privileges to bind to port ${config.port} (EACCES).`);
        await disconnectDatabase();
        process.exit(1);
      } else {
        console.error('[Server] HTTP server encountered an unexpected error:', err);
        await disconnectDatabase();
        process.exit(1);
      }
    });

    // Graceful shutdown handling
    const handleShutdown = (signal: string) => async (): Promise<void> => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);

      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        await disconnectDatabase();
        process.exit(0);
      });

      setTimeout(() => {
        console.warn('[Server] Forcing shutdown after timeout.');
        process.exit(0);
      }, 4000).unref();
    };

    process.once('SIGTERM', handleShutdown('SIGTERM'));
    process.once('SIGINT', handleShutdown('SIGINT'));
  } catch (error) {
    console.error('[Server] Critical startup error:', error);
    await disconnectDatabase();
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Promise Rejection:', reason);
});

startServer();
