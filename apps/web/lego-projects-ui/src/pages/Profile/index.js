import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import { useLogoutMutation } from '@/services/authApi';
export default function ProfileLayout() {
    const [logout, { isLoading }] = useLogoutMutation();
    const handleLogout = async () => {
        try {
            await logout().unwrap();
            // Optionally redirect to login page
            window.location.href = '/auth/login';
        }
        catch (error) {
            console.error('Logout failed:', error);
        }
    };
    return (_jsx("div", { className: "profile-layout min-h-screen bg-gray-50", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: _jsxs("div", { className: "flex", children: [_jsx("div", { className: "w-64 flex-shrink-0", children: _jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsxs("div", { className: "flex items-center mb-6", children: [_jsx("div", { className: "h-12 w-12 bg-indigo-600 rounded-full flex items-center justify-center", children: _jsx("span", { className: "text-white font-medium", children: "JD" }) }), _jsxs("div", { className: "ml-3", children: [_jsx("h3", { className: "text-lg font-medium text-gray-900", children: "John Doe" }), _jsx("p", { className: "text-sm text-gray-500", children: "@john_doe" })] })] }), _jsxs("nav", { className: "space-y-2", children: [_jsx("a", { href: "/profile", className: "block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50", children: "Overview" }), _jsx("a", { href: "/profile/settings", className: "block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50", children: "Settings" }), _jsx("a", { href: "/profile/collections", className: "block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50", children: "My Collections" }), _jsx("a", { href: "/profile/history", className: "block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50", children: "Activity History" })] }), _jsx("div", { className: "mt-6 pt-6 border-t border-gray-200", children: _jsx("button", { onClick: handleLogout, disabled: isLoading, className: "w-full flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50", children: isLoading ? 'Signing out...' : 'Sign out' }) })] }) }), _jsx("div", { className: "flex-1 ml-8", children: _jsx(Outlet, {}) })] }) }) }));
}
