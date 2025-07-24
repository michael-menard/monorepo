import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer/index";
export default function MainLayout() {
    return (_jsxs("div", { className: "flex flex-col min-h-screen", children: [_jsx("header", { children: _jsx(Navbar, {}) }), _jsx("main", { className: "flex-1 px-4 py-8", children: _jsx(Outlet, {}) }), _jsx("footer", { children: _jsx(Footer, {}) })] }));
}
