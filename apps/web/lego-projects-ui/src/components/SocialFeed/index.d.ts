import React from 'react';
interface SocialPost {
    id: string;
    platform: 'twitter' | 'instagram';
    author: {
        name: string;
        handle: string;
        avatar: string;
    };
    content: string;
    image?: string;
    timestamp: string;
    likes: number;
    comments: number;
    shares: number;
    isLiked?: boolean;
}
interface SocialFeedProps {
    posts?: SocialPost[];
    loading?: boolean;
    error?: string | null;
    onRefresh?: () => void;
    className?: string;
}
export declare const SocialFeed: React.NamedExoticComponent<SocialFeedProps>;
export {};
