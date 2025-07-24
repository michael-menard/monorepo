/**
 * Vitest Test Setup Configuration
 * Sets up testing environment, global mocks, and utilities
 */
import '@testing-library/jest-dom';
export declare const mockFetch: (response: unknown, ok?: boolean, status?: number) => void;
export declare const mockFetchError: (error?: Error) => void;
