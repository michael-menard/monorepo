import React from 'react';
import type {
  Profile,
  CreateProfile,
  UpdateProfile,
  AvatarUpload,
  ProfileForm,
  PasswordChange,
  EmailChange,
  DeleteAccount,
} from '../schemas';

// Re-export types from schemas
export type {
  Profile,
  CreateProfile,
  UpdateProfile,
  AvatarUpload,
  ProfileForm,
  PasswordChange,
  EmailChange,
  DeleteAccount,
} from '../schemas';

// Component prop types
export interface ProfileFormProps {
  profile?: Profile;
  onSubmit: (data: ProfileForm) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

export interface AvatarUploadProps {
  currentAvatar?: string;
  onUpload: (file: File) => void;
  onRemove?: () => void;
  isLoading?: boolean;
  className?: string;
}

export interface ProfileCardProps {
  profile: Profile;
  onEdit?: () => void;
  isEditable?: boolean;
  className?: string;
}

export interface ProfilePageProps {
  profile: Profile;
  sidebarContent: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  sidebarClassName?: string;
  contentClassName?: string;
}

export interface ProfileSidebarProps {
  profile: Profile;
  onEdit?: () => void;
  onUploadAvatar?: (file: File) => void;
  onViewProfile?: () => void;
  isEditable?: boolean;
  className?: string;
}

export interface ProfileHeaderProps {
  profile: Profile;
  onEdit?: () => void;
  isEditable?: boolean;
  className?: string;
}

export interface PasswordChangeFormProps {
  onSubmit: (data: PasswordChange) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

export interface EmailChangeFormProps {
  currentEmail: string;
  onSubmit: (data: EmailChange) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

export interface DeleteAccountFormProps {
  onSubmit: (data: DeleteAccount) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

export interface SocialLinksProps {
  socialLinks?: Profile['socialLinks'];
  onUpdate?: (socialLinks: Profile['socialLinks']) => void;
  isEditable?: boolean;
  className?: string;
}

export interface PreferencesFormProps {
  preferences?: Profile['preferences'];
  onSubmit: (preferences: Profile['preferences']) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

// API response types
export interface ProfileApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface ProfileListResponse {
  profiles: Profile[];
  total: number;
  page: number;
  limit: number;
}

export interface AvatarUploadResponse {
  avatarUrl: string;
  message: string;
}

// Form field types
export interface ProfileFormField {
  name: keyof ProfileForm;
  label: string;
  type: 'text' | 'email' | 'textarea' | 'date' | 'url' | 'tel';
  required?: boolean;
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
  };
}

// Theme types
export type Theme = 'light' | 'dark' | 'system';

// Notification types
export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  publicProfile: boolean;
  theme: Theme;
} 