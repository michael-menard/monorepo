import { APIGatewayEvent, LambdaResponse } from '../types';
import { createResponse, createErrorResponse } from '../utils/validation';
import { createSecureResponse } from '../utils/security';
import { NODE_ENV, COOKIE_DOMAIN } from '../config/env';

export const logout = async (_event: APIGatewayEvent): Promise<LambdaResponse> => {
  try {
    // Clear HTTP-only cookies by setting them with expired dates
    const clearAccessTokenCookie = `accessToken=; HttpOnly; Secure=${NODE_ENV === 'production'}; SameSite=Strict; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${COOKIE_DOMAIN ? `; Domain=${COOKIE_DOMAIN}` : ''}`;
    const clearRefreshTokenCookie = `refreshToken=; HttpOnly; Secure=${NODE_ENV === 'production'}; SameSite=Strict; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${COOKIE_DOMAIN ? `; Domain=${COOKIE_DOMAIN}` : ''}`;
    
    const response = createSecureResponse(200, {
      message: 'Logout successful',
    }, { cors: true });
    
    // Add Set-Cookie headers to clear cookies
    response.headers['Set-Cookie'] = `${clearAccessTokenCookie}, ${clearRefreshTokenCookie}`;
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}; 