import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.MONGO_URI) {
      console.warn(
        'MONGO_URI is not defined in environment variables, using default local connection with auth',
      );
      // Use a default local connection with authentication
      await mongoose.connect(
        'mongodb://admin:password123@localhost:27017/auth-app?authSource=admin',
        {
          serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        },
      );
      console.log('MongoDB Connected to default database');
      return;
    }

    await mongoose.connect(process.env.MONGO_URI, {
      // Connection options
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });

    console.log('MongoDB Connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.warn('Continuing without database connection. Some features may not work.');
    // Don't exit the process, allow server to start without DB
  }
};
