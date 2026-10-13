import mongoose from 'mongoose';
import { config } from './index';

export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);
    
    await mongoose.connect(config.mongoUri, {
      autoIndex: !config.isProduction,
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log(`[Database] Successfully connected to MongoDB: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('[Database] Critical MongoDB connection error:', error);
    console.error('[Database] Hint: Ensure MONGODB_URI is set in Render environment variables and Network Access on MongoDB Atlas includes 0.0.0.0/0 (Allow from anywhere).');
    if (config.isProduction) {
      process.exit(1);
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB disconnected. Attempting reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('[Database] MongoDB runtime error:', err);
});
