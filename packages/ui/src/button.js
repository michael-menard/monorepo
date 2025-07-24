import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
export const Button = React.memo(React.forwardRef(({ variant = 'default', size = 'default', className = '', children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    const variantClasses = {
        default: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
        ghost: 'text-gray-700 hover:text-blue-600 hover:bg-gray-100 focus:ring-blue-500',
        destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
    };
    const sizeClasses = {
        default: 'px-4 py-2 text-sm',
        sm: 'px-3 py-1.5 text-sm',
        lg: 'px-6 py-3 text-base'
    };
    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
    return (_jsx("button", { ref: ref, className: classes, ...props, children: children }));
}));
Button.displayName = 'Button';
