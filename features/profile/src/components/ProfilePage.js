import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ProfileSidebar } from './ProfileSidebar.js';
import { ProfileMain } from './ProfileMain.js';
import { ProfileSkeleton } from './ProfileSkeleton.js';
export const ProfilePage = ({ profile, onAvatarUpload, onProfileUpdate, isEditable, loading, children }) => {
    if (loading) {
        return _jsx(ProfileSkeleton, {});
    }
    return (_jsx("div", { className: "container mx-auto px-4 py-8", children: _jsxs("div", { className: "flex flex-col lg:flex-row gap-8", children: [_jsx("div", { className: "lg:w-80 lg:flex-shrink-0", children: _jsx(ProfileSidebar, { profile: profile, onAvatarUpload: onAvatarUpload, onProfileUpdate: onProfileUpdate, isEditable: isEditable }) }), _jsx(ProfileMain, { children: children })] }) }));
};
