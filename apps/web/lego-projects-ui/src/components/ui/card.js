import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
export const Card = React.forwardRef(({ children, className = '', ...props }, ref) => {
    return (_jsx("div", { ref: ref, className: `bg-white rounded-lg border border-gray-200 shadow-sm ${className}`, ...props, children: children }));
});
export const CardHeader = React.forwardRef(({ children, className = '', ...props }, ref) => {
    return (_jsx("div", { ref: ref, className: `px-6 py-4 border-b border-gray-200 ${className}`, ...props, children: children }));
});
export const CardTitle = React.forwardRef(({ children, className = '', ...props }, ref) => {
    return (_jsx("h3", { ref: ref, className: `text-lg font-semibold text-gray-900 ${className}`, ...props, children: children }));
});
export const CardDescription = React.forwardRef(({ children, className = '', ...props }, ref) => {
    return (_jsx("p", { ref: ref, className: `text-sm text-gray-600 mt-1 ${className}`, ...props, children: children }));
});
export const CardContent = React.forwardRef(({ children, className = '', ...props }, ref) => {
    return (_jsx("div", { ref: ref, className: `px-6 py-4 ${className}`, ...props, children: children }));
});
Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardTitle.displayName = 'CardTitle';
CardDescription.displayName = 'CardDescription';
CardContent.displayName = 'CardContent';
