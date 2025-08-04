# @repo/features/profile

A comprehensive user profile management package featuring profile editing, avatar upload, guided tours, and tabbed navigation.

## Features

- 👤 **Profile Management**: Complete user profile editing and display
- 🖼️ **Avatar Upload**: Image upload with cropping and preview
- 🎯 **Guided Tours**: Interactive onboarding and feature discovery
- 📑 **Tabbed Navigation**: Organized profile sections
- 📱 **Responsive Design**: Mobile-first responsive layout
- 🎨 **Customizable UI**: Flexible styling with Tailwind CSS
- 🔧 **TypeScript**: Full type safety and IntelliSense support
- 🧪 **Testing**: Comprehensive test coverage with Vitest

## Installation

This package is part of the monorepo and should be installed as a dependency in your app:

```bash
pnpm add @repo/features/profile
```

## Quick Start

### 1. Basic Profile Component

```tsx
import { Profile } from '@repo/features/profile';

function UserProfile() {
  const user = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: '/path/to/avatar.jpg',
    bio: 'LEGO enthusiast and builder',
    location: 'New York, NY',
    website: 'https://example.com'
  };

  const handleProfileUpdate = async (updatedProfile: UserProfile) => {
    try {
      await updateProfile(updatedProfile);
      console.log('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  return (
    <Profile
      user={user}
      onUpdate={handleProfileUpdate}
      onAvatarUpload={handleAvatarUpload}
    />
  );
}
```

### 2. With Guided Tour

```tsx
import { Profile, useGuidedTour } from '@repo/features/profile';

function ProfileWithTour() {
  const { startTour, isTourActive, currentStep } = useGuidedTour();

  const tourSteps = [
    {
      id: 'profile-basics',
      title: 'Profile Basics',
      content: 'Update your basic information here',
      target: '#profile-form'
    },
    {
      id: 'avatar-upload',
      title: 'Avatar Upload',
      content: 'Upload and crop your profile picture',
      target: '#avatar-upload'
    }
  ];

  return (
    <div>
      <button onClick={() => startTour(tourSteps)}>
        Start Tour
      </button>
      
      <Profile
        user={user}
        onUpdate={handleProfileUpdate}
        tourSteps={tourSteps}
        isTourActive={isTourActive}
        currentTourStep={currentStep}
      />
    </div>
  );
}
```

### 3. Tabbed Profile Layout

```tsx
import { ProfileTabs, ProfileTab } from '@repo/features/profile';

function TabbedProfile() {
  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: <ProfileOverview user={user} />
    },
    {
      id: 'builds',
      label: 'My Builds',
      content: <UserBuilds userId={user.id} />
    },
    {
      id: 'settings',
      label: 'Settings',
      content: <ProfileSettings user={user} />
    }
  ];

  return (
    <ProfileTabs
      tabs={tabs}
      defaultTab="overview"
      onTabChange={(tabId) => console.log('Tab changed:', tabId)}
    />
  );
}
```

## API Reference

### Profile Component

The main profile component for displaying and editing user profiles.

```tsx
interface ProfileProps {
  user: UserProfile;
  onUpdate: (profile: UserProfile) => Promise<void> | void;
  onAvatarUpload?: (file: File) => Promise<string | null>;
  tourSteps?: TourStep[];
  isTourActive?: boolean;
  currentTourStep?: string;
  className?: string;
}
```

#### Props

| Property | Type | Description |
|----------|------|-------------|
| `user` | `UserProfile` | User profile data |
| `onUpdate` | `(profile: UserProfile) => Promise<void> \| void` | Profile update handler |
| `onAvatarUpload` | `(file: File) => Promise<string \| null>` | Avatar upload handler |
| `tourSteps` | `TourStep[]` | Guided tour steps |
| `isTourActive` | `boolean` | Tour active state |
| `currentTourStep` | `string` | Current tour step ID |
| `className` | `string` | Additional CSS classes |

### ProfileTabs Component

Component for tabbed profile navigation.

```tsx
interface ProfileTabsProps {
  tabs: ProfileTab[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}
```

#### Props

| Property | Type | Description |
|----------|------|-------------|
| `tabs` | `ProfileTab[]` | Array of tab configurations |
| `defaultTab` | `string` | Default active tab |
| `onTabChange` | `(tabId: string) => void` | Tab change callback |
| `className` | `string` | Additional CSS classes |

### useGuidedTour Hook

Hook for managing guided tour functionality.

```tsx
const {
  startTour,
  stopTour,
  nextStep,
  previousStep,
  isTourActive,
  currentStep,
  tourSteps
} = useGuidedTour();
```

#### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `startTour` | `(steps: TourStep[]) => void` | Start guided tour |
| `stopTour` | `() => void` | Stop guided tour |
| `nextStep` | `() => void` | Go to next step |
| `previousStep` | `() => void` | Go to previous step |
| `isTourActive` | `boolean` | Tour active state |
| `currentStep` | `string` | Current step ID |
| `tourSteps` | `TourStep[]` | Tour steps array |

## Types

### UserProfile

```tsx
interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
  preferences?: {
    emailNotifications: boolean;
    publicProfile: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### TourStep

```tsx
interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string; // CSS selector
  position?: 'top' | 'bottom' | 'left' | 'right';
  showArrow?: boolean;
}
```

### ProfileTab

```tsx
interface ProfileTab {
  id: string;
  label: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}
```

## Profile Management

### Update Profile

```tsx
const handleProfileUpdate = async (updatedProfile: UserProfile) => {
  try {
    const response = await fetch(`/api/profile/${user.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updatedProfile)
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Profile update failed:', error);
    throw error;
  }
};
```

### Avatar Upload

```tsx
const handleAvatarUpload = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch('/api/profile/avatar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Avatar upload failed');
    }

    const { avatarUrl } = await response.json();
    return avatarUrl;
  } catch (error) {
    console.error('Avatar upload failed:', error);
    return null;
  }
};
```

## Guided Tour

### Creating Tour Steps

```tsx
const createProfileTour = (): TourStep[] => [
  {
    id: 'welcome',
    title: 'Welcome to Your Profile',
    content: 'Let\'s take a quick tour of your profile features',
    target: '#profile-header',
    position: 'bottom'
  },
  {
    id: 'basic-info',
    title: 'Basic Information',
    content: 'Update your name, email, and other basic details',
    target: '#basic-info-section',
    position: 'right'
  },
  {
    id: 'avatar',
    title: 'Profile Picture',
    content: 'Upload and crop your profile picture',
    target: '#avatar-upload',
    position: 'left'
  },
  {
    id: 'social-links',
    title: 'Social Links',
    content: 'Add your social media profiles',
    target: '#social-links',
    position: 'top'
  }
];
```

### Tour Navigation

```tsx
const ProfileTour = () => {
  const { startTour, nextStep, previousStep, isTourActive } = useGuidedTour();

  const handleStartTour = () => {
    const tourSteps = createProfileTour();
    startTour(tourSteps);
  };

  return (
    <div>
      {!isTourActive && (
        <button onClick={handleStartTour}>
          Start Profile Tour
        </button>
      )}
      
      {isTourActive && (
        <div className="tour-controls">
          <button onClick={previousStep}>Previous</button>
          <button onClick={nextStep}>Next</button>
        </div>
      )}
    </div>
  );
};
```

## Styling

The components use Tailwind CSS for styling. You can customize the appearance by:

1. **Overriding CSS classes**: Pass custom `className` props
2. **CSS Variables**: Override CSS custom properties
3. **Tailwind Config**: Extend the Tailwind configuration

### Custom Styling Example

```tsx
<Profile
  user={user}
  onUpdate={handleProfileUpdate}
  className="custom-profile bg-white rounded-lg shadow-lg p-6"
/>
```

## Testing

Run tests for this package:

```bash
pnpm test
```

### Test Coverage

- Profile display and editing
- Avatar upload functionality
- Guided tour navigation
- Tabbed navigation
- Form validation
- Error handling

## Accessibility

The components include full accessibility support:

- **Keyboard navigation**: Tab, Enter, Escape keys
- **Screen reader support**: ARIA labels and descriptions
- **Focus management**: Proper focus trapping and restoration
- **High contrast**: Compatible with high contrast themes

## Contributing

1. Follow the monorepo's coding standards
2. Write tests for new features
3. Update documentation for API changes
4. Ensure TypeScript types are accurate
5. Test accessibility features

## Related Packages

- `@repo/ui` - Base UI components
- `@repo/features/ImageUploadModal` - Image upload modal
- `@repo/auth` - Authentication utilities 