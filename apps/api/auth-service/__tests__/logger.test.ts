import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { Request, Response } from 'express';
import {
  logAuthEvent,
  logSecurityEvent,
  logUserAction,
  logAuthError,
  logDatabaseOperation,
  logEmailEvent,
  logValidationError,
  sanitizeUserForLogging,
  getOrCreateCorrelationId,
  logPerformance,
} from '../utils/logger';

// Mock request and response objects
const createMockRequest = (overrides = {}): any => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  id: 'req-123456',
  headers: {
    'user-agent': 'test-agent',
    'x-correlation-id': 'corr-789',
  },
  ip: '127.0.0.1',
  connection: {
    remoteAddress: '127.0.0.1',
  },
  user: {
    id: 'user-456',
    email: 'test@example.com',
  },
  userId: 'user-456',
  ...overrides,
});

describe('Logger Utils', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  describe('logAuthEvent', () => {
    it('should log auth event with user context and request details', () => {
      const details = { action: 'login', success: true };

      logAuthEvent(mockReq, 'user_login', details, 'info');

      expect(mockReq.log.info).toHaveBeenCalledWith(
        {
          ...details,
          userId: 'user-456',
          userEmail: 'test@example.com',
          event: 'user_login',
          requestId: 'req-123456',
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          timestamp: expect.any(String),
        },
        'Auth event: user_login'
      );
    });

    it('should handle missing user context gracefully', () => {
      const mockReqNoUser = createMockRequest({ user: undefined, userId: undefined });

      logAuthEvent(mockReqNoUser, 'anonymous_action', {}, 'info');

      expect(mockReqNoUser.log.info).toHaveBeenCalledWith(
        {
          userId: undefined,
          userEmail: undefined,
          event: 'anonymous_action',
          requestId: 'req-123456',
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          timestamp: expect.any(String),
        },
        'Auth event: anonymous_action'
      );
    });

    it('should support different log levels', () => {
      logAuthEvent(mockReq, 'error_event', {}, 'error');
      logAuthEvent(mockReq, 'warning_event', {}, 'warn');

      expect(mockReq.log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'error_event',
        }),
        'Auth event: error_event'
      );

      expect(mockReq.log.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'warning_event',
        }),
        'Auth event: warning_event'
      );
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security events with security flag', () => {
      logSecurityEvent(mockReq, 'failed_login_attempt', { attempts: 3 });

      expect(mockReq.log.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'failed_login_attempt',
          attempts: 3,
          security: true,
          userId: 'user-456',
        }),
        'Auth event: failed_login_attempt'
      );
    });
  });

  describe('logUserAction', () => {
    it('should log user actions with info level', () => {
      logUserAction(mockReq, 'profile_updated', { field: 'email' });

      expect(mockReq.log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'profile_updated',
          field: 'email',
          userId: 'user-456',
        }),
        'Auth event: profile_updated'
      );
    });
  });

  describe('logAuthError', () => {
    it('should log Error objects with stack trace', () => {
      const error = new Error('Authentication failed');
      error.stack = 'Error: Authentication failed\n    at test';

      logAuthError(mockReq, error, { context: 'login' });

      expect(mockReq.log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth_error',
          context: 'login',
          error: 'Authentication failed',
          stack: 'Error: Authentication failed\n    at test',
          userId: 'user-456',
        }),
        'Auth event: auth_error'
      );
    });

    it('should log string errors without stack trace', () => {
      logAuthError(mockReq, 'Simple error message', { context: 'signup' });

      expect(mockReq.log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth_error',
          context: 'signup',
          error: 'Simple error message',
          stack: undefined,
          userId: 'user-456',
        }),
        'Auth event: auth_error'
      );
    });
  });

  describe('logDatabaseOperation', () => {
    it('should log database operations with operation details', () => {
      logDatabaseOperation(mockReq, 'findOne', 'users', { email: 'test@example.com' });

      expect(mockReq.log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'database_operation',
          operation: 'findOne',
          collection: 'users',
          email: 'test@example.com',
          userId: 'user-456',
        }),
        'Auth event: database_operation'
      );
    });
  });

  describe('logEmailEvent', () => {
    it('should log successful email events as info', () => {
      logEmailEvent(mockReq, 'welcome', 'user@example.com', true, { extraData: 'test' });

      expect(mockReq.log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email_sent',
          emailType: 'welcome',
          recipient: 'user@example.com',
          success: true,
          userId: 'user-456', // Uses userId from request context
          extraData: 'test',
        }),
        'Auth event: email_sent'
      );
    });

    it('should log failed email events as warning', () => {
      logEmailEvent(mockReq, 'verification', 'user@example.com', false, { 
        error: 'SMTP connection failed' 
      });

      expect(mockReq.log.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email_sent',
          emailType: 'verification',
          recipient: 'user@example.com',
          success: false,
          error: 'SMTP connection failed',
          userId: 'user-456',
        }),
        'Auth event: email_sent'
      );
    });
  });

  describe('logValidationError', () => {
    it('should log validation errors with field information', () => {
      logValidationError(mockReq, 'email', 'Invalid email format', { 
        providedValue: 'invalid-email' 
      });

      expect(mockReq.log.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'validation_error',
          field: 'email',
          validationError: 'Invalid email format',
          providedValue: 'invalid-email',
          userId: 'user-456',
        }),
        'Auth event: validation_error'
      );
    });
  });

  describe('sanitizeUserForLogging', () => {
    it('should remove sensitive fields from user object', () => {
      const user = {
        _id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'secret-password',
        resetPasswordToken: 'reset-token',
        verificationToken: 'verification-token',
        isVerified: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const sanitized = sanitizeUserForLogging(user);

      expect(sanitized).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isVerified: true,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });

      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized).not.toHaveProperty('resetPasswordToken');
      expect(sanitized).not.toHaveProperty('verificationToken');
    });

    it('should handle null user gracefully', () => {
      expect(sanitizeUserForLogging(null)).toBeNull();
      expect(sanitizeUserForLogging(undefined)).toBeNull();
    });

    it('should handle user with id instead of _id', () => {
      const user = {
        id: 'user-456',
        email: 'test@example.com',
        name: 'Test User',
        isVerified: false,
      };

      const sanitized = sanitizeUserForLogging(user);
      expect(sanitized).not.toBeNull();
      expect(sanitized?.id).toBe('user-456');
    });
  });

  describe('getOrCreateCorrelationId', () => {
    it('should return x-correlation-id when available', () => {
      const req = {
        headers: {
          'x-correlation-id': 'corr-123',
          'x-request-id': 'req-456',
        },
        id: 'fallback-id',
      } as any;

      expect(getOrCreateCorrelationId(req)).toBe('corr-123');
    });

    it('should fallback to x-request-id when correlation-id is not available', () => {
      const req = {
        headers: {
          'x-request-id': 'req-456',
        },
        id: 'fallback-id',
      } as any;

      expect(getOrCreateCorrelationId(req)).toBe('req-456');
    });

    it('should fallback to request id when headers are not available', () => {
      const req = {
        headers: {},
        id: 'fallback-id',
      } as any;

      expect(getOrCreateCorrelationId(req)).toBe('fallback-id');
    });
  });

  describe('logPerformance', () => {
    it('should log performance metrics with duration', () => {
      logPerformance(mockReq, 'database_query', 250, { query: 'findUser' });

      expect(mockReq.log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'performance_metric',
          operation: 'database_query',
          duration: 250,
          durationMs: '250ms',
          query: 'findUser',
          userId: 'user-456',
        }),
        'Auth event: performance_metric'
      );
    });
  });

  describe('Request ID and Context Integration', () => {
    it('should include request ID from pino-http in logs', () => {
      const mockReqWithId = createMockRequest({ id: 'pino-generated-id' });

      logUserAction(mockReqWithId, 'test_action', {});

      expect(mockReqWithId.log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'pino-generated-id',
        }),
        'Auth event: test_action'
      );
    });

    it('should include IP address and user agent in logs', () => {
      const mockReqWithDetails = createMockRequest({
        ip: '192.168.1.100',
        headers: {
          'user-agent': 'Mozilla/5.0 Custom Browser',
        },
      });

      logSecurityEvent(mockReqWithDetails, 'suspicious_activity', {});

      expect(mockReqWithDetails.log.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 Custom Browser',
        }),
        'Auth event: suspicious_activity'
      );
    });

    it('should handle missing IP gracefully', () => {
      const mockReqNoIp = createMockRequest({
        ip: undefined,
        connection: { remoteAddress: '10.0.0.1' },
      });

      logUserAction(mockReqNoIp, 'test_action', {});

      expect(mockReqNoIp.log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: '10.0.0.1',
        }),
        'Auth event: test_action'
      );
    });
  });

  describe('Timestamp Generation', () => {
    it('should include ISO timestamp in all logs', () => {
      const beforeTime = Date.now();
      
      logAuthEvent(mockReq, 'timestamp_test', {});
      
      const afterTime = Date.now();
      const callArgs = (mockReq.log.info as Mock).mock.calls[0][0];
      
      expect(callArgs.timestamp).toBeDefined();
      expect(callArgs.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      const logTimestamp = new Date(callArgs.timestamp).getTime();
      expect(logTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(logTimestamp).toBeLessThanOrEqual(afterTime);
    });
  });
});
