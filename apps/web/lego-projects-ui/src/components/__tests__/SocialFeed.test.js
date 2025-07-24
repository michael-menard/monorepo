import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SocialFeed } from '../SocialFeed.js';
describe('SocialFeed', () => {
    it('renders empty state when no posts', () => {
        render(_jsx(SocialFeed, { posts: [] }));
        expect(screen.getByText(/no social posts available/i)).toBeInTheDocument();
    });
    it('renders posts', () => {
        render(_jsx(SocialFeed, { posts: [{
                    id: '1',
                    platform: 'twitter',
                    author: { name: 'Test User', handle: 'test', avatar: '' },
                    content: 'Hello world',
                    timestamp: new Date().toISOString(),
                    likes: 1,
                    comments: 2,
                    shares: 3
                }] }));
        expect(screen.getByText(/hello world/i)).toBeInTheDocument();
    });
});
