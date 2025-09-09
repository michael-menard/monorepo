import mongoose from 'mongoose';
import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

// Create a logger for this module
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export const connectDB = async (): Promise<void> => {
  const isProd = process.env.NODE_ENV === 'production';
  const uri = process.env.MONGO_URI || (!isProd ? 'mongodb://localhost:27017/auth-app' : '');

  if (!uri) {
    throw new Error('MONGO_URI is required in production');
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('MongoDB Connected');
  } catch (error) {
    logger.error({ error }, 'MongoDB connection error');
    if (isProd) {
      // In production, fail fast to avoid running the API without a database
      throw error;
    } else {
      // In development/test, allow server to start without DB
      logger.warn(
        'Starting without database connection (development/test mode). Some features may not work.',
      );
    }
  }
};
