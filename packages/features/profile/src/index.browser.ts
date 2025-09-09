// Browser-specific exports for profile package
// Export schemas and types
export * from './schemas';

// Export browser-specific utilities (no shared-image-utils imports)
export * from './utils/index.browser.js';

// Export components
export { default as ProfilePage } from './components/ProfilePage';
export { default as ProfileCard } from './components/ProfileCard';
export { AvatarUploader } from './components/AvatarUploader';
export { default as ProfileMain } from './components/ProfileMain';
export { default as ProfileSidebar } from './components/ProfileSidebar';
