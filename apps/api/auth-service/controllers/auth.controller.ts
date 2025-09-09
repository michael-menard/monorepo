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
import {
  logAuthEvent,
  logSecurityEvent,
  logUserAction,
  logAuthError,
  logDatabaseOperation,
  logEmailEvent,
  logValidationError,
  sanitizeUserForLogging,
} from '../utils/logger';
import {
  ValidationError,
  ConflictError,
  AuthenticationError,
  NotFoundError,
  EmailNotVerifiedError,
  AlreadyVerifiedError,
  TokenExpiredError,
  EmailSendError,
  AuthorizationError,
} from '../types/errors';

const ORIGIN = process.env.APP_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173';

export const signup = async (req: Request, res: Response, next: any) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    logValidationError(req as any, 'required_fields', 'All fields are required', {
      missingFields: { email: !email, password: !password, name: !name },
    });
    throw new ValidationError('All fields are required', {
      missingFields: { email: !email, password: !password, name: !name },
    });
  }

  logDatabaseOperation(req as any, 'findOne', 'users', { lookupField: 'email' });
  const userAlreadyExists = await User.findOne({ email });

  if (userAlreadyExists) {
    logSecurityEvent(req as any, 'signup_attempt_duplicate_email', { email });
    throw new ConflictError('User already exists');
  }

  logUserAction(req as any, 'password_hash_start', { email });
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

  logDatabaseOperation(req as any, 'create', 'users', { email });
  await user.save();

  // Set user context for subsequent logs
  (req as any).userId = user._id;

  logUserAction(req as any, 'jwt_token_generation', { userId: user._id });
  generateTokenAndSetCookie(res, user._id);

  // Set CSRF token cookie upon successful signup
  const csrfToken = generateCsrfToken();
  res.cookie('XSRF-TOKEN', csrfToken, {
    maxAge: 7200000, // 2 hours
    httpOnly: false, // Must be accessible to JavaScript for CSRF protection
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });

  logUserAction(req as any, 'csrf_token_set', { userId: user._id });

  // Try to send verification email with raw verification code
  try {
    await sendVerificationEmail(user.email, rawVerificationCode);
    logEmailEvent(req as any, 'verification', user.email, true, { userId: user._id });
  } catch (emailError) {
    logEmailEvent(req as any, 'verification', user.email, false, { 
      userId: user._id,
      error: emailError instanceof Error ? emailError.message : String(emailError),
    });
    // Continue with signup even if email fails - don't throw here since signup was successful
  }

  logUserAction(req as any, 'signup_completed', { 
    userId: user._id,
    email: user.email,
    isVerified: user.isVerified,
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    user: {
      ...user.toObject(),
      password: undefined,
    },
  });
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    logValidationError(req as any, 'verification_code', 'Verification code is required');
    throw new ValidationError('Verification code is required');
  }

  logDatabaseOperation(req as any, 'find', 'users', { query: 'active_verification_tokens' });
  // Find users with non-expired verification tokens
  const usersWithActiveTokens = await User.find({
    verificationToken: { $exists: true },
    verificationTokenExpiresAt: { $gt: Date.now() },
  });

  logUserAction(req as any, 'verification_code_attempt', {
    providedCodeLength: code.length,
    activeTokensCount: usersWithActiveTokens.length,
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
    logSecurityEvent(req as any, 'verification_code_invalid', {
      providedCodeLength: code.length,
      activeTokensChecked: usersWithActiveTokens.length,
    });
    throw new TokenExpiredError('Invalid or expired verification code');
  }

  // Set user context for subsequent logs
  (req as any).userId = matchingUser._id;

  logDatabaseOperation(req as any, 'update', 'users', { userId: matchingUser._id });
  matchingUser.isVerified = true;
  matchingUser.verificationToken = undefined;
  matchingUser.verificationTokenExpiresAt = undefined;
  await matchingUser.save();

  try {
    await sendWelcomeEmail(matchingUser.email, matchingUser.name);
    logEmailEvent(req as any, 'welcome', matchingUser.email, true, { userId: matchingUser._id });
  } catch (emailError) {
    logEmailEvent(req as any, 'welcome', matchingUser.email, false, {
      userId: matchingUser._id,
      error: emailError instanceof Error ? emailError.message : String(emailError),
    });
    // Continue even if email fails - verification was successful
  }

  logUserAction(req as any, 'email_verified_successfully', {
    userId: matchingUser._id,
    email: matchingUser.email,
  });

  res.status(200).json({
    success: true,
    message: 'Email verified successfully',
    user: {
      ...matchingUser.toObject(),
      password: undefined,
    },
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    logValidationError(req as any, 'login_credentials', 'Email and password are required', {
      missingFields: { email: !email, password: !password },
    });
    throw new ValidationError('Email and password are required', {
      missingFields: { email: !email, password: !password },
    });
  }

  logDatabaseOperation(req as any, 'findOne', 'users', { lookupField: 'email' });
  const user = await User.findOne({ email });

  if (!user) {
    logSecurityEvent(req as any, 'login_attempt_user_not_found', { email });
    throw new AuthenticationError('Invalid credentials');
  }

  // Set user context for subsequent logs
  (req as any).userId = user._id;

  logUserAction(req as any, 'password_verification_attempt', { userId: user._id });
  const isPasswordValid = await bcryptjs.compare(password, user.password);

  if (!isPasswordValid) {
    logSecurityEvent(req as any, 'login_attempt_invalid_password', {
      userId: user._id,
      email,
    });
    throw new AuthenticationError('Invalid credentials');
  }

  if (!user.isVerified) {
    logSecurityEvent(req as any, 'login_attempt_unverified_email', {
      userId: user._id,
      email,
    });
    throw new EmailNotVerifiedError('Email not verified');
  }

  logUserAction(req as any, 'jwt_token_generation', { userId: user._id });
  generateTokenAndSetCookie(res, user._id);

  // Set CSRF token cookie upon successful login
  const csrfToken = generateCsrfToken();
  res.cookie('XSRF-TOKEN', csrfToken, {
    maxAge: 7200000, // 2 hours
    httpOnly: false, // Must be accessible to JavaScript for CSRF protection
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });

  logUserAction(req as any, 'csrf_token_set', { userId: user._id });

  logDatabaseOperation(req as any, 'update', 'users', { userId: user._id });
  user.lastLogin = new Date();
  await user.save();

  logUserAction(req as any, 'login_successful', {
    userId: user._id,
    email: user.email,
    lastLogin: user.lastLogin,
  });

  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    user: {
      ...user.toObject(),
      password: undefined,
    },
  });
};

export const logout = async (req: Request, res: Response) => {
  logUserAction(req as any, 'logout_initiated', {
    userId: (req as any).userId,
  });

  res.clearCookie('token');
  res.clearCookie('XSRF-TOKEN');

  logUserAction(req as any, 'logout_successful', {
    userId: (req as any).userId,
  });

  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    logValidationError(req as any, 'email', 'Email is required for password reset');
    throw new ValidationError('Email is required');
  }

  logUserAction(req as any, 'forgot_password_initiated', { email });
  logDatabaseOperation(req as any, 'findOne', 'users', { lookupField: 'email' });
  const user = await User.findOne({ email });

  if (!user) {
    logSecurityEvent(req as any, 'forgot_password_user_not_found', { email });
    throw new NotFoundError('User not found');
  }

  // Set user context for subsequent logs
  (req as any).userId = user._id;

  logUserAction(req as any, 'reset_token_generation_start', { userId: user._id });

  // Generate secure reset token (hash will be stored, raw will be sent via email)
  const { raw: rawToken, hash: hashedToken } = generateSecureToken();
  const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

  logUserAction(req as any, 'reset_token_generated', {
    userId: user._id,
    tokenExpiresIn: '1 hour',
  });

  user.resetPasswordToken = hashedToken; // Store the hash, not the raw token
  user.resetPasswordExpiresAt = new Date(resetTokenExpiresAt);

  logDatabaseOperation(req as any, 'update', 'users', { userId: user._id });
  await user.save();

  // send email with raw token
  try {
    await sendPasswordResetEmail(user.email, `${ORIGIN}/reset-password/${rawToken}`);
    logEmailEvent(req as any, 'password_reset', user.email, true, { userId: user._id });
  } catch (emailError) {
    logEmailEvent(req as any, 'password_reset', user.email, false, {
      userId: user._id,
      error: emailError instanceof Error ? emailError.message : String(emailError),
    });
    throw new EmailSendError('Failed to send password reset email');
  }

  logUserAction(req as any, 'forgot_password_completed', { userId: user._id });

  res.status(200).json({ success: true, message: 'Password reset link sent to your email' });
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token || !password) {
    logValidationError(req as any, 'reset_password_fields', 'Token and password are required', {
      missingFields: { token: !token, password: !password },
    });
    throw new ValidationError('Token and password are required', {
      missingFields: { token: !token, password: !password },
    });
  }

  logUserAction(req as any, 'password_reset_attempt', { tokenProvided: !!token });
  logDatabaseOperation(req as any, 'find', 'users', { query: 'active_reset_tokens' });

  // Find users with non-expired reset tokens
  const usersWithActiveTokens = await User.find({
    resetPasswordToken: { $exists: true },
    resetPasswordExpiresAt: { $gt: Date.now() },
  });

  logUserAction(req as any, 'reset_token_verification', {
    activeTokensCount: usersWithActiveTokens.length,
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
    logSecurityEvent(req as any, 'reset_token_invalid', {
      activeTokensChecked: usersWithActiveTokens.length,
    });
    throw new TokenExpiredError('Invalid or expired reset token');
  }

  // Set user context for subsequent logs
  (req as any).userId = matchingUser._id;

  logUserAction(req as any, 'password_hash_for_reset', { userId: matchingUser._id });
  // update password
  const hashedPassword = await bcryptjs.hash(password, 10);

  matchingUser.password = hashedPassword;
  matchingUser.resetPasswordToken = undefined;
  matchingUser.resetPasswordExpiresAt = undefined;

  logDatabaseOperation(req as any, 'update', 'users', { userId: matchingUser._id });
  await matchingUser.save();

  try {
    await sendResetSuccessEmail(matchingUser.email);
    logEmailEvent(req as any, 'password_reset_success', matchingUser.email, true, {
      userId: matchingUser._id,
    });
  } catch (emailError) {
    logEmailEvent(req as any, 'password_reset_success', matchingUser.email, false, {
      userId: matchingUser._id,
      error: emailError instanceof Error ? emailError.message : String(emailError),
    });
    // Continue even if email fails - password reset was successful
  }

  logUserAction(req as any, 'password_reset_completed', { userId: matchingUser._id });

  res.status(200).json({ success: true, message: 'Password reset successful' });
};

export const checkAuth = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    logSecurityEvent(req as any, 'check_auth_no_user_id', {});
    throw new AuthorizationError('No user ID in request');
  }

  logDatabaseOperation(req as any, 'findById', 'users', { userId });
  const user = await User.findById(userId).select('-password');

  if (!user) {
    logSecurityEvent(req as any, 'check_auth_user_not_found', { userId });
    throw new NotFoundError('User not found');
  }

  logUserAction(req as any, 'auth_check_successful', {
    userId: user._id,
    email: user.email,
    isVerified: user.isVerified,
  });

  res.status(200).json({ success: true, user });
};

export const resendVerification = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    logValidationError(req as any, 'email', 'Email is required for resending verification');
    throw new ValidationError('Email is required');
  }

  logUserAction(req as any, 'resend_verification_initiated', { email });
  logDatabaseOperation(req as any, 'findOne', 'users', { lookupField: 'email' });
  const user = await User.findOne({ email });

  if (!user) {
    logSecurityEvent(req as any, 'resend_verification_user_not_found', { email });
    throw new NotFoundError('User not found');
  }

  // Set user context for subsequent logs
  (req as any).userId = user._id;

  if (user.isVerified) {
    logSecurityEvent(req as any, 'resend_verification_already_verified', {
      userId: user._id,
      email,
    });
    throw new AlreadyVerifiedError('User already verified');
  }

  logUserAction(req as any, 'new_verification_code_generation', { userId: user._id });

  // Generate new secure verification code (6-digit code with hashed storage)
  const { raw: rawVerificationCode, hash: hashedVerificationCode } =
    generateSecureVerificationCode();
  user.verificationToken = hashedVerificationCode; // Store the hash, not the raw code
  user.verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  logDatabaseOperation(req as any, 'update', 'users', { userId: user._id });
  await user.save();

  try {
    // Send email with raw verification code
    await sendVerificationEmail(user.email, rawVerificationCode);
    logEmailEvent(req as any, 'verification_resent', user.email, true, { userId: user._id });
  } catch (emailError) {
    logEmailEvent(req as any, 'verification_resent', user.email, false, {
      userId: user._id,
      error: emailError instanceof Error ? emailError.message : String(emailError),
    });
    throw new EmailSendError('Failed to send verification email');
  }

  logUserAction(req as any, 'resend_verification_completed', { userId: user._id });

  res.status(200).json({ success: true, message: 'Verification email resent' });
};
