import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MainLayout from '../MainLayout';
// Mock Navbar and Footer for isolation if needed
vi.mock('@/components/Navbar', () => ({
    default: () => _jsx("nav", { "data-testid": "navbar", children: "Mock Navbar" }),
}));
vi.mock('@/components/Footer/index', () => ({
    __esModule: true,
    default: () => _jsx("footer", { "data-testid": "footer", children: "Mock Footer" }),
}));
describe('MainLayout', () => {
    it('renders Navbar, Footer, and Outlet content', () => {
        render(_jsx(MemoryRouter, { initialEntries: ["/"], children: _jsx(Routes, { children: _jsx(Route, { element: _jsx(MainLayout, {}), children: _jsx(Route, { index: true, element: _jsx("div", { "data-testid": "outlet-content", children: "Outlet Content" }) }) }) }) }));
        expect(screen.getByTestId('navbar')).toBeInTheDocument();
        expect(screen.getByTestId('footer')).toBeInTheDocument();
        expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
    });
});
