import { APIGatewayEvent, LambdaResponse, UserWithoutPassword } from '../types';
import { TokenSchema } from '../types';
import { createResponse, createErrorResponse, validateRequest, verifyToken as verifyJWTToken, getUserById } from '../utils/validation';

const USERS_TABLE = process.env['USERS_TABLE']!;
const JWT_SECRET = process.env['JWT_SECRET']!;

export const verifyToken = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const validation = validateRequest(TokenSchema, body);
    if (!validation.success) {
      return createErrorResponse(400, validation.error);
    }
    const { token } = validation.data;
    const decoded = verifyJWTToken(token, JWT_SECRET);
    if (!decoded || decoded.type !== 'access') {
      return createErrorResponse(401, 'Invalid or expired token');
    }
    const user = await getUserById(decoded.userId, USERS_TABLE);
    if (!user) {
      return createErrorResponse(401, 'User not found');
    }
    const userWithoutPassword: UserWithoutPassword = {
      ...user,
      password: undefined,
    };
    return createResponse(200, {
      valid: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}; 