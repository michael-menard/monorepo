import bcrypt from 'bcryptjs';
import { APIGatewayEvent, LambdaResponse, User, UserWithoutPassword } from '../types';
import { LoginSchema } from '../types';
import { validateRequest, generateTokens, getUserByEmail, updateUser } from '../utils/validation';
import { USERS_TABLE, JWT_SECRET, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION, NODE_ENV, COOKIE_DOMAIN, ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE } from '../config/env';
import {
  checkRateLimit,
  createSecureResponse,
  createSecureErrorResponse,
  getClientIP,
  validateRequestSize,
  validateRequestHeaders,
  sanitizeInput,
  logSecurityEvent,
  RATE_LIMITS,
} from '../utils/security';

export const login = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
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
    if (!checkRateLimit(clientIP, 'login', RATE_LIMITS.LOGIN)) {
      logSecurityEvent('rate_limit_exceeded', { action: 'login', ip: clientIP }, clientIP);
      return createSecureErrorResponse(429, 'Too many login attempts. Please try again later.', {
        cors: true,
        rateLimit: { ip: clientIP, action: 'login', config: RATE_LIMITS.LOGIN }
      });
    }
    
    // Parse and validate request body
    const body = event.body ? JSON.parse(event.body) : {};
    const validation = validateRequest(LoginSchema, body);
    if (!validation.success) {
      return createSecureErrorResponse(400, validation.error, { cors: true });
    }
    
    const { email, password } = validation.data;
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    
    // Get user
    const user = await getUserByEmail(sanitizedEmail, USERS_TABLE);
    if (!user) {
      logSecurityEvent('login_failed_invalid_user', { email: sanitizedEmail }, clientIP);
      return createSecureErrorResponse(401, 'Invalid credentials', { cors: true });
    }
    
    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      logSecurityEvent('login_failed_locked_account', { userId: user.id, email: sanitizedEmail }, clientIP);
      return createSecureErrorResponse(423, 'Account is temporarily locked. Please try again later.', { cors: true });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const newAttempts = (user.loginAttempts || 0) + 1;
      const updates: Partial<User> = { loginAttempts: newAttempts };
      
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        updates.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION).toISOString();
        logSecurityEvent('account_locked', { userId: user.id, email: sanitizedEmail, attempts: newAttempts }, clientIP);
      }
      
      await updateUser(user.id, updates, USERS_TABLE);
      logSecurityEvent('login_failed_invalid_password', { userId: user.id, email: sanitizedEmail }, clientIP);
      return createSecureErrorResponse(401, 'Invalid credentials', { cors: true });
    }
    
    // Successful login
    const now = new Date().toISOString();
    await updateUser(user.id, {
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: now
    }, USERS_TABLE);
    
    const tokens = generateTokens(user.id, user.email, JWT_SECRET);
    const userWithoutPassword: UserWithoutPassword = {
      ...user,
      password: undefined
    };
    
    // Log successful login
    logSecurityEvent('login_success', { userId: user.id, email: sanitizedEmail }, clientIP);
    
    // Create response with HTTP-only cookies
    const accessTokenCookie = `accessToken=${tokens.accessToken}; HttpOnly; Secure=${NODE_ENV === 'production'}; SameSite=Strict; Path=/; Max-Age=${ACCESS_TOKEN_MAX_AGE}${COOKIE_DOMAIN ? `; Domain=${COOKIE_DOMAIN}` : ''}`;
    const refreshTokenCookie = `refreshToken=${tokens.refreshToken}; HttpOnly; Secure=${NODE_ENV === 'production'}; SameSite=Strict; Path=/; Max-Age=${REFRESH_TOKEN_MAX_AGE}${COOKIE_DOMAIN ? `; Domain=${COOKIE_DOMAIN}` : ''}`;
    
    const response = createSecureResponse(200, {
      message: 'Login successful',
      user: userWithoutPassword,
      expiresIn: 3600
    }, {
      cors: true,
      rateLimit: { ip: clientIP, action: 'login', config: RATE_LIMITS.LOGIN }
    });
    
    // Add Set-Cookie headers
    response.headers['Set-Cookie'] = `${accessTokenCookie}, ${refreshTokenCookie}`;
    
    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logSecurityEvent('login_error', { error: errorMessage }, getClientIP(event));
    return createSecureErrorResponse(500, 'Internal server error', { cors: true });
  }
}; 