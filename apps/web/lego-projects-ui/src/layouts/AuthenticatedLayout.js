import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
export default function AuthenticatedLayout({ children }) {
    return (_jsxs("div", { className: "min-h-screen bg-gray-100 flex flex-col", children: [_jsx("header", { className: "bg-white shadow", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 py-4", children: _jsx(Navbar, {}) }) }), _jsx("main", { className: "flex-1 px-4 py-8", children: children }), _jsx(Footer, {})] }));
}
