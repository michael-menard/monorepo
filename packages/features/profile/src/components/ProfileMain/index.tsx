import React from 'react';
import { Card, CardContent } from '@repo/ui';

export interface ProfileMainProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  title?: string;
  description?: string;
  showCard?: boolean;
}

export const ProfileMain: React.FC<ProfileMainProps> = ({
  children,
  className = '',
  contentClassName = '',
  title,
  description,
  showCard = true,
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
      {children}
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