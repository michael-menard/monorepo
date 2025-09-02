import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

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
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    if (isProd) {
      // In production, fail fast to avoid running the API without a database
      throw error;
    } else {
      // In development/test, allow server to start without DB
      console.warn(
        'Starting without database connection (development/test mode). Some features may not work.',
      );
    }
  }
};
