import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { cn } from '../lib/utils';
export const ProfileMain = ({ children, className, }) => {
    return (_jsx("div", { className: cn('flex-1 space-y-6', className), children: children }));
};
