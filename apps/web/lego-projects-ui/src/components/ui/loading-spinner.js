import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
export const LoadingSpinner = React.memo(({ size = 'md', color = 'primary', className = '' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8'
    };
    const colorClasses = {
        primary: 'text-blue-600',
        secondary: 'text-gray-600',
        white: 'text-white'
    };
    return (_jsx("div", { className: `inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] ${sizeClasses[size]} ${colorClasses[color]} ${className}`, role: "status", "aria-label": "Loading", children: _jsx("span", { className: "!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]", children: "Loading..." }) }));
});
LoadingSpinner.displayName = 'LoadingSpinner';
