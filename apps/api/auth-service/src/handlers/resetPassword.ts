import bcrypt from 'bcryptjs';
import { APIGatewayEvent, LambdaResponse } from '../types';
import { ResetPasswordSchema } from '../types';
import { createResponse, createErrorResponse, validateRequest, updateUser } from '../utils/validation';

const USERS_TABLE = process.env['USERS_TABLE']!;

export const resetPassword = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const validation = validateRequest(ResetPasswordSchema, body);
    if (!validation.success) {
      return createErrorResponse(400, validation.error);
    }
    const { resetToken, newPassword } = validation.data;
    const AWS = require('aws-sdk');
    const dynamodb = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: USERS_TABLE,
      IndexName: 'ResetTokenIndex',
      KeyConditionExpression: 'resetToken = :resetToken',
      ExpressionAttributeValues: { ':resetToken': resetToken },
    };
    const result = await dynamodb.query(params).promise();
    const user = result.Items?.[0];
    if (!user) {
      return createErrorResponse(400, 'Invalid reset token');
    }
    if (new Date(user.resetTokenExpiry) < new Date()) {
      return createErrorResponse(400, 'Reset token has expired');
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await updateUser(user.id, {
      password: hashedNewPassword,
      resetToken: null,
      resetTokenExpiry: null,
      updatedAt: new Date().toISOString(),
    }, USERS_TABLE);
    return createResponse(200, {
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}; 