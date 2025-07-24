import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAppSelector } from '@/store';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
export default function Navbar() {
    const navigate = useNavigate();
    const authState = useAppSelector(state => state.auth);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    // Use auth state values
    const { isAuthenticated, isLoading } = authState;
    const navigationItems = [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/instructions', label: 'Instructions' },
        { path: '/gallery', label: 'Gallery' },
        { path: '/projects', label: 'Projects' },
        { path: '/wishlist', label: 'Wishlist' },
        { path: '/social', label: 'Social' },
    ];
    const handleDrawerToggle = () => {
        setIsDrawerOpen(!isDrawerOpen);
    };
    return (_jsx("nav", { className: "bg-card shadow-md border-b", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "flex justify-between h-16", children: [_jsx(motion.div, { className: "flex items-center", whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, children: _jsx(Link, { to: "/", className: "text-xl font-bold text-primary hover:text-primary/80 transition-colors", children: "LEGO Projects" }) }), _jsx("div", { className: "hidden md:flex items-center space-x-8", children: isAuthenticated && navigationItems.map((item) => (_jsx(Link, { to: item.path, className: "text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium", children: item.label }, item.path))) }), _jsxs("div", { className: "flex items-center space-x-4", children: [isLoading && (_jsx(LoadingSpinner, { size: "sm" })), _jsx("div", { className: "hidden md:flex items-center space-x-4", children: isAuthenticated ? (_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(Link, { to: "/profile", className: "text-muted-foreground hover:text-foreground transition-colors duration-200", children: "Profile" }), _jsx("button", { onClick: () => navigate('/auth/login'), className: "text-muted-foreground hover:text-foreground transition-colors duration-200", children: "Logout" })] })) : (_jsxs("div", { className: "flex space-x-3", children: [_jsx(Link, { to: "/auth/login", className: "text-muted-foreground hover:text-foreground transition-colors duration-200", children: "Sign In" }), _jsx(Link, { to: "/auth/signup", className: "bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors duration-200", children: "Sign Up" })] })) }), _jsx("button", { className: "md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200", onClick: handleDrawerToggle, "aria-label": "Open mobile menu", children: _jsx("svg", { className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 6h16M4 12h16M4 18h16" }) }) })] })] }) }) }));
}
