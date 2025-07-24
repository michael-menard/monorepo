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
    platform: 'twitter' as const,
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
    platform: 'instagram' as const,
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
    platform: 'twitter' as const,
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
  const [activeTab, setActiveTab] = useState<'feed' | 'share' | 'stats'>('feed');
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
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Community Feed</h2>
              <Button onClick={handleRefresh} disabled={loading}>
                Refresh
              </Button>
            </div>
            <SocialFeed 
              posts={mockPosts}
              loading={loading}
              onRefresh={handleRefresh}
            />
          </div>
        );
      
      case 'share':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Share Your Creations</h2>
              <p className="text-gray-600 mb-6">
                Share your amazing Lego builds with the community and inspire others!
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Share Current Page</CardTitle>
                  <CardDescription>
                    Share this page with your social network
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SocialShare 
                    title="Check out Lego Projects!"
                    description="Discover amazing Lego building instructions and inspiration"
                    hashtags={['lego', 'building', 'creativity']}
                    variant="horizontal"
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Share Your Build</CardTitle>
                  <CardDescription>
                    Share a specific Lego creation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SocialShare 
                    title="My Amazing Lego Castle"
                    description="Just finished building this incredible castle with detailed architecture"
                    hashtags={['lego', 'castle', 'building', 'creativity']}
                    variant="vertical"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        );
      
      case 'stats':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Social Media Stats</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {socialStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.platform}>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-8 h-8 ${stat.color}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-500">{stat.platform}</p>
                          <p className="text-2xl font-bold text-gray-900">{stat.followers}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Community Engagement</CardTitle>
                <CardDescription>
                  Recent activity and engagement metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">1,247</p>
                    <p className="text-sm text-gray-500">Posts This Week</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">5,892</p>
                    <p className="text-sm text-gray-500">Likes Received</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-purple-600">892</p>
                    <p className="text-sm text-gray-500">New Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      default:
        return null;
    }
  }, [activeTab, loading, handleRefresh]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Social Media</h1>
        <p className="text-gray-600">
          Connect with the Lego community and share your amazing creations
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'feed' | 'share' | 'stats')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
} 