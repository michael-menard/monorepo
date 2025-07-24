import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@repo/ui';
import { AvatarUploader } from './AvatarUploader';
import { cn } from '../lib/utils';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
const profileSchema = z.object({
    displayName: z.string().min(2, 'Display name must be at least 2 characters').max(32, 'Display name must be at most 32 characters'),
});
export const ProfileSidebar = ({ profile, onAvatarUpload, isEditable = false, className, onProfileUpdate, }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { register, handleSubmit, formState: { errors, isDirty }, reset, } = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            displayName: profile.displayName || '',
        },
        mode: 'onBlur',
    });
    const getInitials = (name) => {
        if (!name)
            return profile.username.slice(0, 2).toUpperCase();
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };
    const handleEdit = () => {
        reset({
            displayName: profile.displayName || '',
        });
        setIsEditing(true);
        setError(null);
    };
    const handleCancel = () => {
        setIsEditing(false);
        setError(null);
        reset({
            displayName: profile.displayName || '',
        });
    };
    const onSubmit = async (data) => {
        if (!onProfileUpdate)
            return;
        setLoading(true);
        setError(null);
        try {
            await onProfileUpdate({ displayName: data.displayName });
            setIsEditing(false);
        }
        catch (e) {
            setError(e?.message || 'Failed to update profile');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: cn('flex flex-col space-y-6', className), children: [_jsx("div", { className: "flex flex-col items-center", children: isEditable && onAvatarUpload ? (_jsx(AvatarUploader, { currentAvatarUrl: profile.avatarUrl, onUpload: onAvatarUpload, className: "w-full" })) : (_jsxs(Avatar, { className: "h-24 w-24", children: [_jsx(AvatarImage, { src: profile.avatarUrl, alt: `${profile.displayName || profile.username}'s avatar`, className: "object-cover" }), _jsx(AvatarFallback, { className: "text-lg font-semibold", children: getInitials(profile.displayName) })] })) }), _jsx("div", { className: "text-center space-y-2", children: isEditing ? (_jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-2", children: [_jsxs("div", { children: [_jsx("input", { className: cn('w-full border rounded px-2 py-1 text-lg font-bold text-gray-900', errors.displayName && 'border-red-500'), ...register('displayName'), placeholder: "Display Name", disabled: loading, "aria-invalid": !!errors.displayName }), errors.displayName && (_jsx("div", { className: "text-red-500 text-xs mt-1", children: errors.displayName.message }))] }), _jsxs("div", { className: "flex justify-center gap-2 mt-2", children: [_jsx("button", { type: "submit", className: "px-3 py-1 rounded bg-blue-600 text-white text-sm font-medium disabled:opacity-50", disabled: loading || !isDirty, children: loading ? 'Saving...' : 'Save' }), _jsx("button", { type: "button", className: "px-3 py-1 rounded bg-gray-200 text-gray-700 text-sm font-medium", onClick: handleCancel, disabled: loading, children: "Cancel" })] }), error && _jsx("div", { className: "text-red-500 text-xs mt-1", children: error })] })) : (_jsxs(_Fragment, { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: profile.displayName || profile.username }), profile.displayName && (_jsxs("p", { className: "text-gray-500 text-sm", children: ["@", profile.username] })), isEditable && onProfileUpdate && (_jsx("button", { className: "mt-2 px-3 py-1 rounded bg-gray-100 text-gray-700 text-sm font-medium border border-gray-300 hover:bg-gray-200", onClick: handleEdit, children: "Edit" }))] })) }), profile.stats && (_jsxs("div", { className: "flex justify-center space-x-8 pt-4 border-t border-gray-200", children: [profile.stats.projects !== undefined && (_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-xl font-bold text-gray-900", children: profile.stats.projects }), _jsx("div", { className: "text-xs text-gray-500", children: profile.stats.projects === 1 ? 'Project' : 'Projects' })] })), profile.stats.followers !== undefined && (_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-xl font-bold text-gray-900", children: profile.stats.followers }), _jsx("div", { className: "text-xs text-gray-500", children: profile.stats.followers === 1 ? 'Follower' : 'Followers' })] })), profile.stats.following !== undefined && (_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-xl font-bold text-gray-900", children: profile.stats.following }), _jsx("div", { className: "text-xs text-gray-500", children: "Following" })] }))] }))] }));
};
