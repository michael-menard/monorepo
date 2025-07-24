import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RouteGuard } from '../RouteGuard.js';
import { MemoryRouter, useLocation } from 'react-router-dom';
// Mock useAppSelector
vi.mock('../../../store/index.js', () => ({
    useAppSelector: vi.fn(),
}));
import { useAppSelector as _useAppSelector } from '@/store';
const mockUseAppSelector = _useAppSelector;
function TestComponent() {
    const location = useLocation();
    return _jsxs("div", { "data-testid": "test-component", children: ["Location: ", location.pathname] });
}
describe('RouteGuard', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });
    it('shows loading spinner when not initialized', () => {
        mockUseAppSelector.mockReturnValue({ isAuthenticated: false, isInitialized: false });
        render(_jsx(MemoryRouter, { initialEntries: ["/dashboard"], children: _jsx(RouteGuard, { requireAuth: true, children: _jsx(TestComponent, {}) }) }));
        expect(screen.getByRole('status')).toBeInTheDocument();
    });
    it('redirects to login if not authenticated and requireAuth is true', () => {
        mockUseAppSelector.mockReturnValue({ isAuthenticated: false, isInitialized: true });
        render(_jsx(MemoryRouter, { initialEntries: ["/dashboard"], children: _jsx(RouteGuard, { requireAuth: true, children: _jsx(TestComponent, {}) }) }));
        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
    });
    it('redirects to dashboard if authenticated and accessing /auth', () => {
        mockUseAppSelector.mockReturnValue({ isAuthenticated: true, isInitialized: true });
        render(_jsx(MemoryRouter, { initialEntries: ["/auth/login"], children: _jsx(RouteGuard, { requireAuth: true, children: _jsx(TestComponent, {}) }) }));
        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
    });
    it('renders children if authenticated and not accessing /auth', () => {
        mockUseAppSelector.mockReturnValue({ isAuthenticated: true, isInitialized: true });
        render(_jsx(MemoryRouter, { initialEntries: ["/dashboard"], children: _jsx(RouteGuard, { requireAuth: true, children: _jsx(TestComponent, {}) }) }));
        expect(screen.getByTestId('test-component')).toBeInTheDocument();
    });
});
