import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useCallback, useMemo } from 'react';
import { FaTwitter, FaFacebook, FaLinkedin, FaWhatsapp, FaEnvelope, FaLink } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
export const SocialShare = React.memo(function SocialShare({ url = window.location.href, title = 'Check out this amazing Lego project!', description = 'Discover incredible Lego building instructions and inspiration.', hashtags = ['lego', 'building', 'creativity'], className = '', variant = 'horizontal' }) {
    const shareLinks = useMemo(() => [
        {
            name: 'Twitter',
            icon: FaTwitter,
            color: 'hover:text-blue-400',
            getUrl: () => {
                const text = `${title} ${description}`;
                const hashtagString = hashtags.map(tag => `#${tag}`).join(' ');
                return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${encodeURIComponent(hashtagString)}`;
            }
        },
        {
            name: 'Facebook',
            icon: FaFacebook,
            color: 'hover:text-blue-600',
            getUrl: () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        },
        {
            name: 'LinkedIn',
            icon: FaLinkedin,
            color: 'hover:text-blue-700',
            getUrl: () => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        },
        {
            name: 'WhatsApp',
            icon: FaWhatsapp,
            color: 'hover:text-green-500',
            getUrl: () => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`
        },
        {
            name: 'Email',
            icon: FaEnvelope,
            color: 'hover:text-gray-600',
            getUrl: () => `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${description}\n\n${url}`)}`
        },
        {
            name: 'Copy Link',
            icon: FaLink,
            color: 'hover:text-indigo-600',
            getUrl: () => url,
            isCopyAction: true
        }
    ], [url, title, description, hashtags]);
    const handleShare = useCallback(async (link) => {
        if (link.isCopyAction) {
            try {
                await navigator.clipboard.writeText(url);
                // You could add a toast notification here
                console.log('Link copied to clipboard');
            }
            catch (error) {
                console.error('Failed to copy link:', error);
            }
        }
        else {
            window.open(link.getUrl(), '_blank', 'width=600,height=400');
        }
    }, [url]);
    const getContainerClasses = useCallback(() => {
        const baseClasses = 'flex items-center gap-2';
        switch (variant) {
            case 'vertical':
                return `${baseClasses} flex-col`;
            case 'compact':
                return `${baseClasses} gap-1`;
            default:
                return baseClasses;
        }
    }, [variant]);
    const getButtonClasses = useCallback(() => {
        const baseClasses = 'p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2';
        switch (variant) {
            case 'compact':
                return `${baseClasses} p-1`;
            default:
                return baseClasses;
        }
    }, [variant]);
    return (_jsx("div", { className: `social-share ${className}`, children: _jsx("div", { className: getContainerClasses(), children: shareLinks.map((link) => {
                const Icon = link.icon;
                return (_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => handleShare(link), className: `${getButtonClasses()} ${link.color}`, "aria-label": `Share on ${link.name}`, children: [_jsx(Icon, { className: "w-4 h-4" }), variant !== 'compact' && (_jsx("span", { className: "sr-only", children: link.name }))] }, link.name));
            }) }) }));
});
