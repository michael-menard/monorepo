import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../lib/utils.js';
export const ProfileMain = ({ children, className, }) => {
    return (_jsx("div", { className: cn('flex-1 space-y-6', className), children: children }));
};
