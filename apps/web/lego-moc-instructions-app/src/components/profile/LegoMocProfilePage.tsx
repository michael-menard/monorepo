import React from 'react';
import { ProfileLayout, ProfileAvatar } from '@repo/profile';
// TODO: Need to check if ProfileLayoutSidebar and ProfileAvatarInfo exist or need to be created
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui';
import { Blocks, BookOpen, Heart, Settings, Trophy, Users, Zap } from 'lucide-react';

export interface LegoMocProfilePageProps {
  /** User profile data */
  user: {
    id: string;
    name: string;
    email: string;
    username?: string;
    avatar?: string;
    bio?: string;
    location?: string;
    website?: string;
    joinDate: Date;
    isVerified?: boolean;
    isPremium?: boolean;
    socialLinks?: {
      twitter?: string;
      instagram?: string;
      youtube?: string;
      flickr?: string;
    };
  };
  /** User's LEGO MOC statistics */
  stats: {
    totalMocs: number;
    totalInstructions: number;
    totalLikes: number;
    totalFollowers: number;
    totalFollowing: number;
    favoriteThemes: string[];
    buildingLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  };
  /** Whether the current user can edit this profile */
  canEdit?: boolean;
  /** Callback for editing profile */
  onEditProfile?: () => void;
  /** Callback for uploading avatar */
  onUploadAvatar?: (file: File) => void;
}

/**
 * LegoMocProfilePage - Profile page specifically designed for LEGO MOC Instructions app
 * 
 * Features:
 * - Wide left sidebar with large avatar and LEGO-specific profile info
 * - Dynamic right content area with MOC galleries, instructions, and stats
 * - LEGO-themed design with building statistics
 * - Responsive layout with mobile support
 */
export const LegoMocProfilePage: React.FC<LegoMocProfilePageProps> = ({
  user,
  stats,
  canEdit = false,
  onEditProfile,
  onUploadAvatar,
}) => {
  // Create sidebar content with LEGO-specific information
  const sidebarContent = (
    <ProfileLayoutSidebar
      avatar={
        <div className="flex flex-col items-center space-y-4">
          <ProfileAvatar
            avatarUrl={user.avatar}
            userName={user.name}
            userEmail={user.email}
            size="2xl"
            editable={canEdit}
            onAvatarUpload={onUploadAvatar}
            onEdit={onEditProfile}
            showStatus={true}
            isOnline={true}
            showVerified={user.isVerified}
            isVerified={user.isVerified}
          />
          
          {/* Building Level Badge */}
          <Badge 
            variant={stats.buildingLevel === 'Expert' ? 'default' : 'secondary'}
            className="text-sm font-medium"
          >
            <Blocks className="h-3 w-3 mr-1" />
            {stats.buildingLevel} Builder
          </Badge>
        </div>
      }
      profileInfo={
        <ProfileAvatarInfo
          userName={user.name}
          userEmail={user.email}
          username={user.username}
          title={`${stats.buildingLevel} LEGO Builder`}
          location={user.location}
          joinDate={user.joinDate}
          badges={[
            ...(user.isVerified ? [{ label: 'Verified Builder', variant: 'default' as const }] : []),
            ...(user.isPremium ? [{ label: 'Premium Member', variant: 'secondary' as const }] : []),
            ...(stats.totalMocs > 50 ? [{ label: 'Prolific Creator', variant: 'outline' as const }] : []),
          ]}
        />
      }
      additionalContent={
        <div className="space-y-6">
          {/* Bio Section */}
          {user.bio && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">About</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{user.bio}</p>
            </div>
          )}

          {/* LEGO Building Stats */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Building Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-foreground">{stats.totalMocs}</div>
                <div className="text-xs text-muted-foreground">MOCs</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-foreground">{stats.totalInstructions}</div>
                <div className="text-xs text-muted-foreground">Instructions</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-foreground">{stats.totalLikes}</div>
                <div className="text-xs text-muted-foreground">Likes</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-foreground">{stats.totalFollowers}</div>
                <div className="text-xs text-muted-foreground">Followers</div>
              </div>
            </div>
          </div>

          {/* Favorite Themes */}
          {stats.favoriteThemes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Favorite Themes</h3>
              <div className="flex flex-wrap gap-1">
                {stats.favoriteThemes.slice(0, 4).map((theme, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {theme}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Social Links */}
          {user.socialLinks && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Connect</h3>
              <div className="flex flex-wrap gap-2">
                {user.socialLinks.twitter && (
                  <a
                    href={user.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 text-sm"
                  >
                    Twitter
                  </a>
                )}
                {user.socialLinks.instagram && (
                  <a
                    href={user.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-600 hover:text-pink-700 text-sm"
                  >
                    Instagram
                  </a>
                )}
                {user.socialLinks.youtube && (
                  <a
                    href={user.socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    YouTube
                  </a>
                )}
                {user.socialLinks.flickr && (
                  <a
                    href={user.socialLinks.flickr}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Flickr
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Website */}
          {user.website && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Website</h3>
              <a
                href={user.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                Visit Website
              </a>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-border/50">
            {canEdit && onEditProfile && (
              <Button onClick={onEditProfile} className="w-full" variant="default">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
            <Button className="w-full" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Follow
            </Button>
            <Button className="w-full" variant="outline">
              <Heart className="h-4 w-4 mr-2" />
              Message
            </Button>
          </div>
        </div>
      }
    />
  );

  return (
    <ProfileLayout
      sidebarContent={sidebarContent}
      sidebarWidth="wide"
      leftOffset="medium"
      stickysidebar={true}
      sidebarBackground="default"
      className="bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50 dark:from-background dark:via-muted/20 dark:to-accent/10"
    >
      {/* Main Content Area - Dynamic LEGO MOC content */}
      <div className="space-y-6">
        {/* Welcome Header */}
        <Card className="border-0 bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">
                  Welcome to {user.name}'s LEGO Workshop!
                </h1>
                <p className="text-orange-100">
                  Discover amazing MOCs, detailed instructions, and creative building techniques.
                </p>
              </div>
              <div className="hidden md:block">
                <Blocks className="h-16 w-16 text-orange-200" />
              </div>
            </div>
          </CardContent>
        </Card>

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
                  My Original Creations ({stats.totalMocs})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* MOC cards would go here */}
                  <div className="text-center py-12 text-muted-foreground">
                    <Blocks className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>MOC gallery will be displayed here</p>
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
                  Building Instructions ({stats.totalInstructions})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Instruction sets will be displayed here</p>
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProfileLayout>
  );
};

export default LegoMocProfilePage;
