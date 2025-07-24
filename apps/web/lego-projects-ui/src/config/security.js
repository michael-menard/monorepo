// Security configuration for the application
export const SECURITY_CONFIG = {
    // Token configuration
    TOKEN: {
        ACCESS_TOKEN_KEY: 'access_token',
        REFRESH_TOKEN_KEY: 'refresh_token',
        TOKEN_EXPIRY_BUFFER: 5 * 60 * 1000, // 5 minutes before expiry
    },
    // Password requirements
    PASSWORD: {
        MIN_LENGTH: 8,
        REQUIRE_UPPERCASE: true,
        REQUIRE_LOWERCASE: true,
        REQUIRE_NUMBERS: true,
        REQUIRE_SPECIAL_CHARS: true,
        SPECIAL_CHARS: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
    },
    // Rate limiting
    RATE_LIMIT: {
        LOGIN_ATTEMPTS: 5,
        LOGIN_TIMEOUT: 15 * 60 * 1000, // 15 minutes
        SIGNUP_ATTEMPTS: 3,
        SIGNUP_TIMEOUT: 60 * 60 * 1000, // 1 hour
    },
    // Session management
    SESSION: {
        INACTIVITY_TIMEOUT: 30 * 60 * 1000, // 30 minutes
        MAX_SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours
    },
    // API endpoints that require authentication
    PROTECTED_ROUTES: [
        '/api/auth/refresh',
        '/api/auth/logout',
        '/api/user/profile',
        '/api/user/settings',
    ],
    // CORS configuration
    CORS: {
        ALLOWED_ORIGINS: [
            'http://localhost:3000',
            'http://localhost:5173',
            'https://yourdomain.com',
        ],
        ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE'],
        ALLOWED_HEADERS: ['Content-Type', 'Authorization'],
        CREDENTIALS: true,
    },
};
// Security utility functions
export const SecurityUtils = {
    // Validate password strength
    validatePassword: (password) => {
        const errors = [];
        const config = SECURITY_CONFIG.PASSWORD;
        if (password.length < config.MIN_LENGTH) {
            errors.push(`Password must be at least ${config.MIN_LENGTH} characters long`);
        }
        if (config.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (config.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (config.REQUIRE_NUMBERS && !/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        if (config.REQUIRE_SPECIAL_CHARS && !config.SPECIAL_CHARS.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    },
    // Sanitize user input
    sanitizeInput: (input) => {
        return input
            .trim()
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, ''); // Remove event handlers
    },
    // Validate email format
    validateEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    // Generate secure random string
    generateSecureToken: (length = 32) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },
    // Check if token is expired
    isTokenExpired: (token) => {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiryTime = payload.exp * 1000; // Convert to milliseconds
            const currentTime = Date.now();
            return currentTime >= expiryTime - SECURITY_CONFIG.TOKEN.TOKEN_EXPIRY_BUFFER;
        }
        catch {
            return true; // Invalid token is considered expired
        }
    },
};
// Rate limiting utilities
export class RateLimiter {
    attempts = new Map();
    isAllowed(key, maxAttempts, timeout) {
        const now = Date.now();
        const attempt = this.attempts.get(key);
        if (!attempt) {
            this.attempts.set(key, { count: 1, firstAttempt: now });
            return true;
        }
        // Reset if timeout has passed
        if (now - attempt.firstAttempt > timeout) {
            this.attempts.set(key, { count: 1, firstAttempt: now });
            return true;
        }
        // Check if max attempts exceeded
        if (attempt.count >= maxAttempts) {
            return false;
        }
        // Increment attempt count
        attempt.count++;
        return true;
    }
    clearAttempts(key) {
        this.attempts.delete(key);
    }
    getRemainingAttempts(key) {
        const attempt = this.attempts.get(key);
        if (!attempt)
            return SECURITY_CONFIG.RATE_LIMIT.LOGIN_ATTEMPTS;
        return Math.max(0, SECURITY_CONFIG.RATE_LIMIT.LOGIN_ATTEMPTS - attempt.count);
    }
}
// Export rate limiter instance
export const rateLimiter = new RateLimiter();
