import React from 'react';
import { cn } from '../lib/utils';

export const ProfileSkeleton: React.FC = () => (
  <div data-testid="profile-skeleton" className="animate-pulse flex flex-col space-y-6 items-center">
    <div className="rounded-full bg-gray-200 h-24 w-24" />
    <div className="h-6 bg-gray-200 rounded w-32" />
    <div className="h-4 bg-gray-200 rounded w-20" />
    <div className="flex space-x-8 pt-4 w-full justify-center">
      <div className="h-4 bg-gray-200 rounded w-12" />
      <div className="h-4 bg-gray-200 rounded w-12" />
      <div className="h-4 bg-gray-200 rounded w-12" />
    </div>
  </div>
); 