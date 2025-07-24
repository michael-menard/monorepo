import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from '../Footer/index';
describe('Footer', () => {
    it('renders social media and legal links', () => {
        render(_jsx(Footer, {}));
        expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
        expect(screen.getByText(/terms of service/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/twitter/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/github/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/linkedin/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/instagram/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/contact/i)).toBeInTheDocument();
    });
});
