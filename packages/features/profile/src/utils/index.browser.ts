import type { Profile, ProfileForm } from '../schemas';

// Format full name
export const formatFullName = (profile: Pick<Profile, 'firstName' | 'lastName'>): string => {
  return `${profile.firstName} ${profile.lastName}`.trim();
};

// Get initials from name
export const getInitials = (profile: Pick<Profile, 'firstName' | 'lastName'>): string => {
  const first = profile.firstName.charAt(0).toUpperCase();
  const last = profile.lastName.charAt(0).toUpperCase();
  return `${first}${last}`;
};

// Validate file size
export const validateFileSize = (file: File, maxSizeMB: number = 5): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

// Validate image file type
export const validateImageType = (file: File): boolean => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  return allowedTypes.includes(file.type);
};

// Browser-specific image compression (simplified)
export const compressImage = async (
  file: File,
  _maxWidth: number = 800,
  _quality: number = 0.8
): Promise<File> => {
  // For browser, return the original file for now
  // This can be enhanced with canvas-based compression if needed
  return file;
};

// Format date for display
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

// Format date for input field
export const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Validate URL
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Generate avatar placeholder
export const generateAvatarPlaceholder = (name: string): string => {
  const initials = getInitials({ firstName: name.split(' ')[0], lastName: name.split(' ')[1] || '' });
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  const colorIndex = name.length % colors.length;
  const color = colors[colorIndex];
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="${color}"/>
      <text x="50" y="50" font-family="Arial, sans-serif" font-size="32" 
            fill="white" text-anchor="middle" dy=".3em">${initials}</text>
    </svg>
  `)}`;
};

// Debounce function for search
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Generate a unique ID
export const generateId = (): string => {
  return globalThis.crypto.randomUUID();
};

// Check if profile is complete
export const isProfileComplete = (profile: Profile): boolean => {
  return !!(
    profile.firstName &&
    profile.lastName &&
    profile.email &&
    profile.username
  );
};

// Calculate profile completion percentage
export const getProfileCompletionPercentage = (profile: Profile): number => {
  const requiredFields = [
    'firstName',
    'lastName', 
    'email',
    'username',
    'bio',
    'avatar',
    'location'
  ];
  
  const optionalFields = [
    'phone',
    'website',
    'socialLinks',
    'preferences'
  ];
  
  let completed = 0;
  let total = requiredFields.length + optionalFields.length;
  
  // Check required fields
  requiredFields.forEach(field => {
    if (profile[field as keyof Profile]) {
      completed++;
    }
  });
  
  // Check optional fields
  optionalFields.forEach(field => {
    if (profile[field as keyof Profile]) {
      completed++;
    }
  });
  
  return Math.round((completed / total) * 100);
};

// Sanitize profile data
export const sanitizeProfileData = (data: ProfileForm): Partial<Profile> => {
  const sanitized: Partial<Profile> = {};
  
  if (data.firstName) sanitized.firstName = data.firstName.trim();
  if (data.lastName) sanitized.lastName = data.lastName.trim();
  if (data.email) sanitized.email = data.email.trim().toLowerCase();
  if (data.username) sanitized.username = data.username.trim().toLowerCase();
  if (data.bio) sanitized.bio = data.bio.trim();
  if (data.phone) sanitized.phone = data.phone.trim();
  if (data.location) sanitized.location = data.location.trim();
  if (data.website) sanitized.website = data.website.trim();
  if (data.socialLinks) sanitized.socialLinks = data.socialLinks;
  if (data.preferences) sanitized.preferences = data.preferences;
  
  return sanitized;
};
