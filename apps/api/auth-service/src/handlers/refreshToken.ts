import { APIGatewayEvent, LambdaResponse } from '../types';
import { createResponse, createErrorResponse, verifyToken as verifyJWTToken, getUserById, generateTokens } from '../utils/validation';
import { createSecureResponse, createSecureErrorResponse } from '../utils/security';
import { NODE_ENV, COOKIE_DOMAIN, ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE } from '../config/env';

const USERS_TABLE = process.env['USERS_TABLE']!;
const JWT_SECRET = process.env['JWT_SECRET']!;

export const refreshToken = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  try {
    // Extract refresh token from cookies
    const cookies = event.headers?.['cookie'] || event.headers?.['Cookie'] || '';
    const refreshTokenMatch = cookies.match(/refreshToken=([^;]+)/);
    
    if (!refreshTokenMatch) {
      return createSecureErrorResponse(401, 'Refresh token not found', { cors: true });
    }
    
    const refreshToken = refreshTokenMatch[1] || '';
    
    // Verify the refresh token
    const decoded = verifyJWTToken(refreshToken, JWT_SECRET);
    if (!decoded || decoded.type !== 'refresh') {
      return createSecureErrorResponse(401, 'Invalid refresh token', { cors: true });
    }
    
    // Get user
    const user = await getUserById(decoded.userId, USERS_TABLE);
    if (!user) {
      return createSecureErrorResponse(401, 'User not found', { cors: true });
    }
    
    // Generate new tokens
    const tokens = generateTokens(user.id, user.email, JWT_SECRET);
    
    // Create response with new HTTP-only cookies
    const accessTokenCookie = `accessToken=${tokens.accessToken}; HttpOnly; Secure=${NODE_ENV === 'production'}; SameSite=Strict; Path=/; Max-Age=${ACCESS_TOKEN_MAX_AGE}${COOKIE_DOMAIN ? `; Domain=${COOKIE_DOMAIN}` : ''}`;
    const refreshTokenCookie = `refreshToken=${tokens.refreshToken}; HttpOnly; Secure=${NODE_ENV === 'production'}; SameSite=Strict; Path=/; Max-Age=${REFRESH_TOKEN_MAX_AGE}${COOKIE_DOMAIN ? `; Domain=${COOKIE_DOMAIN}` : ''}`;
    
    const response = createSecureResponse(200, {
      message: 'Token refreshed successfully',
      expiresIn: 3600,
    }, { cors: true });
    
    // Add Set-Cookie headers
    response.headers['Set-Cookie'] = `${accessTokenCookie}, ${refreshTokenCookie}`;
    
    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return createSecureErrorResponse(500, 'Internal server error', { cors: true });
  }
}; 