// Node.js Examples for Reading Users from MongoDB
// Run this in your auth-service directory or create a standalone script

import mongoose from 'mongoose';
import { User } from './models/User.js'; // Adjust path as needed

// Connection setup
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://admin:password123@localhost:27017/auth-app?authSource=admin');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// 📊 Basic User Queries
const basicQueries = {
  // Get all users (excluding sensitive fields)
  async getAllUsers() {
    try {
      const users = await User.find({}, '-password -verificationToken -resetPasswordToken');
      console.log('📋 All Users:', users);
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  },

  // Count total users
  async countUsers() {
    try {
      const total = await User.countDocuments();
      const verified = await User.countDocuments({ isVerified: true });
      const unverified = await User.countDocuments({ isVerified: false });
      
      console.log('📊 User Statistics:');
      console.log(`Total: ${total}`);
      console.log(`Verified: ${verified}`);
      console.log(`Unverified: ${unverified}`);
      
      return { total, verified, unverified };
    } catch (error) {
      console.error('Error counting users:', error);
    }
  },

  // Find user by email
  async findUserByEmail(email) {
    try {
      const user = await User.findOne({ email }, '-password');
      console.log('👤 User found:', user);
      return user;
    } catch (error) {
      console.error('Error finding user:', error);
    }
  },

  // Find user by ID
  async findUserById(userId) {
    try {
      const user = await User.findById(userId, '-password');
      console.log('👤 User found:', user);
      return user;
    } catch (error) {
      console.error('Error finding user:', error);
    }
  }
};

// 🔍 Advanced User Queries
const advancedQueries = {
  // Get recent users
  async getRecentUsers(hours = 24) {
    try {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      const users = await User.find(
        { createdAt: { $gte: cutoff } },
        '-password'
      ).sort({ createdAt: -1 });
      
      console.log(`📅 Users created in last ${hours} hours:`, users);
      return users;
    } catch (error) {
      console.error('Error fetching recent users:', error);
    }
  },

  // Get users by verification status
  async getUsersByVerificationStatus(isVerified = true) {
    try {
      const users = await User.find({ isVerified }, '-password');
      console.log(`✅ ${isVerified ? 'Verified' : 'Unverified'} users:`, users);
      return users;
    } catch (error) {
      console.error('Error fetching users by verification status:', error);
    }
  },

  // Search users by name
  async searchUsersByName(searchTerm) {
    try {
      const users = await User.find(
        { name: { $regex: searchTerm, $options: 'i' } },
        '-password'
      );
      console.log(`🔍 Users matching "${searchTerm}":`, users);
      return users;
    } catch (error) {
      console.error('Error searching users:', error);
    }
  },

  // Get users with pagination
  async getUsersWithPagination(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const users = await User.find({}, '-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await User.countDocuments();
      const totalPages = Math.ceil(total / limit);
      
      console.log(`📄 Page ${page} of ${totalPages}:`, users);
      return {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching paginated users:', error);
    }
  }
};

// 📈 Analytics Queries
const analyticsQueries = {
  // User registration trends
  async getRegistrationTrends() {
    try {
      const trends = await User.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ]);
      
      console.log('📈 Registration trends:', trends);
      return trends;
    } catch (error) {
      console.error('Error fetching registration trends:', error);
    }
  },

  // Email domain analysis
  async getEmailDomainStats() {
    try {
      const domains = await User.aggregate([
        {
          $project: {
            domain: {
              $arrayElemAt: [
                { $split: ['$email', '@'] },
                1
              ]
            }
          }
        },
        {
          $group: {
            _id: '$domain',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      console.log('📧 Email domain statistics:', domains);
      return domains;
    } catch (error) {
      console.error('Error fetching email domain stats:', error);
    }
  }
};

// 🚀 Example Usage
async function runExamples() {
  await connectDB();
  
  console.log('🔍 Running User Query Examples...\n');
  
  // Basic queries
  await basicQueries.countUsers();
  await basicQueries.getAllUsers();
  
  // Advanced queries
  await advancedQueries.getRecentUsers(24);
  await advancedQueries.getUsersByVerificationStatus(true);
  
  // Analytics
  await analyticsQueries.getRegistrationTrends();
  
  // Close connection
  await mongoose.connection.close();
  console.log('✅ Database connection closed');
}

// Export functions for use in other modules
export {
  connectDB,
  basicQueries,
  advancedQueries,
  analyticsQueries,
  runExamples
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}
