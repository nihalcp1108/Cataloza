import mongoose from 'mongoose';
import { config } from './index';

// Mask connection URI for secure logging
export const getMaskedMongoUri = (uri: string): string => {
  try {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:*****@');
  } catch {
    return 'mongodb+srv://*****:*****@...';
  }
};

export const connectDatabase = async (): Promise<void> => {
  // 1. Reuse existing healthy connection if already active
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // 2. If a connection attempt is already in flight, await it
  if (mongoose.connection.readyState === 2) {
    await new Promise<void>((resolve, reject) => {
      mongoose.connection.once('connected', () => resolve());
      mongoose.connection.once('error', (err) => reject(err));
    });
    return;
  }

  try {
    mongoose.set('strictQuery', true);
    // Disable operation buffering so that queries fail fast if disconnected instead of hanging for 10 seconds
    mongoose.set('bufferCommands', false);

    console.log(`[Database] Connecting to MongoDB (${getMaskedMongoUri(config.mongoUri)})...`);

    await mongoose.connect(config.mongoUri, {
      autoIndex: !config.isProduction,
      serverSelectionTimeoutMS: 5000, // Fail fast (5s) rather than hanging
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 15,
      minPoolSize: 2,
    });

    console.log(`[Database] ✅ Successfully connected to MongoDB: ${mongoose.connection.name}`);
  } catch (error: any) {
    const masked = getMaskedMongoUri(config.mongoUri);
    console.error('============================================================');
    console.error(`[Database] ❌ Critical MongoDB connection failure to ${masked}:`);
    console.error(`           Error Name:    ${error.name}`);
    console.error(`           Error Message: ${error.message}`);

    if (error.message?.includes('bad auth') || error.message?.includes('Authentication failed')) {
      console.error('[Database] 🔑 Cause: Invalid MongoDB Atlas credentials (username or password).');
      console.error('[Database] 👉 Action: Check MONGODB_URI username and password in backend/.env.');
    } else if (
      error.name === 'MongoServerSelectionError' ||
      error.message?.includes('timed out') ||
      error.message?.includes('ECONNREFUSED')
    ) {
      console.error('[Database] 🌐 Cause: Unable to reach MongoDB cluster (Network / IP Access list).');
      console.error('[Database] 👉 Action: Open MongoDB Atlas (https://cloud.mongodb.com) -> Network Access:');
      console.error('[Database]           Ensure 0.0.0.0/0 (Allow Access from Anywhere) or your current IP is added.');
    } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('querySrv')) {
      console.error('[Database] 📡 Cause: DNS resolution failed for MongoDB Atlas cluster hostname.');
      console.error('[Database] 👉 Action: Check your internet connection and DNS settings.');
    }
    console.error('============================================================');

    // Always rethrow the error so server startup fails rather than starting an unusable zombie server
    throw error;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] ⚠️ MongoDB disconnected. Mongoose will attempt to reconnect automatically...');
});

mongoose.connection.on('reconnected', () => {
  console.log('[Database] 🔄 MongoDB reconnected successfully.');
});

mongoose.connection.on('error', (err) => {
  console.error('[Database] ❌ MongoDB runtime error:', err.message);
});

export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
      console.log('[Database] MongoDB connection closed gracefully.');
    }
  } catch (err: any) {
    console.warn('[Database] Error closing MongoDB connection:', err.message);
  }
};

export const isDatabaseConnected = (): boolean => mongoose.connection.readyState === 1;
