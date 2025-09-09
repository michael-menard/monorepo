import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: String, // SHA-256 hash of the reset token (raw token sent via email)
    resetPasswordExpiresAt: Date,
    verificationToken: String, // SHA-256 hash of the verification code (raw code sent via email)  
    verificationTokenExpiresAt: Date,
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
