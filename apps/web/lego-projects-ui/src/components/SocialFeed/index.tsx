import React, { useState, useCallback, useMemo } from 'react';
import { FaTwitter, FaInstagram, FaHeart, FaComment, FaShare, FaEllipsisH } from 'react-icons/fa';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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

export const SocialFeed = React.memo(function SocialFeed({
  posts = [],
  loading = false,
  error = null,
  onRefresh,
  className = ''
}: SocialFeedProps) {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const handleLike = useCallback((postId: string) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  }, []);

  const formatTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }, []);

  const getPlatformIcon = useCallback((platform: string) => {
    switch (platform) {
      case 'twitter':
        return <FaTwitter className="w-4 h-4 text-blue-400" />;
      case 'instagram':
        return <FaInstagram className="w-4 h-4 text-pink-500" />;
      default:
        return null;
    }
  }, []);

  const getPlatformColor = useCallback((platform: string) => {
    switch (platform) {
      case 'twitter':
        return 'border-blue-200 bg-blue-50';
      case 'instagram':
        return 'border-pink-200 bg-pink-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  }, []);

  const renderPost = useCallback((post: SocialPost) => {
    const isLiked = likedPosts.has(post.id);
    
    return (
      <article
        key={post.id}
        className={`border rounded-lg p-4 mb-4 transition-all duration-200 hover:shadow-md ${getPlatformColor(post.platform)}`}
      >
        <div className="flex items-start space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.author.avatar} alt={post.author.name} />
            <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-semibold text-gray-900">{post.author.name}</span>
              <span className="text-gray-500">@{post.author.handle}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 text-sm">{formatTimestamp(post.timestamp)}</span>
              {getPlatformIcon(post.platform)}
            </div>
            
            <p className="text-gray-800 mb-3">{post.content}</p>
            
            {post.image && (
              <div className="mb-3">
                <img
                  src={post.image}
                  alt="Post content"
                  className="rounded-lg max-w-full h-auto"
                />
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center space-x-1 ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                >
                  <FaHeart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  <span>{post.likes + (isLiked ? 1 : 0)}</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-1 text-gray-500 hover:text-blue-500"
                >
                  <FaComment className="w-4 h-4" />
                  <span>{post.comments}</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-1 text-gray-500 hover:text-green-500"
                >
                  <FaShare className="w-4 h-4" />
                  <span>{post.shares}</span>
                </Button>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600"
                aria-label="More options"
              >
                <FaEllipsisH className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </article>
    );
  }, [likedPosts, handleLike, formatTimestamp, getPlatformIcon, getPlatformColor]);

  const loadingState = useMemo(() => (
    <div className="flex items-center justify-center py-8">
      <LoadingSpinner size="lg" />
      <span className="ml-2 text-gray-500">Loading social feed...</span>
    </div>
  ), []);

  const errorState = useMemo(() => (
    <div className="text-center py-8">
      <div className="text-red-500 mb-2">Failed to load social feed</div>
      <Button onClick={onRefresh} variant="ghost" size="sm">
        Try Again
      </Button>
    </div>
  ), [onRefresh]);

  const emptyState = useMemo(() => (
    <div className="text-center py-8 text-gray-500">
      <p>No social posts available</p>
      <p className="text-sm">Check back later for updates</p>
    </div>
  ), []);

  return (
    <div className={`social-feed ${className}`}>
      {loading && loadingState}
      {error && errorState}
      {!loading && !error && posts.length === 0 && emptyState}
      {!loading && !error && posts.length > 0 && (
        <div className="space-y-4">
          {posts.map(renderPost)}
        </div>
      )}
    </div>
  );
}); 