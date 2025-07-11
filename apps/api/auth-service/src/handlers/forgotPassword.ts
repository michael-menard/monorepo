import crypto from 'crypto';
import { APIGatewayEvent, LambdaResponse } from '../types';
import { ForgotPasswordSchema } from '../types';
import { createResponse, createErrorResponse, validateRequest, getUserByEmail, updateUser } from '../utils/validation';

const USERS_TABLE = process.env['USERS_TABLE']!;

export const forgotPassword = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const validation = validateRequest(ForgotPasswordSchema, body);
    if (!validation.success) {
      return createErrorResponse(400, validation.error);
    }
    const { email } = validation.data;
    const user = await getUserByEmail(email.toLowerCase(), USERS_TABLE);
    if (!user) {
      return createResponse(200, {
        message: 'If an account with this email exists, a reset link has been sent',
      });
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000).toISOString();
    await updateUser(user.id, {
      resetToken,
      resetTokenExpiry,
    }, USERS_TABLE);
    return createResponse(200, {
      message: 'Password reset link sent to your email',
      resetToken, // Remove this in production
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}; 