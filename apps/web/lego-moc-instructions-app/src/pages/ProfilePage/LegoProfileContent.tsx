import React, { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import {
  AppCard,
  Badge,
  Button,
  TabPanel,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui';
import {
  Bell,
  Blocks,
  BookOpen,
  Calendar,
  Download,
  Edit,
  Eye,
  Github,
  Globe,
  Heart,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Palette,
  Phone,
  Shield,
  Star,
  Trash2,
  Trophy,
  Twitter,
  User,
  Users,
  Zap,
} from 'lucide-react';
import type { Profile } from '@repo/profile';

interface LegoProfileContentProps {
  profile: Profile;
  onEdit: () => void;
  isEditing: boolean;
}

export const LegoProfileContent: React.FC<LegoProfileContentProps> = ({
  profile,
  onEdit,
  isEditing,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  // Navigation handlers for the cards
  const handleInstructionsClick = () => {
    router.navigate({ to: '/moc-gallery' });
  };

  const handleSetsClick = () => {
    router.navigate({ to: '/moc-gallery' }); // For now, both go to MOC gallery
  };

  const handleWishlistClick = () => {
    router.navigate({ to: '/wishlist' });
  };

  const handleInspirationClick = () => {
    router.navigate({ to: '/inspiration-gallery' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-6">
          <AppCard title="Personal Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-medium">{profile.firstName} {profile.lastName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{profile.phone}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {profile.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">{profile.location}</p>
                    </div>
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Website</p>
                      <a 
                        href={profile.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {profile.website}
                      </a>
                    </div>
                  </div>
                )}
                {profile.dateOfBirth && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Birth Date</p>
                      <p className="font-medium">{formatDate(profile.dateOfBirth)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </AppCard>

          {profile.bio && (
            <AppCard title="Bio">
              <p className="text-gray-700">{profile.bio}</p>
            </AppCard>
          )}

          {profile.socialLinks && (
            <AppCard title="Social Links">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {profile.socialLinks.twitter && (
                  <a
                    href={profile.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <Twitter className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium">Twitter</span>
                  </a>
                )}
                {profile.socialLinks.linkedin && (
                  <a
                    href={profile.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <Linkedin className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">LinkedIn</span>
                  </a>
                )}
                {profile.socialLinks.github && (
                  <a
                    href={profile.socialLinks.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <Github className="h-4 w-4 text-gray-800" />
                    <span className="text-sm font-medium">GitHub</span>
                  </a>
                )}
                {profile.socialLinks.instagram && (
                  <a
                    href={profile.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <Instagram className="h-4 w-4 text-pink-500" />
                    <span className="text-sm font-medium">Instagram</span>
                  </a>
                )}
              </div>
            </AppCard>
          )}
        </div>
      ),
    },
    {
      id: 'lego-stats',
      label: 'LEGO Stats',
      content: (
        <div className="space-y-6">
          <AppCard title="MOC Statistics">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">12</div>
                <div className="text-sm text-gray-600">MOCs Created</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">1.2k</div>
                <div className="text-sm text-gray-600">Downloads</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">4.8</div>
                <div className="text-sm text-gray-600">Avg Rating</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">847</div>
                <div className="text-sm text-gray-600">Views</div>
              </div>
            </div>
          </AppCard>

          <AppCard title="Recent Activity">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Download className="h-4 w-4 text-blue-500" />
                <div className="flex-1">
                  <p className="font-medium">New MOC uploaded</p>
                  <p className="text-sm text-gray-500">"Space Station Alpha" - 2 days ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Star className="h-4 w-4 text-yellow-500" />
                <div className="flex-1">
                  <p className="font-medium">Received 5-star rating</p>
                  <p className="text-sm text-gray-500">"Castle Fortress" - 1 week ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Heart className="h-4 w-4 text-red-500" />
                <div className="flex-1">
                  <p className="font-medium">MOC favorited</p>
                  <p className="text-sm text-gray-500">"Robot Companion" - 2 weeks ago</p>
                </div>
              </div>
            </div>
          </AppCard>

          <AppCard title="Favorite Categories">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Space</Badge>
              <Badge variant="outline">Castles</Badge>
              <Badge variant="outline">Vehicles</Badge>
              <Badge variant="outline">Robots</Badge>
              <Badge variant="outline">Architecture</Badge>
            </div>
          </AppCard>
        </div>
      ),
    },
    {
      id: 'preferences',
      label: 'Preferences',
      content: (
        <div className="space-y-6">
          <AppCard title="Notification Settings">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive email updates about your MOCs</p>
                  </div>
                </div>
                <Badge variant={profile.preferences?.emailNotifications ? 'default' : 'secondary'}>
                  {profile.preferences?.emailNotifications ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-gray-500">Receive push notifications in your browser</p>
                  </div>
                </div>
                <Badge variant={profile.preferences?.pushNotifications ? 'default' : 'secondary'}>
                  {profile.preferences?.pushNotifications ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
          </AppCard>

          <AppCard title="Privacy Settings">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">Public Profile</p>
                    <p className="text-sm text-gray-500">Allow others to view your profile</p>
                  </div>
                </div>
                <Badge variant={profile.preferences?.publicProfile ? 'default' : 'secondary'}>
                  {profile.preferences?.publicProfile ? 'Public' : 'Private'}
                </Badge>
              </div>
            </div>
          </AppCard>

          <AppCard title="Theme Settings">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Palette className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-gray-500">Choose your preferred theme</p>
                </div>
              </div>
              <Badge variant="outline">
                {profile.preferences?.theme || 'system'}
              </Badge>
            </div>
          </AppCard>
        </div>
      ),
    },
    {
      id: 'security',
      label: 'Security',
      content: (
        <div className="space-y-6">
          <AppCard title="Account Security">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-gray-500">Last changed 30 days ago</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="font-medium">Email Address</p>
                    <p className="text-sm text-gray-500">{profile.email}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Change Email
                </Button>
              </div>
            </div>
          </AppCard>

          <AppCard title="Danger Zone">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-center gap-3">
                  <Trash2 className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="font-medium text-red-900">Delete Account</p>
                    <p className="text-sm text-red-700">Permanently delete your account and all data</p>
                  </div>
                </div>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </div>
            </div>
          </AppCard>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Instructions Card */}
        <Card
          className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-blue-300"
          onClick={handleInstructionsClick}
        >
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <BookOpen className="h-12 w-12 mx-auto text-blue-600 group-hover:text-blue-700" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Instructions</h3>
            <p className="text-gray-600 mb-4">Browse detailed building guides and MOC instructions</p>
            <div className="bg-blue-50 group-hover:bg-blue-100 rounded-lg py-2 px-4 transition-colors">
              <span className="text-blue-700 font-medium">View Instructions →</span>
            </div>
          </CardContent>
        </Card>

        {/* Sets Card */}
        <Card
          className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-green-300"
          onClick={handleSetsClick}
        >
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <Blocks className="h-12 w-12 mx-auto text-green-600 group-hover:text-green-700" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Sets</h3>
            <p className="text-gray-600 mb-4">Explore LEGO sets and MOC collections</p>
            <div className="bg-green-50 group-hover:bg-green-100 rounded-lg py-2 px-4 transition-colors">
              <span className="text-green-700 font-medium">Browse Sets →</span>
            </div>
          </CardContent>
        </Card>

        {/* Wishlist Card */}
        <Card
          className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-red-300"
          onClick={handleWishlistClick}
        >
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <Heart className="h-12 w-12 mx-auto text-red-600 group-hover:text-red-700" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Wishlist</h3>
            <p className="text-gray-600 mb-4">Manage your wanted sets and parts</p>
            <div className="bg-red-50 group-hover:bg-red-100 rounded-lg py-2 px-4 transition-colors">
              <span className="text-red-700 font-medium">View Wishlist →</span>
            </div>
          </CardContent>
        </Card>

        {/* Inspiration Gallery Card */}
        <Card
          className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-purple-300"
          onClick={handleInspirationClick}
        >
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <Zap className="h-12 w-12 mx-auto text-purple-600 group-hover:text-purple-700" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Inspiration</h3>
            <p className="text-gray-600 mb-4">Discover creative ideas and trending MOCs</p>
            <div className="bg-purple-50 group-hover:bg-purple-100 rounded-lg py-2 px-4 transition-colors">
              <span className="text-purple-700 font-medium">Get Inspired →</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="mocs" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mocs" className="flex items-center gap-2">
            <Blocks className="h-4 w-4" />
            MOCs
          </TabsTrigger>
          <TabsTrigger value="instructions" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Instructions
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Favorites
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mocs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Blocks className="h-5 w-5" />
                My Original Creations (12)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* MOC cards would go here */}
                <div className="text-center py-12 text-muted-foreground col-span-full">
                  <Blocks className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>MOC gallery will be displayed here</p>
                  <p className="text-sm">Upload your first MOC to get started!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Building Instructions (8)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Instruction sets will be displayed here</p>
                <p className="text-sm">Create detailed building guides for your MOCs!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Favorite MOCs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Favorite MOCs will be displayed here</p>
                <p className="text-sm">Heart MOCs you love to save them here!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Building Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <Trophy className="h-8 w-8 text-yellow-500" />
                  <div>
                    <h4 className="font-semibold">First MOC</h4>
                    <p className="text-sm text-muted-foreground">Created your first original design</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <Zap className="h-8 w-8 text-blue-500" />
                  <div>
                    <h4 className="font-semibold">Quick Builder</h4>
                    <p className="text-sm text-muted-foreground">Completed 10 builds in one month</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <Users className="h-8 w-8 text-green-500" />
                  <div>
                    <h4 className="font-semibold">Community Favorite</h4>
                    <p className="text-sm text-muted-foreground">Received 100+ likes on a MOC</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <Star className="h-8 w-8 text-purple-500" />
                  <div>
                    <h4 className="font-semibold">Master Builder</h4>
                    <p className="text-sm text-muted-foreground">Created 50+ original MOCs</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 