import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MainLayout from '../MainLayout.js';

// Mock Navbar and Footer for isolation if needed
vi.mock('@/components/Navbar', () => ({
  default: () => <nav data-testid="navbar">Mock Navbar</nav>,
}));
vi.mock('@/components/Footer/index', () => ({
  __esModule: true,
  default: () => <footer data-testid="footer">Mock Footer</footer>,
}));

describe('MainLayout', () => {
  it('renders Navbar, Footer, and Outlet content', () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<div data-testid="outlet-content">Outlet Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
    expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
  });
}); 