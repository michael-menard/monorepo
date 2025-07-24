import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useUploadAvatarMutation } from '@/services/userApi';
import { ProfilePage } from '../../../../packages/profile/src/index.js';
// Remove the placeholder ProfilePage component since we're now importing the real one
// const ProfilePage: React.FC<{ children: React.ReactNode; [key: string]: any }> = ({ children }) => <div>{children}</div>;
const ProfileDemo = () => {
    const [profile, setProfile] = useState({
        id: '1',
        username: 'johndoe',
        displayName: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        stats: {
            projects: 12,
            followers: 150,
            following: 89,
        },
    });
    const [uploadAvatar] = useUploadAvatarMutation();
    const handleAvatarUpload = async (file) => {
        try {
            const result = await uploadAvatar({ userId: profile.id, file }).unwrap();
            // Update the profile with new avatar URL
            setProfile((prev) => ({ ...prev, avatarUrl: result.avatarUrl }));
            return result.avatarUrl;
        }
        catch (error) {
            console.error('Avatar upload failed:', error);
            throw error;
        }
    };
    const handleProfileUpdate = async (data) => {
        // In a real app, you would update the profile in your backend
        setProfile((prev) => ({ ...prev, ...data }));
    };
    return (_jsx(ProfilePage, { profile: profile, onAvatarUpload: handleAvatarUpload, onProfileUpdate: handleProfileUpdate, isEditable: true, children: _jsxs("div", { className: "space-y-6", children: [_jsx("h2", { className: "text-2xl font-bold", children: "My LEGO Projects" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: Array.from({ length: 6 }).map((_, i) => (_jsxs("div", { className: "bg-white rounded-lg shadow-md p-4", children: [_jsx("div", { className: "h-32 bg-gray-200 rounded mb-4 flex items-center justify-center", children: _jsxs("span", { className: "text-gray-500", children: ["Project Image ", i + 1] }) }), _jsxs("h3", { className: "font-semibold", children: ["LEGO Project ", i + 1] }), _jsx("p", { className: "text-gray-600 text-sm", children: "A cool LEGO creation" }), _jsx("div", { className: "mt-2 flex items-center text-sm text-gray-500", children: _jsx("span", { children: "Created 2 days ago" }) })] }, i))) })] }) }));
};
export default ProfileDemo;
