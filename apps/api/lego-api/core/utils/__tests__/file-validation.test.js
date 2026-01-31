/**
 * File Validation Utilities Tests
 *
 * Story: WISH-2013 - File Upload Security Hardening
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateMimeType, validateFileSize, validateFileUpload, logSecurityEvent, createSecurityEvent, ALLOWED_MIME_TYPES, MAX_FILE_SIZE, MIN_FILE_SIZE, } from '../file-validation.js';
// Mock logger
vi.mock('@repo/logger', () => ({
    logger: {
        warn: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));
describe('validateMimeType', () => {
    describe('valid MIME types', () => {
        it('should accept image/jpeg', () => {
            const result = validateMimeType('image/jpeg');
            expect(result).toEqual({ valid: true });
        });
        it('should accept image/png', () => {
            const result = validateMimeType('image/png');
            expect(result).toEqual({ valid: true });
        });
        it('should accept image/webp', () => {
            const result = validateMimeType('image/webp');
            expect(result).toEqual({ valid: true });
        });
        it('should accept uppercase MIME types (case insensitive)', () => {
            const result = validateMimeType('IMAGE/JPEG');
            expect(result).toEqual({ valid: true });
        });
        it('should accept mixed case MIME types', () => {
            const result = validateMimeType('Image/Png');
            expect(result).toEqual({ valid: true });
        });
        it('should accept image/jpg as alias for image/jpeg', () => {
            const result = validateMimeType('image/jpg');
            expect(result).toEqual({ valid: true });
        });
        it('should accept MIME type with leading/trailing whitespace', () => {
            const result = validateMimeType('  image/jpeg  ');
            expect(result).toEqual({ valid: true });
        });
    });
    describe('invalid MIME types', () => {
        it('should reject application/pdf', () => {
            const result = validateMimeType('application/pdf');
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.code).toBe('INVALID_MIME_TYPE');
                expect(result.error).toContain('Unsupported file type');
            }
        });
        it('should reject text/html (potential XSS vector)', () => {
            const result = validateMimeType('text/html');
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.code).toBe('INVALID_MIME_TYPE');
            }
        });
        it('should reject application/x-executable', () => {
            const result = validateMimeType('application/x-executable');
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.code).toBe('INVALID_MIME_TYPE');
            }
        });
        it('should reject application/javascript', () => {
            const result = validateMimeType('application/javascript');
            expect(result.valid).toBe(false);
        });
        it('should reject text/plain', () => {
            const result = validateMimeType('text/plain');
            expect(result.valid).toBe(false);
        });
        it('should reject image/gif (not in whitelist)', () => {
            // GIF removed from whitelist for security hardening
            const result = validateMimeType('image/gif');
            expect(result.valid).toBe(false);
        });
        it('should reject image/svg+xml (potential XSS)', () => {
            const result = validateMimeType('image/svg+xml');
            expect(result.valid).toBe(false);
        });
    });
    describe('edge cases', () => {
        it('should reject null MIME type', () => {
            const result = validateMimeType(null);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.code).toBe('MISSING_MIME_TYPE');
            }
        });
        it('should reject undefined MIME type', () => {
            const result = validateMimeType(undefined);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.code).toBe('MISSING_MIME_TYPE');
            }
        });
        it('should reject empty string MIME type', () => {
            const result = validateMimeType('');
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.code).toBe('MISSING_MIME_TYPE');
            }
        });
        it('should reject whitespace-only MIME type', () => {
            const result = validateMimeType('   ');
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.code).toBe('MISSING_MIME_TYPE');
            }
        });
        it('should return error message listing allowed types', () => {
            const result = validateMimeType('application/octet-stream');
            expect(result.valid).toBe(false);
            if (!result.valid) {
                for (const type of ALLOWED_MIME_TYPES) {
                    expect(result.error).toContain(type);
                }
            }
        });
    });
});
describe('validateFileSize', () => {
    describe('valid file sizes', () => {
        it('should accept 1 byte file (minimum)', () => {
            const result = validateFileSize(MIN_FILE_SIZE);
            expect(result).toEqual({ valid: true });
        });
        it('should accept small file (1KB)', () => {
            const result = validateFileSize(1024);
            expect(result).toEqual({ valid: true });
        });
        it('should accept medium file (5MB)', () => {
            const result = validateFileSize(5 * 1024 * 1024);
            expect(result).toEqual({ valid: true });
        });
        it('should accept exactly 10MB (boundary)', () => {
            const result = validateFileSize(MAX_FILE_SIZE);
            expect(result).toEqual({ valid: true });
        });
        it('should accept 9.9MB (just under limit)', () => {
            const result = validateFileSize(Math.floor(9.9 * 1024 * 1024));
            expect(result).toEqual({ valid: true });
        });
    });
    describe('invalid file sizes', () => {
        it('should reject 0 bytes (empty file)', () => {
            const result = validateFileSize(0);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.code).toBe('FILE_TOO_SMALL');
                expect(result.error).toContain('empty');
            }
        });
        it('should reject 10MB + 1 byte (just over limit)', () => {
            const result = validateFileSize(MAX_FILE_SIZE + 1);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.code).toBe('FILE_TOO_LARGE');
                expect(result.error).toContain('10MB');
            }
        });
        it('should reject 15MB file', () => {
            const result = validateFileSize(15 * 1024 * 1024);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.code).toBe('FILE_TOO_LARGE');
            }
        });
        it('should reject 100MB file', () => {
            const result = validateFileSize(100 * 1024 * 1024);
            expect(result.valid).toBe(false);
        });
    });
    describe('edge cases', () => {
        it('should reject null file size', () => {
            const result = validateFileSize(null);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.code).toBe('MISSING_FILE_SIZE');
            }
        });
        it('should reject undefined file size', () => {
            const result = validateFileSize(undefined);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.code).toBe('MISSING_FILE_SIZE');
            }
        });
        it('should reject negative file size', () => {
            const result = validateFileSize(-1);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.code).toBe('FILE_TOO_SMALL');
            }
        });
    });
});
describe('validateFileUpload', () => {
    it('should pass when both MIME type and size are valid', () => {
        const result = validateFileUpload('image/jpeg', 5 * 1024 * 1024);
        expect(result).toEqual({ valid: true });
    });
    it('should fail on invalid MIME type (checked first)', () => {
        const result = validateFileUpload('application/pdf', 5 * 1024 * 1024);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.code).toBe('INVALID_MIME_TYPE');
        }
    });
    it('should fail on oversized file (after MIME check passes)', () => {
        const result = validateFileUpload('image/jpeg', 15 * 1024 * 1024);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.code).toBe('FILE_TOO_LARGE');
        }
    });
    it('should fail on missing MIME type before checking size', () => {
        const result = validateFileUpload(null, 5 * 1024 * 1024);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.code).toBe('MISSING_MIME_TYPE');
        }
    });
});
describe('createSecurityEvent', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-31T12:00:00.000Z'));
    });
    it('should create event with required fields', () => {
        const event = createSecurityEvent({
            userId: 'user-123',
            fileName: 'malicious.exe',
            rejectionReason: 'Invalid MIME type',
            sourceMethod: 'presign',
        });
        expect(event.userId).toBe('user-123');
        expect(event.fileName).toBe('malicious.exe');
        expect(event.rejectionReason).toBe('Invalid MIME type');
        expect(event.sourceMethod).toBe('presign');
        expect(event.timestamp).toBe('2026-01-31T12:00:00.000Z');
    });
    it('should include optional fields when provided', () => {
        const event = createSecurityEvent({
            userId: 'user-123',
            fileName: 'large-file.jpg',
            rejectionReason: 'File too large',
            fileSize: 15 * 1024 * 1024,
            mimeType: 'image/jpeg',
            ipAddress: '192.168.1.1',
            sourceMethod: 'upload',
        });
        expect(event.fileSize).toBe(15 * 1024 * 1024);
        expect(event.mimeType).toBe('image/jpeg');
        expect(event.ipAddress).toBe('192.168.1.1');
    });
    afterEach(() => {
        vi.useRealTimers();
    });
});
describe('logSecurityEvent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('should log security event with namespace', async () => {
        const { logger } = await import('@repo/logger');
        const event = createSecurityEvent({
            userId: 'user-123',
            fileName: 'test.exe',
            rejectionReason: 'Invalid MIME type',
            sourceMethod: 'presign',
        });
        logSecurityEvent(event);
        expect(logger.warn).toHaveBeenCalledWith('Security event: file validation failure', expect.objectContaining({
            userId: 'user-123',
            fileName: 'test.exe',
            category: 'validation_failure',
            namespace: 'security',
        }));
    });
});
describe('constants', () => {
    it('should have MAX_FILE_SIZE as 10MB', () => {
        expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });
    it('should have MIN_FILE_SIZE as 1 byte', () => {
        expect(MIN_FILE_SIZE).toBe(1);
    });
    it('should have 3 allowed MIME types', () => {
        expect(ALLOWED_MIME_TYPES).toHaveLength(3);
        expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
        expect(ALLOWED_MIME_TYPES).toContain('image/png');
        expect(ALLOWED_MIME_TYPES).toContain('image/webp');
    });
});
