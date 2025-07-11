import { z, ZodError } from 'zod';
import { LambdaResponse, ErrorResponse } from '../types';

// Response helpers
export const createResponse = (statusCode: number, body: any): LambdaResponse => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  },
  body: JSON.stringify(body)
});

export const createErrorResponse = (statusCode: number, message: string): LambdaResponse => 
  createResponse(statusCode, { error: message } as ErrorResponse);

// Zod validation helper
export const validateRequest = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      const firstError = (error as any).errors[0];
      return { 
        success: false, 
        error: firstError?.message || 'Validation failed' 
      };
    }
    return { success: false, error: 'Invalid request data' };
  }
};

// Rate limiting helper
export const checkRateLimit = (
  ip: string,
  action: string,
  limit: number = 10,
  windowMs: number = 60000
): boolean => {
  const key = `${ip}:${action}`;
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // In production, use Redis or DynamoDB for rate limiting
  // This is a simple in-memory implementation
  const rateLimitStore = new Map<string, number[]>();
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, []);
  }
  
  const attempts = rateLimitStore.get(key)!;
  const recentAttempts = attempts.filter(timestamp => timestamp > windowStart);
  
  if (recentAttempts.length >= limit) {
    return false;
  }
  
  recentAttempts.push(now);
  rateLimitStore.set(key, recentAttempts);
  return true;
};

// Input validation helpers
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validatePassword = (password: string): boolean => {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8 || password.length > 128) return false;
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
};

// JWT helpers
export const generateTokens = (userId: string, email: string, jwtSecret: string) => {
  const jwt = require('jsonwebtoken');
  
  const accessToken = jwt.sign(
    { userId, email, type: 'access' as const },
    jwtSecret,
    { expiresIn: '1h' }
  );
  
  const refreshToken = jwt.sign(
    { userId, email, type: 'refresh' as const },
    jwtSecret,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

export const verifyToken = (token: string, jwtSecret: string) => {
  const jwt = require('jsonwebtoken');
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
};

// Database helpers
export const getUserByEmail = async (email: string, usersTable: string) => {
  const AWS = require('aws-sdk');
  const dynamodb = new AWS.DynamoDB.DocumentClient();
  
  const params = {
    TableName: usersTable,
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email.toLowerCase() }
  };
  
  const result = await dynamodb.query(params).promise();
  return result.Items?.[0] || null;
};

export const getUserById = async (id: string, usersTable: string) => {
  const AWS = require('aws-sdk');
  const dynamodb = new AWS.DynamoDB.DocumentClient();
  
  const params = {
    TableName: usersTable,
    Key: { id }
  };
  
  const result = await dynamodb.get(params).promise();
  return result.Item || null;
};

export const createUser = async (userData: any, usersTable: string) => {
  const AWS = require('aws-sdk');
  const dynamodb = new AWS.DynamoDB.DocumentClient();
  
  const params = {
    TableName: usersTable,
    Item: userData
  };
  
  await dynamodb.put(params).promise();
};

export const updateUser = async (id: string, updates: Record<string, any>, usersTable: string) => {
  const AWS = require('aws-sdk');
  const dynamodb = new AWS.DynamoDB.DocumentClient();
  
  const updateExpression: string[] = [];
  const expressionAttributeValues: Record<string, any> = {};
  const expressionAttributeNames: Record<string, string> = {};
  
  Object.keys(updates).forEach(key => {
    const valueKey = `:${key}`;
    const nameKey = `#${key}`;
    updateExpression.push(`${nameKey} = ${valueKey}`);
    expressionAttributeValues[valueKey] = updates[key];
    expressionAttributeNames[nameKey] = key;
  });
  
  const params = {
    TableName: usersTable,
    Key: { id },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeValues: expressionAttributeValues,
    ExpressionAttributeNames: expressionAttributeNames,
    ReturnValues: 'ALL_NEW'
  };
  
  const result = await dynamodb.update(params).promise();
  return result.Attributes;
}; 