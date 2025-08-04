import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui';
import { InstructionsTab } from './InstructionsTab';
import { WishlistTab } from './WishlistTab';
import { InspirationGalleryTab } from './InspirationGalleryTab';
import { SettingsTab } from './SettingsTab';

export interface ProfileTabsProps {
  className?: string;
  defaultTab?: string;
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  className = '',
  defaultTab = 'instructions',
}) => {
  return (
    <Tabs defaultValue={defaultTab} className={`w-full ${className}`}>
      <TabsList className="w-full p-0 bg-background justify-start border-b rounded-none gap-1 mb-6">
        <TabsTrigger
          value="instructions"
          className="rounded-none bg-background h-full data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary px-6 py-3"
        >
          Instructions
        </TabsTrigger>
        <TabsTrigger
          value="wishlist"
          className="rounded-none bg-background h-full data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary px-6 py-3"
        >
          Wishlist
        </TabsTrigger>
        <TabsTrigger
          value="inspiration-gallery"
          className="rounded-none bg-background h-full data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary px-6 py-3"
        >
          Inspiration Gallery
        </TabsTrigger>
        <TabsTrigger
          value="settings"
          className="rounded-none bg-background h-full data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary px-6 py-3"
        >
          Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="instructions" className="mt-0">
        <InstructionsTab />
      </TabsContent>

      <TabsContent value="wishlist" className="mt-0">
        <WishlistTab />
      </TabsContent>

      <TabsContent value="inspiration-gallery" className="mt-0">
        <InspirationGalleryTab />
      </TabsContent>

      <TabsContent value="settings" className="mt-0">
        <SettingsTab />
      </TabsContent>
    </Tabs>
  );
};

export default ProfileTabs; 