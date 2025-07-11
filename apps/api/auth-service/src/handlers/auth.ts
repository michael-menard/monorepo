import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { APIGatewayEvent, LambdaResponse, User, UserWithoutPassword } from '../types';
import {
  SignupSchema,
  LoginSchema,
  TokenSchema,
  RefreshTokenSchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema
} from '../types';
import {
  createResponse,
  createErrorResponse,
  validateRequest,
  checkRateLimit,
  generateTokens,
  verifyToken as verifyJWTToken,
  getUserByEmail,
  getUserById,
  createUser,
  updateUser
} from '../utils/validation';

// Security configurations
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Environment variables
const USERS_TABLE = process.env['USERS_TABLE']!;
const JWT_SECRET = process.env['JWT_SECRET']!;
const SALT_ROUNDS = parseInt(process.env['SALT_ROUNDS'] || '12');

// Main handlers
export const signup = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const clientIP = event.requestContext?.http?.sourceIp || 'unknown';
    
    // Rate limiting
    if (!checkRateLimit(clientIP, 'signup', 5, 300000)) {
      return createErrorResponse(429, 'Too many signup attempts. Please try again later.');
    }
    
    // Validate input with Zod
    const validation = validateRequest(SignupSchema, body);
    if (!validation.success) {
      return createErrorResponse(400, validation.error);
    }
    
    const { email, password, firstName, lastName } = validation.data;
    
    // Check if user already exists
    const existingUser = await getUserByEmail(email, USERS_TABLE);
    if (existingUser) {
      return createErrorResponse(409, 'User with this email already exists');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Create user
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    const userData: User = {
      id: userId,
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      createdAt: now,
      updatedAt: now,
      emailVerified: false,
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      resetToken: null,
      resetTokenExpiry: null
    };
    
    await createUser(userData, USERS_TABLE);
    
    // Generate tokens
    const tokens = generateTokens(userId, email, JWT_SECRET);
    
    // Remove password from response
    const userWithoutPassword: UserWithoutPassword = {
      ...userData,
      password: undefined
    };
    
    return createResponse(201, {
      message: 'User created successfully',
      user: userWithoutPassword,
      tokens: {
        ...tokens,
        expiresIn: 3600 // 1 hour
      }
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};

export const login = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const clientIP = event.requestContext?.http?.sourceIp || 'unknown';
    
    // Rate limiting
    if (!checkRateLimit(clientIP, 'login', 10, 300000)) {
      return createErrorResponse(429, 'Too many login attempts. Please try again later.');
    }
    
    // Validate input with Zod
    const validation = validateRequest(LoginSchema, body);
    if (!validation.success) {
      return createErrorResponse(400, validation.error);
    }
    
    const { email, password } = validation.data;
    
    // Get user
    const user = await getUserByEmail(email.toLowerCase(), USERS_TABLE);
    if (!user) {
      return createErrorResponse(401, 'Invalid credentials');
    }
    
    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return createErrorResponse(423, 'Account is temporarily locked. Please try again later.');
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Increment login attempts
      const newAttempts = (user.loginAttempts || 0) + 1;
      const updates: Partial<User> = { loginAttempts: newAttempts };
      
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        updates.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION).toISOString();
      }
      
      await updateUser(user.id, updates, USERS_TABLE);
      
      return createErrorResponse(401, 'Invalid credentials');
    }
    
    // Reset login attempts on successful login
    const now = new Date().toISOString();
    await updateUser(user.id, {
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: now
    }, USERS_TABLE);
    
    // Generate tokens
    const tokens = generateTokens(user.id, user.email, JWT_SECRET);
    
    // Remove sensitive data from response
    const userWithoutPassword: UserWithoutPassword = {
      ...user,
      password: undefined
    };
    
    return createResponse(200, {
      message: 'Login successful',
      user: userWithoutPassword,
      tokens: {
        ...tokens,
        expiresIn: 3600 // 1 hour
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};

export const verifyToken = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    
    // Validate input with Zod
    const validation = validateRequest(TokenSchema, body);
    if (!validation.success) {
      return createErrorResponse(400, validation.error);
    }
    
    const { token } = validation.data;
    
    const decoded = verifyJWTToken(token, JWT_SECRET);
    if (!decoded || decoded.type !== 'access') {
      return createErrorResponse(401, 'Invalid or expired token');
    }
    
    // Get user data
    const user = await getUserById(decoded.userId, USERS_TABLE);
    if (!user) {
      return createErrorResponse(401, 'User not found');
    }
    
    const userWithoutPassword: UserWithoutPassword = {
      ...user,
      password: undefined
    };
    
    return createResponse(200, {
      valid: true,
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error('Token verification error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};

export const refreshToken = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    
    // Validate input with Zod
    const validation = validateRequest(RefreshTokenSchema, body);
    if (!validation.success) {
      return createErrorResponse(400, validation.error);
    }
    
    const { refreshToken } = validation.data;
    
    const decoded = verifyJWTToken(refreshToken, JWT_SECRET);
    if (!decoded || decoded.type !== 'refresh') {
      return createErrorResponse(401, 'Invalid refresh token');
    }
    
    // Get user data
    const user = await getUserById(decoded.userId, USERS_TABLE);
    if (!user) {
      return createErrorResponse(401, 'User not found');
    }
    
    // Generate new tokens
    const tokens = generateTokens(user.id, user.email, JWT_SECRET);
    
    return createResponse(200, {
      message: 'Token refreshed successfully',
      tokens: {
        ...tokens,
        expiresIn: 3600
      }
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};

export const logout = async (_event: APIGatewayEvent): Promise<LambdaResponse> => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // by removing the token. For additional security, you could
    // implement a blacklist of revoked tokens in DynamoDB.
    
    return createResponse(200, {
      message: 'Logout successful'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};

export const changePassword = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    
    // Validate input with Zod
    const validation = validateRequest(ChangePasswordSchema, body);
    if (!validation.success) {
      return createErrorResponse(400, validation.error);
    }
    
    const { currentPassword, newPassword, token } = validation.data;
    
    // Verify token
    const decoded = verifyJWTToken(token, JWT_SECRET);
    if (!decoded || decoded.type !== 'access') {
      return createErrorResponse(401, 'Invalid or expired token');
    }
    
    // Get user
    const user = await getUserById(decoded.userId, USERS_TABLE);
    if (!user) {
      return createErrorResponse(401, 'User not found');
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return createErrorResponse(401, 'Current password is incorrect');
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    // Update password
    await updateUser(user.id, {
      password: hashedNewPassword,
      updatedAt: new Date().toISOString()
    }, USERS_TABLE);
    
    return createResponse(200, {
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};

export const forgotPassword = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    
    // Validate input with Zod
    const validation = validateRequest(ForgotPasswordSchema, body);
    if (!validation.success) {
      return createErrorResponse(400, validation.error);
    }
    
    const { email } = validation.data;
    
    // Get user
    const user = await getUserByEmail(email.toLowerCase(), USERS_TABLE);
    if (!user) {
      // Don't reveal if user exists or not
      return createResponse(200, {
        message: 'If an account with this email exists, a reset link has been sent'
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour
    
    // Update user with reset token
    await updateUser(user.id, {
      resetToken,
      resetTokenExpiry
    }, USERS_TABLE);
    
    // In production, send email with reset link
    // For now, return the token (remove in production)
    return createResponse(200, {
      message: 'Password reset link sent to your email',
      resetToken // Remove this in production
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};

export const resetPassword = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    
    // Validate input with Zod
    const validation = validateRequest(ResetPasswordSchema, body);
    if (!validation.success) {
      return createErrorResponse(400, validation.error);
    }
    
    const { resetToken, newPassword } = validation.data;
    
    // Find user by reset token
    const AWS = require('aws-sdk');
    const dynamodb = new AWS.DynamoDB.DocumentClient();
    
    const params = {
      TableName: USERS_TABLE,
      IndexName: 'ResetTokenIndex',
      KeyConditionExpression: 'resetToken = :resetToken',
      ExpressionAttributeValues: { ':resetToken': resetToken }
    };
    
    const result = await dynamodb.query(params).promise();
    const user = result.Items?.[0];
    
    if (!user) {
      return createErrorResponse(400, 'Invalid reset token');
    }
    
    // Check if token is expired
    if (new Date(user.resetTokenExpiry) < new Date()) {
      return createErrorResponse(400, 'Reset token has expired');
    }
    
    // Hash new password and clear reset token
    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    await updateUser(user.id, {
      password: hashedNewPassword,
      resetToken: null,
      resetTokenExpiry: null,
      updatedAt: new Date().toISOString()
    }, USERS_TABLE);
    
    return createResponse(200, {
      message: 'Password reset successfully'
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}; 