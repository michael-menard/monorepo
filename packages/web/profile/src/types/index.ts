export interface ProfileData {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  stats?: {
    projects?: number;
    followers?: number;
    following?: number;
  };
}

export interface ProfilePageProps {
  profile: ProfileData;
  onAvatarUpload?: (file: File) => Promise<string>;
  onProfileUpdate?: (data: Partial<ProfileData>) => Promise<void>;
  isEditable?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}

export interface ProfileSidebarProps {
  profile: ProfileData;
  onAvatarUpload?: (file: File) => Promise<string>;
  isEditable?: boolean;
  className?: string;
  onProfileUpdate?: (data: Partial<ProfileData>) => Promise<void>;
}

export interface ProfileMainProps {
  children?: React.ReactNode;
  className?: string;
}

export interface AvatarUploaderProps {
  currentAvatarUrl?: string;
  onUpload: (file: File) => Promise<string>;
  className?: string;
  disabled?: boolean;
}

export interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onCropComplete: (croppedImage: File) => void;
  aspectRatio?: number;
} 