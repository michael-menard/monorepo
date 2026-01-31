/**
 * File Validation Utilities
 *
 * Whitelist-based MIME type and file size validation for secure file uploads.
 * Used by the wishlist presign endpoint and other upload features.
 *
 * Story: WISH-2013 - File Upload Security Hardening
 */
import { z } from 'zod';
import { logger } from '@repo/logger';
// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Allowed MIME types for image uploads (whitelist).
 * Only these types are permitted for upload.
 */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/**
 * MIME type aliases that map to allowed types.
 * These are accepted but normalized to the primary type.
 */
export const MIME_TYPE_ALIASES = {
    'image/jpg': 'image/jpeg',
};
/**
 * Maximum file size in bytes (10MB).
 * Files larger than this will be rejected.
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
/**
 * Minimum file size in bytes (1 byte).
 * Zero-byte files are rejected.
 */
export const MIN_FILE_SIZE = 1;
// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Schema for validation result
 */
export const ValidationResultSchema = z.discriminatedUnion('valid', [
    z.object({
        valid: z.literal(true),
    }),
    z.object({
        valid: z.literal(false),
        error: z.string(),
        code: z.enum([
            'INVALID_MIME_TYPE',
            'FILE_TOO_LARGE',
            'FILE_TOO_SMALL',
            'MISSING_MIME_TYPE',
            'MISSING_FILE_SIZE',
        ]),
    }),
]);
/**
 * Schema for security log event
 */
export const SecurityLogEventSchema = z.object({
    userId: z.string(),
    fileName: z.string(),
    rejectionReason: z.string(),
    fileSize: z.number().optional(),
    mimeType: z.string().optional(),
    timestamp: z.string().datetime(),
    ipAddress: z.string().optional(),
    sourceMethod: z.string(),
});
// ─────────────────────────────────────────────────────────────────────────────
// Validation Functions
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Validates a MIME type against the allowed whitelist.
 *
 * @param mimeType - The MIME type to validate
 * @returns ValidationResult indicating if the MIME type is allowed
 *
 * @example
 * const result = validateMimeType('image/jpeg')
 * // { valid: true }
 *
 * @example
 * const result = validateMimeType('application/pdf')
 * // { valid: false, error: 'Unsupported file type...', code: 'INVALID_MIME_TYPE' }
 */
export function validateMimeType(mimeType) {
    if (!mimeType || mimeType.trim() === '') {
        return {
            valid: false,
            error: 'MIME type is required',
            code: 'MISSING_MIME_TYPE',
        };
    }
    const normalizedType = mimeType.toLowerCase().trim();
    // Check for aliases first
    const aliasedType = MIME_TYPE_ALIASES[normalizedType];
    if (aliasedType && ALLOWED_MIME_TYPES.includes(aliasedType)) {
        return { valid: true };
    }
    // Check against whitelist
    if (ALLOWED_MIME_TYPES.includes(normalizedType)) {
        return { valid: true };
    }
    return {
        valid: false,
        error: `Unsupported file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        code: 'INVALID_MIME_TYPE',
    };
}
/**
 * Validates a file size against the allowed limits.
 *
 * @param sizeBytes - The file size in bytes
 * @returns ValidationResult indicating if the file size is within limits
 *
 * @example
 * const result = validateFileSize(5 * 1024 * 1024) // 5MB
 * // { valid: true }
 *
 * @example
 * const result = validateFileSize(15 * 1024 * 1024) // 15MB
 * // { valid: false, error: 'File size exceeds...', code: 'FILE_TOO_LARGE' }
 */
export function validateFileSize(sizeBytes) {
    if (sizeBytes === undefined || sizeBytes === null) {
        return {
            valid: false,
            error: 'File size is required',
            code: 'MISSING_FILE_SIZE',
        };
    }
    if (sizeBytes < MIN_FILE_SIZE) {
        return {
            valid: false,
            error: 'File cannot be empty (0 bytes)',
            code: 'FILE_TOO_SMALL',
        };
    }
    if (sizeBytes > MAX_FILE_SIZE) {
        const maxMB = MAX_FILE_SIZE / 1024 / 1024;
        return {
            valid: false,
            error: `File size exceeds maximum limit of ${maxMB}MB`,
            code: 'FILE_TOO_LARGE',
        };
    }
    return { valid: true };
}
/**
 * Validates both MIME type and file size in a single call.
 *
 * @param mimeType - The MIME type to validate
 * @param sizeBytes - The file size in bytes
 * @returns ValidationResult indicating if both checks pass
 */
export function validateFileUpload(mimeType, sizeBytes) {
    const mimeResult = validateMimeType(mimeType);
    if (!mimeResult.valid) {
        return mimeResult;
    }
    return validateFileSize(sizeBytes);
}
// ─────────────────────────────────────────────────────────────────────────────
// Security Logging
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Logs a security event for file validation failures.
 *
 * Structured logging for CloudWatch analysis.
 * Categories: validation_failure, virus_detection, s3_policy_denial
 *
 * @param event - Security event data
 */
export function logSecurityEvent(event) {
    logger.warn('Security event: file validation failure', {
        ...event,
        category: 'validation_failure',
        namespace: 'security',
    });
}
/**
 * Creates a standardized security log event for file rejection.
 *
 * @param params - Event parameters
 * @returns SecurityLogEvent ready for logging
 */
export function createSecurityEvent(params) {
    return {
        ...params,
        timestamp: new Date().toISOString(),
    };
}
