import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createBrowserRouter, Outlet } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout.js';
import { RouteGuard } from '../components/RouteGuard.js';
import Login from '../pages/Auth/Login/index.js';
import Signup from '../pages/Auth/Signup/index.js';
import ForgotPassword from '../pages/Auth/ForgotPassword/index.js';
import InstructionsList from '../pages/Instructions/InstructionsList.js';
import CreateInstruction from '../pages/Instructions/CreateInstruction.js';
import InspirationGallery from '../pages/Inspiration/InspirationGallery.js';
import ProfileMain from '../pages/Profile/ProfileMain.js';
import ProfileDemo from '../pages/Profile/ProfileDemo.js';
import ResetPassword from '../pages/Auth/ResetPassword.js';
import EmailVerification from '../pages/Auth/EmailVerification.js';
import ProjectsPage from '../pages/Projects/ProjectsPage.js';
import WishlistPage from '../pages/Wishlist/WishlistPage.js';
import SocialPage from '../pages/Social/SocialPage.js';
export const router = createBrowserRouter([
    {
        path: '/',
        element: _jsx(MainLayout, {}), // Use MainLayout as the root layout
        children: [
            // Public routes (no protection)
            {
                index: true,
                element: (_jsxs("div", { className: "text-center", children: [_jsx("h1", { className: "text-3xl font-bold", children: "Welcome to Lego Projects" }), _jsx("p", { className: "mt-4", children: "Your ultimate Lego building companion" })] }))
            },
            {
                path: 'auth',
                children: [
                    { path: 'login', element: _jsx(Login, {}) },
                    { path: 'signup', element: _jsx(Signup, {}) },
                    { path: 'forgot-password', element: _jsx(ForgotPassword, {}) },
                    { path: 'reset-password/:token', element: _jsx(ResetPassword, {}) },
                    { path: 'email-verification', element: _jsx(EmailVerification, {}) },
                ]
            },
            // Protected routes (require authentication)
            {
                path: 'instructions',
                element: (_jsx(RouteGuard, { requireAuth: true, children: _jsx(Outlet, {}) })),
                children: [
                    { index: true, element: _jsx(InstructionsList, {}) },
                    { path: 'create', element: _jsx(CreateInstruction, {}) },
                ]
            },
            {
                path: 'projects',
                element: (_jsx(RouteGuard, { requireAuth: true, children: _jsx(ProjectsPage, {}) })),
            },
            {
                path: 'inspiration',
                element: (_jsx(RouteGuard, { requireAuth: true, children: _jsx(Outlet, {}) })),
                children: [
                    { index: true, element: _jsx(InspirationGallery, {}) },
                ]
            },
            {
                path: 'wishlist',
                element: (_jsx(RouteGuard, { requireAuth: true, children: _jsx(WishlistPage, {}) })),
            },
            {
                path: 'social',
                element: (_jsx(RouteGuard, { requireAuth: true, children: _jsx(SocialPage, {}) })),
            },
            {
                path: 'profile',
                element: (_jsx(RouteGuard, { requireAuth: true, children: _jsx(Outlet, {}) })),
                children: [
                    { index: true, element: _jsx(ProfileMain, {}) },
                    { path: 'demo', element: _jsx(ProfileDemo, {}) },
                ]
            },
            // Admin routes (for future use)
            {
                path: 'admin',
                element: (_jsx(RouteGuard, { requireAuth: true, children: _jsxs("div", { className: "text-center p-8", children: [_jsx("h1", { className: "text-2xl font-bold mb-4", children: "Admin Dashboard" }), _jsx("p", { className: "text-gray-600", children: "Admin functionality coming soon..." })] }) })),
            },
        ]
    },
]);
