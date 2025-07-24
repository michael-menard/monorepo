/**
 * Zod Schema Validation Tests
 * Tests for all validation schemas to ensure they work correctly
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { LoginSchema, SignupSchema, EmailSchema, PasswordSchema, UserProfileSchema, LegoSetSchema, ApiErrorSchema, ApiSuccessSchema, } from '../schemas.js';
describe('Authentication Schemas', () => {
    describe('EmailSchema', () => {
        it('validates correct email addresses', () => {
            expect(EmailSchema.parse('test@example.com')).toBe('test@example.com');
            expect(EmailSchema.parse('user+tag@domain.co.uk')).toBe('user+tag@domain.co.uk');
        });
        it('rejects invalid email addresses', () => {
            expect(() => EmailSchema.parse('invalid-email')).toThrow();
            expect(() => EmailSchema.parse('test@')).toThrow();
            expect(() => EmailSchema.parse('@example.com')).toThrow();
        });
    });
    describe('PasswordSchema', () => {
        it('validates passwords with minimum length', () => {
            expect(PasswordSchema.parse('password123')).toBe('password123');
            expect(PasswordSchema.parse('verylongpassword')).toBe('verylongpassword');
        });
        it('rejects passwords that are too short', () => {
            expect(() => PasswordSchema.parse('short')).toThrow();
            expect(() => PasswordSchema.parse('1234567')).toThrow();
        });
    });
    describe('LoginSchema', () => {
        it('validates correct login data', () => {
            const validLogin = {
                email: 'test@example.com',
                password: 'password123',
                rememberMe: true,
            };
            const result = LoginSchema.parse(validLogin);
            expect(result).toEqual(validLogin);
        });
        it('provides default for rememberMe', () => {
            const loginWithoutRemember = {
                email: 'test@example.com',
                password: 'password123',
            };
            const result = LoginSchema.parse(loginWithoutRemember);
            expect(result.rememberMe).toBe(false);
        });
        it('rejects invalid login data', () => {
            expect(() => LoginSchema.parse({
                email: 'invalid-email',
                password: 'password123',
            })).toThrow();
            expect(() => LoginSchema.parse({
                email: 'test@example.com',
                password: '',
            })).toThrow();
        });
    });
    describe('SignupSchema', () => {
        it('validates correct signup data', () => {
            const validSignup = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                firstName: 'John',
                lastName: 'Doe',
                acceptTerms: true,
            };
            const result = SignupSchema.parse(validSignup);
            expect(result).toEqual(validSignup);
        });
        it('rejects mismatched passwords', () => {
            const signupWithMismatch = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'different123',
                firstName: 'John',
                lastName: 'Doe',
                acceptTerms: true,
            };
            expect(() => SignupSchema.parse(signupWithMismatch)).toThrow();
        });
        it('requires terms acceptance', () => {
            const signupWithoutTerms = {
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                firstName: 'John',
                lastName: 'Doe',
                acceptTerms: false,
            };
            expect(() => SignupSchema.parse(signupWithoutTerms)).toThrow();
        });
    });
});
describe('User Schemas', () => {
    describe('UserProfileSchema', () => {
        it('validates complete user profile', () => {
            const validProfile = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe123',
                avatar: 'https://example.com/avatar.jpg',
                bio: 'Test bio',
                location: 'Test City',
                website: 'https://johndoe.com',
                socialLinks: {
                    instagram: 'https://instagram.com/johndoe',
                    youtube: 'https://youtube.com/johndoe',
                },
                preferences: {
                    theme: 'dark',
                    emailNotifications: true,
                    publicProfile: false,
                    showEmail: true,
                },
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
            };
            const result = UserProfileSchema.parse(validProfile);
            expect(result).toEqual(validProfile);
        });
        it('validates minimal user profile', () => {
            const minimalProfile = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe123',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
            };
            const result = UserProfileSchema.parse(minimalProfile);
            expect(result.firstName).toBe('John');
            expect(result.lastName).toBe('Doe');
        });
        it('rejects invalid username format', () => {
            const profileWithBadUsername = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                username: 'john-doe!', // Invalid characters
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
            };
            expect(() => UserProfileSchema.parse(profileWithBadUsername)).toThrow();
        });
    });
});
describe('LEGO Schemas', () => {
    describe('LegoSetSchema', () => {
        it('validates complete LEGO set', () => {
            const validSet = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                setNumber: '75192-1',
                name: 'Millennium Falcon',
                theme: 'Star Wars',
                subtheme: 'Ultimate Collector Series',
                year: 2017,
                pieces: 7541,
                minifigs: 8,
                price: {
                    retail: 799.99,
                    current: 1200.00,
                    currency: 'USD',
                },
                availability: 'retired',
                images: ['https://example.com/set1.jpg', 'https://example.com/set2.jpg'],
                description: 'Ultimate Collector Series Millennium Falcon',
                instructions: 'https://example.com/instructions.pdf',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
            };
            const result = LegoSetSchema.parse(validSet);
            expect(result).toEqual(validSet);
        });
        it('rejects invalid set number format', () => {
            const setWithBadNumber = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                setNumber: '12345', // Missing dash and digit
                name: 'Test Set',
                theme: 'Test Theme',
                year: 2020,
                pieces: 100,
                minifigs: 0,
                availability: 'available',
                images: ['https://example.com/test.jpg'],
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
            };
            expect(() => LegoSetSchema.parse(setWithBadNumber)).toThrow();
        });
        it('rejects future years', () => {
            const setWithFutureYear = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                setNumber: '12345-1',
                name: 'Future Set',
                theme: 'Test Theme',
                year: 2030, // Too far in the future
                pieces: 100,
                minifigs: 0,
                availability: 'available',
                images: ['https://example.com/test.jpg'],
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
            };
            expect(() => LegoSetSchema.parse(setWithFutureYear)).toThrow();
        });
    });
});
describe('API Response Schemas', () => {
    describe('ApiErrorSchema', () => {
        it('validates API error responses', () => {
            const validError = {
                status: 400,
                message: 'Bad Request',
                code: 'INVALID_INPUT',
                details: { field: 'email', reason: 'invalid format' },
                timestamp: '2024-01-01T00:00:00.000Z',
            };
            const result = ApiErrorSchema.parse(validError);
            expect(result).toEqual(validError);
        });
        it('validates minimal error response', () => {
            const minimalError = {
                status: 500,
                message: 'Internal Server Error',
                timestamp: '2024-01-01T00:00:00.000Z',
            };
            const result = ApiErrorSchema.parse(minimalError);
            expect(result.status).toBe(500);
            expect(result.message).toBe('Internal Server Error');
        });
        it('rejects invalid status codes', () => {
            const errorWithBadStatus = {
                status: 200, // Success status in error schema
                message: 'Not an error',
                timestamp: '2024-01-01T00:00:00.000Z',
            };
            expect(() => ApiErrorSchema.parse(errorWithBadStatus)).toThrow();
        });
    });
    describe('ApiSuccessSchema', () => {
        it('validates API success responses', () => {
            const stringSchema = z.string();
            const successSchema = ApiSuccessSchema(stringSchema);
            const validSuccess = {
                status: 200,
                message: 'Success',
                data: 'test data',
                meta: {
                    timestamp: '2024-01-01T00:00:00.000Z',
                    requestId: 'req-123',
                    version: '1.0.0',
                },
            };
            const result = successSchema.parse(validSuccess);
            expect(result.data).toBe('test data');
            expect(result.status).toBe(200);
        });
    });
});
