import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
export default function InspirationLayout() {
    return (_jsx("div", { className: "inspiration-layout min-h-screen bg-gray-50", children: _jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "Inspiration Gallery" }), _jsx("p", { className: "mt-2 text-lg text-gray-600", children: "Discover amazing Lego creations and get inspired for your next build" })] }), _jsx(Outlet, {})] }) }));
}
