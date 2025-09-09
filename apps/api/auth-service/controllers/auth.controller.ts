import { Request, Response } from 'express';
import bcryptjs from 'bcryptjs';

import { generateTokenAndSetCookie } from '../utils/generateTokenAndSetCookie';
import {
  sendPasswordResetEmail,
  sendResetSuccessEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from '../email/ethereal.service';
import { User } from '../models/User';
import {
  generateSecureToken,
  generateSecureVerificationCode,
  verifyToken,
  generateCsrfToken,
} from '../utils/tokenUtils';

const ORIGIN = process.env.APP_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173';

export const signup = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  try {
    if (!email || !password || !name) {
      throw new Error('All fields are required');
    }

    const userAlreadyExists = await User.findOne({ email });
    console.log('userAlreadyExists', userAlreadyExists);

    if (userAlreadyExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    
    // Generate secure verification code (6-digit code with hashed storage)
    const { raw: rawVerificationCode, hash: hashedVerificationCode } = generateSecureVerificationCode();

    const user = new User({
      email,
      password: hashedPassword,
      name,
      verificationToken: hashedVerificationCode, // Store the hash, not the raw code
      verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    await user.save();

    // jwt
    generateTokenAndSetCookie(res, user._id);

    // Set CSRF token cookie upon successful signup
    const csrfToken = generateCsrfToken();
    res.cookie('XSRF-TOKEN', csrfToken, {
      maxAge: 7200000, // 2 hours
      httpOnly: false, // Must be accessible to JavaScript for CSRF protection
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });

    // Try to send verification email with raw verification code
    try {
      await sendVerificationEmail(user.email, rawVerificationCode);
    } catch (emailError) {
      console.warn('Failed to send verification email:', emailError);
      // Continue with signup even if email fails
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        ...user.toObject(),
        password: undefined,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as any).message });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { code } = req.body;
  try {
    // Find users with non-expired verification tokens
    const usersWithActiveTokens = await User.find({
      verificationToken: { $exists: true },
      verificationTokenExpiresAt: { $gt: Date.now() },
    });

    // Verify the provided code against each user's stored hash
    let matchingUser = null;
    for (const user of usersWithActiveTokens) {
      if (user.verificationToken && verifyToken(code, user.verificationToken)) {
        matchingUser = user;
        break;
      }
    }

    if (!matchingUser) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid or expired verification code' });
    }

    matchingUser.isVerified = true;
    matchingUser.verificationToken = undefined;
    matchingUser.verificationTokenExpiresAt = undefined;
    await matchingUser.save();

    await sendWelcomeEmail(matchingUser.email, matchingUser.name);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      user: {
        ...matchingUser.toObject(),
        password: undefined,
      },
    });
  } catch (error) {
    console.log('error in verifyEmail ', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }
    if (!user.isVerified) {
      return res
        .status(403)
        .json({ success: false, message: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' });
    }

    generateTokenAndSetCookie(res, user._id);

    // Set CSRF token cookie upon successful login
    const csrfToken = generateCsrfToken();
    res.cookie('XSRF-TOKEN', csrfToken, {
      maxAge: 7200000, // 2 hours
      httpOnly: false, // Must be accessible to JavaScript for CSRF protection
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });

    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      user: {
        ...user.toObject(),
        password: undefined,
      },
    });
  } catch (error) {
    console.log('Error in login ', error);
    res.status(400).json({ success: false, message: (error as any).message, code: 'LOGIN_ERROR' });
  }
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie('token');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    console.log('forgotPassword: Starting with email:', email);
    const user = await User.findOne({ email });

    if (!user) {
      console.log('forgotPassword: User not found');
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    console.log('forgotPassword: User found:', user._id);

    // Generate secure reset token (hash will be stored, raw will be sent via email)
    const { raw: rawToken, hash: hashedToken } = generateSecureToken();
    const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

    console.log('forgotPassword: Generated secure token hash');

    user.resetPasswordToken = hashedToken; // Store the hash, not the raw token
    user.resetPasswordExpiresAt = new Date(resetTokenExpiresAt);

    console.log('forgotPassword: About to save user');
    await user.save();
    console.log('forgotPassword: User saved successfully');

    // send email with raw token
    console.log('forgotPassword: About to send email');
    await sendPasswordResetEmail(user.email, `${ORIGIN}/reset-password/${rawToken}`);
    console.log('forgotPassword: Email sent successfully');

    res.status(200).json({ success: true, message: 'Password reset link sent to your email' });
  } catch (error) {
    console.log('Error in forgotPassword ', error);
    res.status(400).json({ success: false, message: (error as any).message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Find users with non-expired reset tokens
    const usersWithActiveTokens = await User.find({
      resetPasswordToken: { $exists: true },
      resetPasswordExpiresAt: { $gt: Date.now() },
    });

    // Verify the provided token against each user's stored hash
    let matchingUser = null;
    for (const user of usersWithActiveTokens) {
      if (user.resetPasswordToken && verifyToken(token, user.resetPasswordToken)) {
        matchingUser = user;
        break;
      }
    }

    if (!matchingUser) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // update password
    const hashedPassword = await bcryptjs.hash(password, 10);

    matchingUser.password = hashedPassword;
    matchingUser.resetPasswordToken = undefined;
    matchingUser.resetPasswordExpiresAt = undefined;
    await matchingUser.save();

    await sendResetSuccessEmail(matchingUser.email);

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.log('Error in resetPassword ', error);
    res.status(400).json({ success: false, message: (error as any).message });
  }
};

export const checkAuth = async (req: Request, res: Response) => {
  try {
    const user = await User.findById((req as any).userId).select('-password');
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.log('Error in checkAuth ', error);
    res.status(400).json({ success: false, message: (error as any).message });
  }
};

export const resendVerification = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: 'Email is required', code: 'EMAIL_REQUIRED' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found', code: 'USER_NOT_FOUND' });
    }
    if (user.isVerified) {
      return res
        .status(400)
        .json({ success: false, message: 'User already verified', code: 'ALREADY_VERIFIED' });
    }

    // Generate new secure verification code (6-digit code with hashed storage)
    const { raw: rawVerificationCode, hash: hashedVerificationCode } =
      generateSecureVerificationCode();
    user.verificationToken = hashedVerificationCode; // Store the hash, not the raw code
    user.verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Send email with raw verification code
    await sendVerificationEmail(user.email, rawVerificationCode);
    res.status(200).json({ success: true, message: 'Verification email resent' });
  } catch (error) {
    console.log('Error in resendVerification ', error);
    res
      .status(500)
      .json({ success: false, message: (error as any).message, code: 'RESEND_VERIFICATION_ERROR' });
  }
};
