import bcrypt from 'bcryptjs';
import { APIGatewayEvent, LambdaResponse } from '../types';
import { ChangePasswordSchema } from '../types';
import { createResponse, createErrorResponse, validateRequest, verifyToken as verifyJWTToken, getUserById, updateUser } from '../utils/validation';

const USERS_TABLE = process.env['USERS_TABLE']!;
const JWT_SECRET = process.env['JWT_SECRET']!;
const SALT_ROUNDS = parseInt(process.env['SALT_ROUNDS'] || '12');

export const changePassword = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const validation = validateRequest(ChangePasswordSchema, body);
    if (!validation.success) {
      return createErrorResponse(400, validation.error);
    }
    const { currentPassword, newPassword, token } = validation.data;
    const decoded = verifyJWTToken(token, JWT_SECRET);
    if (!decoded || decoded.type !== 'access') {
      return createErrorResponse(401, 'Invalid or expired token');
    }
    const user = await getUserById(decoded.userId, USERS_TABLE);
    if (!user) {
      return createErrorResponse(401, 'User not found');
    }
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return createErrorResponse(401, 'Current password is incorrect');
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await updateUser(user.id, {
      password: hashedNewPassword,
      updatedAt: new Date().toISOString(),
    }, USERS_TABLE);
    return createResponse(200, {
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}; 