import { useToast } from '../hooks/use-toast.js';

// Error types for authentication
export const AuthErrorType = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  SERVER_ERROR: 'SERVER_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  SOCIAL_LOGIN_FAILED: 'SOCIAL_LOGIN_FAILED'
} as const;

export type AuthErrorType = typeof AuthErrorType[keyof typeof AuthErrorType];

// Error interface
export interface AuthError {
  type: AuthErrorType;
  message: string;
  code?: number;
  details?: unknown;
}

// Error message mapping
const ERROR_MESSAGES: Record<AuthErrorType, string> = {
  [AuthErrorType.VALIDATION_ERROR]: 'Please check your input and try again.',
  [AuthErrorType.NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
  [AuthErrorType.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [AuthErrorType.UNAUTHORIZED]: 'You are not authorized to perform this action.',
  [AuthErrorType.SERVER_ERROR]: 'Server error. Please try again later.',
  [AuthErrorType.RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',
  [AuthErrorType.EMAIL_ALREADY_EXISTS]: 'An account with this email already exists.',
  [AuthErrorType.INVALID_CREDENTIALS]: 'Invalid email or password.',
  [AuthErrorType.EMAIL_NOT_VERIFIED]: 'Please verify your email address before continuing.',
  [AuthErrorType.SOCIAL_LOGIN_FAILED]: 'Social login failed. Please try again.'
};

// Parse RTK Query error
export function parseAuthError(error: unknown): AuthError {
  if (!error) {
    return {
      type: AuthErrorType.SERVER_ERROR,
      message: 'An unexpected error occurred.'
    };
  }

  // Handle RTK Query errors
  if (error && typeof error === 'object' && 'status' in error) {
    const rtkError = error as { status: number | string; data?: unknown };
    
    // Network error
    if (rtkError.status === 'FETCH_ERROR') {
      return {
        type: AuthErrorType.NETWORK_ERROR,
        message: ERROR_MESSAGES[AuthErrorType.NETWORK_ERROR]
      };
    }

    // Parse error data
    if (rtkError.data && typeof rtkError.data === 'object' && 'message' in rtkError.data) {
      const errorData = rtkError.data as { message: string; code?: number };
      
      // Map specific error messages
      if (errorData.message.includes('email already exists')) {
        return {
          type: AuthErrorType.EMAIL_ALREADY_EXISTS,
          message: ERROR_MESSAGES[AuthErrorType.EMAIL_ALREADY_EXISTS]
        };
      }
      
      if (errorData.message.includes('invalid credentials')) {
        return {
          type: AuthErrorType.INVALID_CREDENTIALS,
          message: ERROR_MESSAGES[AuthErrorType.INVALID_CREDENTIALS]
        };
      }
      
      if (errorData.message.includes('email not verified')) {
        return {
          type: AuthErrorType.EMAIL_NOT_VERIFIED,
          message: ERROR_MESSAGES[AuthErrorType.EMAIL_NOT_VERIFIED]
        };
      }
      
      if (errorData.message.includes('rate limit')) {
        return {
          type: AuthErrorType.RATE_LIMIT,
          message: ERROR_MESSAGES[AuthErrorType.RATE_LIMIT]
        };
      }

      return {
        type: AuthErrorType.SERVER_ERROR,
        message: errorData.message,
        code: errorData.code
      };
    }
  }

  // Handle HTTP status codes
  if (error && typeof error === 'object' && 'status' in error) {
    const httpError = error as { status: number };
    
    switch (httpError.status) {
      case 400:
        return {
          type: AuthErrorType.VALIDATION_ERROR,
          message: ERROR_MESSAGES[AuthErrorType.VALIDATION_ERROR]
        };
      case 401:
        return {
          type: AuthErrorType.UNAUTHORIZED,
          message: ERROR_MESSAGES[AuthErrorType.UNAUTHORIZED]
        };
      case 403:
        return {
          type: AuthErrorType.UNAUTHORIZED,
          message: ERROR_MESSAGES[AuthErrorType.UNAUTHORIZED]
        };
      case 429:
        return {
          type: AuthErrorType.RATE_LIMIT,
          message: ERROR_MESSAGES[AuthErrorType.RATE_LIMIT]
        };
      case 500:
        return {
          type: AuthErrorType.SERVER_ERROR,
          message: ERROR_MESSAGES[AuthErrorType.SERVER_ERROR]
        };
      default:
        return {
          type: AuthErrorType.SERVER_ERROR,
          message: ERROR_MESSAGES[AuthErrorType.SERVER_ERROR]
        };
    }
  }

  // Fallback
  return {
    type: AuthErrorType.SERVER_ERROR,
    message: 'An unexpected error occurred.'
  };
}

// Hook for handling auth errors with toast notifications
export function useAuthErrorHandler() {
  const { toast } = useToast();

  const handleError = (error: unknown, context?: string) => {
    const authError = parseAuthError(error);
    
    // Log error for debugging
    console.error(`Auth Error [${context || 'unknown'}]:`, {
      type: authError.type,
      message: authError.message,
      originalError: error
    });

    // Show toast notification
    toast({
      variant: 'destructive',
      title: 'Authentication Error',
      description: authError.message,
    });

    return authError;
  };

  const handleSuccess = (message: string) => {
    toast({
      title: 'Success',
      description: message,
    });
  };

  return {
    handleError,
    handleSuccess,
    parseAuthError
  };
}

// Utility for form error handling
export function handleFormError(
  error: unknown,
  setError: (field: string, options: { message: string }) => void,
  fieldMap?: Record<string, string>
) {
  const authError = parseAuthError(error);
  
  // Map error to specific form field if possible
  if (fieldMap && authError.type in fieldMap) {
    setError(fieldMap[authError.type], { message: authError.message });
  } else {
    // Set as root error
    setError('root', { message: authError.message });
  }
  
  return authError;
}

// Utility for API error handling
export function handleApiError(error: unknown): string {
  const authError = parseAuthError(error);
  return authError.message;
}

// Error recovery utilities
export const ErrorRecovery = {
  // Retry function with exponential backoff
  retry: async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait with exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, delay * Math.pow(2, attempt - 1))
        );
      }
    }
    
    throw lastError;
  },

  // Check if error is recoverable
  isRecoverable: (error: AuthError): boolean => {
    const recoverableTypes = [
      AuthErrorType.NETWORK_ERROR,
      AuthErrorType.RATE_LIMIT,
      AuthErrorType.SERVER_ERROR
    ] as const;
    return recoverableTypes.includes(error.type as typeof recoverableTypes[number]);
  },

  // Get retry delay for specific error type
  getRetryDelay: (error: AuthError): number => {
    switch (error.type) {
      case AuthErrorType.RATE_LIMIT:
        return 5000; // 5 seconds
      case AuthErrorType.NETWORK_ERROR:
        return 2000; // 2 seconds
      case AuthErrorType.SERVER_ERROR:
        return 3000; // 3 seconds
      default:
        return 1000; // 1 second
    }
  }
}; 