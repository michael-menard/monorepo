import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useMemo } from 'react';
// @ts-expect-error: TypeScript cannot resolve .js import for SocialShare, but it exists and is correct for NodeNext/ESM
import { SocialShare } from '../../components/SocialShare/index.js';
// @ts-expect-error: TypeScript cannot resolve .js import for SocialFeed, but it exists and is correct for NodeNext/ESM
import { SocialFeed } from '../../components/SocialFeed/index.js';
// @ts-expect-error: TypeScript cannot resolve .js import for button, but it exists and is correct for NodeNext/ESM
import { Button } from '../../components/ui/button.js';
// @ts-expect-error: TypeScript cannot resolve .js import for card, but it exists and is correct for NodeNext/ESM
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.js';
import { FaTwitter, FaInstagram, FaFacebook, FaLinkedin, FaGithub } from 'react-icons/fa';
// Mock data for social feed
const mockPosts = [
    {
        id: '1',
        platform: 'twitter',
        author: {
            name: 'Lego Master',
            handle: 'legomaster',
            avatar: 'https://via.placeholder.com/40x40/1DA1F2/FFFFFF?text=L'
        },
        content: 'Just finished building the most amazing Lego castle! The details are incredible. #lego #building #creativity',
        image: 'https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Lego+Castle',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        likes: 42,
        comments: 8,
        shares: 3
    },
    {
        id: '2',
        platform: 'instagram',
        author: {
            name: 'Creative Builder',
            handle: 'creativebuilder',
            avatar: 'https://via.placeholder.com/40x40/E4405F/FFFFFF?text=C'
        },
        content: 'Spent the weekend creating this incredible spaceship design. The possibilities with Lego are endless! 🚀',
        image: 'https://via.placeholder.com/400x300/4ECDC4/FFFFFF?text=Spaceship',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        likes: 89,
        comments: 12,
        shares: 7
    },
    {
        id: '3',
        platform: 'twitter',
        author: {
            name: 'Lego Community',
            handle: 'legocommunity',
            avatar: 'https://via.placeholder.com/40x40/1DA1F2/FFFFFF?text=LC'
        },
        content: 'Join our weekly building challenge! This week\'s theme: Futuristic City. Share your creations with #LegoChallenge',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        likes: 156,
        comments: 23,
        shares: 15
    }
];
const socialStats = [
    { platform: 'Twitter', followers: '12.5K', icon: FaTwitter, color: 'text-blue-400' },
    { platform: 'Instagram', followers: '8.9K', icon: FaInstagram, color: 'text-pink-500' },
    { platform: 'Facebook', followers: '15.2K', icon: FaFacebook, color: 'text-blue-600' },
    { platform: 'LinkedIn', followers: '3.1K', icon: FaLinkedin, color: 'text-blue-700' },
    { platform: 'GitHub', followers: '2.8K', icon: FaGithub, color: 'text-gray-700' }
];
export default function SocialPage() {
    const [activeTab, setActiveTab] = useState('feed');
    const [loading, setLoading] = useState(false);
    const handleRefresh = useCallback(() => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
        }, 1000);
    }, []);
    const tabs = useMemo(() => [
        { id: 'feed', label: 'Social Feed', description: 'Latest posts from our community' },
        { id: 'share', label: 'Share Content', description: 'Share your Lego creations' },
        { id: 'stats', label: 'Social Stats', description: 'Community engagement metrics' }
    ], []);
    const renderTabContent = useCallback(() => {
        switch (activeTab) {
            case 'feed':
                return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900", children: "Community Feed" }), _jsx(Button, { onClick: handleRefresh, disabled: loading, children: "Refresh" })] }), _jsx(SocialFeed, { posts: mockPosts, loading: loading, onRefresh: handleRefresh })] }));
            case 'share':
                return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-4", children: "Share Your Creations" }), _jsx("p", { className: "text-gray-600 mb-6", children: "Share your amazing Lego builds with the community and inspire others!" })] }), _jsxs("div", { className: "grid gap-6 md:grid-cols-2", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Share Current Page" }), _jsx(CardDescription, { children: "Share this page with your social network" })] }), _jsx(CardContent, { children: _jsx(SocialShare, { title: "Check out Lego Projects!", description: "Discover amazing Lego building instructions and inspiration", hashtags: ['lego', 'building', 'creativity'], variant: "horizontal" }) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Share Your Build" }), _jsx(CardDescription, { children: "Share a specific Lego creation" })] }), _jsx(CardContent, { children: _jsx(SocialShare, { title: "My Amazing Lego Castle", description: "Just finished building this incredible castle with detailed architecture", hashtags: ['lego', 'castle', 'building', 'creativity'], variant: "vertical" }) })] })] })] }));
            case 'stats':
                return (_jsxs("div", { className: "space-y-6", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900", children: "Social Media Stats" }), _jsx("div", { className: "grid gap-6 md:grid-cols-2 lg:grid-cols-3", children: socialStats.map((stat) => {
                                const Icon = stat.icon;
                                return (_jsx(Card, { children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(Icon, { className: `w-8 h-8 ${stat.color}` }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: stat.platform }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: stat.followers })] })] }) }) }, stat.platform));
                            }) }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Community Engagement" }), _jsx(CardDescription, { children: "Recent activity and engagement metrics" })] }), _jsx(CardContent, { children: _jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-3xl font-bold text-blue-600", children: "1,247" }), _jsx("p", { className: "text-sm text-gray-500", children: "Posts This Week" })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-3xl font-bold text-green-600", children: "5,892" }), _jsx("p", { className: "text-sm text-gray-500", children: "Likes Received" })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-3xl font-bold text-purple-600", children: "892" }), _jsx("p", { className: "text-sm text-gray-500", children: "New Members" })] })] }) })] })] }));
            default:
                return null;
        }
    }, [activeTab, loading, handleRefresh]);
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 mb-2", children: "Social Media" }), _jsx("p", { className: "text-gray-600", children: "Connect with the Lego community and share your amazing creations" })] }), _jsx("div", { className: "border-b border-gray-200 mb-8", children: _jsx("nav", { className: "-mb-px flex space-x-8", children: tabs.map((tab) => (_jsx("button", { onClick: () => setActiveTab(tab.id), className: `py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`, children: tab.label }, tab.id))) }) }), renderTabContent()] }));
}
