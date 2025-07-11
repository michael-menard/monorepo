import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { APIGatewayEvent, LambdaResponse, User, UserWithoutPassword } from '../types';
import { SignupSchema } from '../types';
import { validateRequest, generateTokens, getUserByEmail, createUser } from '../utils/validation';
import { USERS_TABLE, JWT_SECRET, SALT_ROUNDS } from '../config/env';
import {
  checkRateLimit,
  createSecureResponse,
  createSecureErrorResponse,
  getClientIP,
  validateRequestSize,
  validateRequestHeaders,
  sanitizeInput,
  validatePasswordStrength,
  logSecurityEvent,
  RATE_LIMITS,
} from '../utils/security';

export const signup = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  try {
    // Security validations
    const clientIP = getClientIP(event);
    
    // Validate request size
    if (!validateRequestSize(event.body)) {
      return createSecureErrorResponse(413, 'Request too large', { cors: true });
    }
    
    // Validate request headers
    const headerValidation = validateRequestHeaders(event.headers || {});
    if (!headerValidation.isValid) {
      return createSecureErrorResponse(400, headerValidation.errors.join(', '), { cors: true });
    }
    
    // Rate limiting with enhanced security
    if (!checkRateLimit(clientIP, 'signup', RATE_LIMITS.SIGNUP)) {
      logSecurityEvent('rate_limit_exceeded', { action: 'signup', ip: clientIP }, clientIP);
      return createSecureErrorResponse(429, 'Too many signup attempts. Please try again later.', {
        cors: true,
        rateLimit: { ip: clientIP, action: 'signup', config: RATE_LIMITS.SIGNUP }
      });
    }
    
    // Parse and validate request body
    const body = event.body ? JSON.parse(event.body) : {};
    const validation = validateRequest(SignupSchema, body);
    if (!validation.success) {
      return createSecureErrorResponse(400, validation.error, { cors: true });
    }
    
    const { email, password, firstName, lastName } = validation.data;
    
    // Enhanced password validation
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return createSecureErrorResponse(400, passwordValidation.errors.join(', '), { cors: true });
    }
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    const sanitizedFirstName = sanitizeInput(firstName);
    const sanitizedLastName = sanitizeInput(lastName);
    
    // Check if user already exists
    const existingUser = await getUserByEmail(sanitizedEmail, USERS_TABLE);
    if (existingUser) {
      logSecurityEvent('duplicate_signup_attempt', { email: sanitizedEmail }, clientIP);
      return createSecureErrorResponse(409, 'User with this email already exists', { cors: true });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Create user
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    const userData: User = {
      id: userId,
      email: sanitizedEmail,
      password: hashedPassword,
      firstName: sanitizedFirstName,
      lastName: sanitizedLastName,
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
    const tokens = generateTokens(userId, sanitizedEmail, JWT_SECRET);
    
    // Log successful signup
    logSecurityEvent('user_signup_success', { userId, email: sanitizedEmail }, clientIP);
    
    // Remove password from response
    const userWithoutPassword: UserWithoutPassword = {
      ...userData,
      password: undefined
    };
    
    return createSecureResponse(201, {
      message: 'User created successfully',
      user: userWithoutPassword,
      tokens: {
        ...tokens,
        expiresIn: 3600
      }
    }, {
      cors: true,
      rateLimit: { ip: clientIP, action: 'signup', config: RATE_LIMITS.SIGNUP }
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logSecurityEvent('signup_error', { error: errorMessage }, getClientIP(event));
    return createSecureErrorResponse(500, 'Internal server error', { cors: true });
  }
}; 