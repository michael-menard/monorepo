import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
const Input = React.forwardRef(({ icon: Icon, ...props }, ref) => {
    return (_jsxs("div", { className: "relative", children: [Icon && (_jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400", children: _jsx(Icon, { className: "w-5 h-5" }) })), _jsx("input", { ref: ref, className: `w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors duration-200 bg-white text-gray-900 placeholder-gray-400 ${props.className || ""}`, ...props })] }));
});
Input.displayName = "Input";
export default Input;
