# @monorepo/profile

Reusable Profile Page UI Package for Monorepo Apps

---

## Overview

This package provides a fully tested, accessible, and customizable Profile Page UI for React apps in your monorepo. It includes:
- **ProfilePage**: Two-column layout (sidebar + main content)
- **ProfileSidebar**: Avatar, display name, username, stats, and inline editing
- **AvatarUploader**: File selection, cropping, and upload
- **ProfileSkeleton**: Loading state skeleton
- **TypeScript types** for all props and data
- **Full test suite** (Vitest + React Testing Library)

---

## Installation

```sh
pnpm add @monorepo/profile
```

---

## Usage

```tsx
import { ProfilePage, type ProfileData } from '@monorepo/profile';

const profile: ProfileData = {
  id: '1',
  username: 'johndoe',
  displayName: 'John Doe',
  avatarUrl: 'https://example.com/avatar.jpg',
  stats: {
    projects: 12,
    followers: 150,
    following: 89,
  },
};

<ProfilePage
  profile={profile}
  onAvatarUpload={async (file) => { /* upload logic */ }}
  onProfileUpdate={async (data) => { /* update logic */ }}
  isEditable={true}
>
  {/* Right column: custom content */}
  <div>Your app's profile content here</div>
</ProfilePage>
```

---

## Components & Props

### `ProfilePage`
- **profile**: `ProfileData` (required)
- **onAvatarUpload**: `(file: File) => Promise<string>` (optional)
- **onProfileUpdate**: `(data: Partial<ProfileData>) => Promise<void>` (optional)
- **isEditable**: `boolean` (optional)
- **loading**: `boolean` (optional)
- **children**: `React.ReactNode` (right column content)

### `ProfileSidebar`
- **profile**: `ProfileData`
- **onAvatarUpload**: `(file: File) => Promise<string>` (optional)
- **onProfileUpdate**: `(data: Partial<ProfileData>) => Promise<void>` (optional)
- **isEditable**: `boolean` (optional)

### `AvatarUploader`
- **value**: `string` (avatar URL)
- **onChange**: `(url: string) => void`
- **displayName**: `string`
- **disabled**: `boolean` (optional)

### `ProfileSkeleton`
- Loading skeleton for profile page

---

## Customization
- **Sidebar**: Always shows avatar, display name, username, and stats
- **Main Content**: Pass any custom content as children to `ProfilePage`
- **Inline Editing**: If `isEditable` and `onProfileUpdate` are provided, users can edit their display name inline (validated with React Hook Form + Zod)
- **Avatar Upload**: If `isEditable` and `onAvatarUpload` are provided, users can upload/crop a new avatar

---

## Testing

- All components are covered by Vitest + React Testing Library
- To run tests:
  ```sh
  pnpm test:run
  ```
- Tests cover rendering, editing, validation, avatar upload, and loading states

---

## Accessibility
- All interactive elements are keyboard accessible
- AvatarUploader and forms use proper labels and roles
- Skeleton and loading states are screen-reader friendly

---

## License
MIT 