import { jsx as _jsx } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
export default function AuthLayout() {
    return (_jsx("div", { className: "auth-layout min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8", children: _jsx("div", { className: "max-w-md w-full space-y-8", children: _jsx(Outlet, {}) }) }));
}
