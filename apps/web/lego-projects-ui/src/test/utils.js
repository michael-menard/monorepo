import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { vi, expect } from 'vitest';
/**
 * Render function for components with Router
 */
export const renderWithRouter = (ui, options = {}) => {
    const { initialRoute = '/', ...renderOptions } = options;
    if (initialRoute !== '/') {
        window.history.pushState({}, 'Test page', initialRoute);
    }
    const Wrapper = ({ children }) => (_jsx(BrowserRouter, { children: children }));
    return {
        user: userEvent.setup(),
        ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    };
};
/**
 * Simple render for components without any providers
 */
export const renderComponent = (ui, options = {}) => {
    return {
        user: userEvent.setup(),
        ...render(ui, options),
    };
};
// =============================================================================
// TEST DATA FACTORIES
// =============================================================================
/**
 * Factory for creating test user data
 */
export const createMockUser = (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    avatar: 'https://example.com/avatar.jpg',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
});
/**
 * Factory for creating test LEGO set data
 */
export const createMockLegoSet = (overrides = {}) => ({
    id: 'test-set-id',
    setNumber: '75192-1',
    name: 'Millennium Falcon',
    theme: 'Star Wars',
    year: 2017,
    pieces: 7541,
    minifigs: 8,
    price: {
        retail: 799.99,
        current: 899.99,
        currency: 'USD',
    },
    availability: 'retired',
    images: ['https://example.com/set1.jpg'],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
});
/**
 * Factory for creating test API responses
 */
export const createMockApiResponse = (data, overrides = {}) => ({
    status: 200,
    message: 'Success',
    data,
    meta: {
        timestamp: '2024-01-01T00:00:00.000Z',
        requestId: 'test-request-id',
        version: '1.0.0',
    },
    ...overrides,
});
/**
 * Factory for creating test API errors
 */
export const createMockApiError = (overrides = {}) => ({
    status: 400,
    message: 'Bad Request',
    timestamp: '2024-01-01T00:00:00.000Z',
    ...overrides,
});
// =============================================================================
// FORM TESTING HELPERS
// =============================================================================
/**
 * Helper to fill out a form with test data
 */
export const fillForm = async (user, formData) => {
    for (const [field, value] of Object.entries(formData)) {
        const input = document.querySelector(`[name="${field}"]`);
        if (input) {
            await user.clear(input);
            await user.type(input, value);
        }
    }
};
/**
 * Helper to submit a form
 */
export const submitForm = async (user, submitButton) => {
    const button = submitButton || document.querySelector('[type="submit"]');
    if (button) {
        await user.click(button);
    }
};
// =============================================================================
// API MOCK HELPERS
// =============================================================================
/**
 * Helper to mock a successful API response
 */
export const mockApiSuccess = (data, status = 200) => {
    return vi.fn().mockResolvedValue({
        ok: true,
        status,
        json: () => Promise.resolve(createMockApiResponse(data)),
    });
};
/**
 * Helper to mock an API error
 */
export const mockApiError = (error, status = 400) => {
    return vi.fn().mockResolvedValue({
        ok: false,
        status,
        json: () => Promise.resolve(createMockApiError({ message: error, status })),
    });
};
/**
 * Helper to mock network errors
 */
export const mockNetworkError = () => {
    return vi.fn().mockRejectedValue(new Error('Network error'));
};
// =============================================================================
// ACCESSIBILITY TESTING HELPERS
// =============================================================================
/**
 * Helper to test keyboard navigation
 */
export const testKeyboardNavigation = async (user, elements) => {
    for (let i = 0; i < elements.length; i++) {
        await user.tab();
        expect(elements[i]).toHaveFocus();
    }
};
/**
 * Helper to test ARIA attributes
 */
export const expectAriaAttributes = (element, attributes) => {
    Object.entries(attributes).forEach(([attr, value]) => {
        expect(element).toHaveAttribute(attr, value);
    });
};
// =============================================================================
// EXPORTS
// =============================================================================
// Re-export commonly used testing utilities
export { screen, waitFor, within, userEvent, vi, expect };
// Default export for convenience
export default renderComponent;
