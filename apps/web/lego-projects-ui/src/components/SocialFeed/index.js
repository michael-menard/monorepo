import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback, useMemo } from 'react';
import { FaTwitter, FaInstagram, FaHeart, FaComment, FaShare, FaEllipsisH } from 'react-icons/fa';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
export const SocialFeed = React.memo(function SocialFeed({ posts = [], loading = false, error = null, onRefresh, className = '' }) {
    const [likedPosts, setLikedPosts] = useState(new Set());
    const handleLike = useCallback((postId) => {
        setLikedPosts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(postId)) {
                newSet.delete(postId);
            }
            else {
                newSet.add(postId);
            }
            return newSet;
        });
    }, []);
    const formatTimestamp = useCallback((timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        if (diffInHours < 1) {
            return 'Just now';
        }
        else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`;
        }
        else {
            return date.toLocaleDateString();
        }
    }, []);
    const getPlatformIcon = useCallback((platform) => {
        switch (platform) {
            case 'twitter':
                return _jsx(FaTwitter, { className: "w-4 h-4 text-blue-400" });
            case 'instagram':
                return _jsx(FaInstagram, { className: "w-4 h-4 text-pink-500" });
            default:
                return null;
        }
    }, []);
    const getPlatformColor = useCallback((platform) => {
        switch (platform) {
            case 'twitter':
                return 'border-blue-200 bg-blue-50';
            case 'instagram':
                return 'border-pink-200 bg-pink-50';
            default:
                return 'border-gray-200 bg-gray-50';
        }
    }, []);
    const renderPost = useCallback((post) => {
        const isLiked = likedPosts.has(post.id);
        return (_jsx("article", { className: `border rounded-lg p-4 mb-4 transition-all duration-200 hover:shadow-md ${getPlatformColor(post.platform)}`, children: _jsxs("div", { className: "flex items-start space-x-3", children: [_jsxs(Avatar, { className: "w-10 h-10", children: [_jsx(AvatarImage, { src: post.author.avatar, alt: post.author.name }), _jsx(AvatarFallback, { children: post.author.name.charAt(0) })] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center space-x-2 mb-2", children: [_jsx("span", { className: "font-semibold text-gray-900", children: post.author.name }), _jsxs("span", { className: "text-gray-500", children: ["@", post.author.handle] }), _jsx("span", { className: "text-gray-400", children: "\u2022" }), _jsx("span", { className: "text-gray-500 text-sm", children: formatTimestamp(post.timestamp) }), getPlatformIcon(post.platform)] }), _jsx("p", { className: "text-gray-800 mb-3", children: post.content }), post.image && (_jsx("div", { className: "mb-3", children: _jsx("img", { src: post.image, alt: "Post content", className: "rounded-lg max-w-full h-auto" }) })), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-4", children: [_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => handleLike(post.id), className: `flex items-center space-x-1 ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`, children: [_jsx(FaHeart, { className: `w-4 h-4 ${isLiked ? 'fill-current' : ''}` }), _jsx("span", { children: post.likes + (isLiked ? 1 : 0) })] }), _jsxs(Button, { variant: "ghost", size: "sm", className: "flex items-center space-x-1 text-gray-500 hover:text-blue-500", children: [_jsx(FaComment, { className: "w-4 h-4" }), _jsx("span", { children: post.comments })] }), _jsxs(Button, { variant: "ghost", size: "sm", className: "flex items-center space-x-1 text-gray-500 hover:text-green-500", children: [_jsx(FaShare, { className: "w-4 h-4" }), _jsx("span", { children: post.shares })] })] }), _jsx(Button, { variant: "ghost", size: "sm", className: "text-gray-400 hover:text-gray-600", "aria-label": "More options", children: _jsx(FaEllipsisH, { className: "w-4 h-4" }) })] })] })] }) }, post.id));
    }, [likedPosts, handleLike, formatTimestamp, getPlatformIcon, getPlatformColor]);
    const loadingState = useMemo(() => (_jsxs("div", { className: "flex items-center justify-center py-8", children: [_jsx(LoadingSpinner, { size: "lg" }), _jsx("span", { className: "ml-2 text-gray-500", children: "Loading social feed..." })] })), []);
    const errorState = useMemo(() => (_jsxs("div", { className: "text-center py-8", children: [_jsx("div", { className: "text-red-500 mb-2", children: "Failed to load social feed" }), _jsx(Button, { onClick: onRefresh, variant: "ghost", size: "sm", children: "Try Again" })] })), [onRefresh]);
    const emptyState = useMemo(() => (_jsxs("div", { className: "text-center py-8 text-gray-500", children: [_jsx("p", { children: "No social posts available" }), _jsx("p", { className: "text-sm", children: "Check back later for updates" })] })), []);
    return (_jsxs("div", { className: `social-feed ${className}`, children: [loading && loadingState, error && errorState, !loading && !error && posts.length === 0 && emptyState, !loading && !error && posts.length > 0 && (_jsx("div", { className: "space-y-4", children: posts.map(renderPost) }))] }));
});
