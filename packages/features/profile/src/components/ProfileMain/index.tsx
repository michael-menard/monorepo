import React from 'react';
import { Card, CardContent } from '@repo/ui';
import ProfileTabs from '../ProfileTabs';

export interface ProfileMainProps {
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  title?: string;
  description?: string;
  showCard?: boolean;
  showTabs?: boolean;
  defaultTab?: string;
}

export const ProfileMain: React.FC<ProfileMainProps> = ({
  children,
  className = '',
  contentClassName = '',
  title,
  description,
  showCard = true,
  showTabs = true,
  defaultTab = 'instructions',
}) => {
  const content = (
    <div className={`w-full ${contentClassName}`}>
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {title}
            </h2>
          )}
          {description && <p className="text-gray-600 dark:text-gray-400">{description}</p>}
        </div>
      )}
      {showTabs ? (
        <ProfileTabs defaultTab={defaultTab} />
      ) : (
        children
      )}
    </div>
  );

  if (showCard) {
    return (
      <Card className={`w-full min-h-full ${className}`}>
        <CardContent className="p-6">{content}</CardContent>
      </Card>
    );
  }

  return <div className={`w-full min-h-full ${className}`}>{content}</div>;
};

export default ProfileMain; 