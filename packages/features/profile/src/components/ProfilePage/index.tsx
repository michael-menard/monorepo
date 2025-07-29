import React from 'react';
import { Card, CardContent } from '@repo/ui';
import type { ProfilePageProps } from '../../types';

export const ProfilePage: React.FC<ProfilePageProps> = ({
  profile,
  sidebarContent,
  children,
  className = '',
  sidebarClassName = '',
  contentClassName = '',
}) => {
  return (
    <div className={`w-full min-h-screen p-4 ${className}`}>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Sidebar */}
        <aside className={`lg:col-span-1 ${sidebarClassName}`}>
          <Card className="w-full sticky top-4">
            <CardContent className="p-6">{sidebarContent}</CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <main className={`lg:col-span-2 ${contentClassName}`}>
          <Card className="w-full min-h-full">
            <CardContent className="p-6">{children}</CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default ProfilePage; 