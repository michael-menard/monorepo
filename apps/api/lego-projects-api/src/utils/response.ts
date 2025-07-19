// Shared API response utility

import { z } from 'zod';

export type ApiResponse<T = any> = {
  status: number;
  message: string;
  data?: T;
  error?: string;
  details?: any;
};

export function apiResponse<T = any>(
  status: number,
  message: string,
  data?: T,
  error?: string,
  details?: any
): ApiResponse<T> {
  const response: ApiResponse<T> = { status, message };
  if (data !== undefined) response.data = data;
  if (error) response.error = error;
  if (details) response.details = details;
  return response;
}

export const ApiErrorTypeSchema = z.union([
  z.literal('BAD_REQUEST'),
  z.literal('UNAUTHORIZED'),
  z.literal('FORBIDDEN'),
  z.literal('NOT_FOUND'),
  z.literal('CONFLICT'),
  z.literal('TOO_MANY_REQUESTS'),
  z.literal('INTERNAL_ERROR'),
  z.literal('VALIDATION_ERROR'),
  z.literal('FILE_ERROR'),
  z.literal('SEARCH_ERROR'),
  // Add more as needed
]);
export type ApiErrorType = z.infer<typeof ApiErrorTypeSchema>;

export function apiErrorResponse(
  status: number,
  errorType: ApiErrorType,
  message: string,
  details?: any
): ApiResponse<null> {
  return {
    status,
    message,
    error: errorType,
    details,
  };
} 