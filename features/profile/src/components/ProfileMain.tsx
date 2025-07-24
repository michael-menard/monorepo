import React from 'react';
import { cn } from '../lib/utils.js';
import type { ProfileMainProps } from '../types/index.js';

export const ProfileMain: React.FC<ProfileMainProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn('flex-1 space-y-6', className)}>
      {children}
    </div>
  );
}; 