import React from 'react';
interface SocialShareProps {
    url?: string;
    title?: string;
    description?: string;
    hashtags?: string[];
    className?: string;
    variant?: 'horizontal' | 'vertical' | 'compact';
}
export declare const SocialShare: React.NamedExoticComponent<SocialShareProps>;
export {};
