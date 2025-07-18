// Main components
export { ProfilePage } from '@/components/ProfilePage';
export { ProfileSidebar } from '@/components/ProfileSidebar';
export { ProfileMain } from '@/components/ProfileMain';
export { AvatarUploader } from '@/components/AvatarUploader';
export { ProfileSkeleton } from '@/components/ProfileSkeleton';

// UI components - re-export from shared UI package
export { Avatar, AvatarImage, AvatarFallback } from '@repo/ui';
export { Button } from '@repo/ui';
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@repo/ui';

// Types
export type {
  ProfileData,
  ProfilePageProps,
  ProfileSidebarProps,
  ProfileMainProps,
  AvatarUploaderProps,
  CropModalProps,
} from '@/types';

// Utils
export { cn } from '@/lib/utils'; 