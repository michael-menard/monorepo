# Profile Guided Tour

This document explains how to use the guided tour functionality in the profile feature, which helps users understand the profile interface through interactive step-by-step walkthroughs.

## Overview

The guided tour component is based on the [RigidUI Guided Tour](https://www.rigidui.com/docs/components/guided-tour) and has been integrated into the profile feature to provide an enhanced user experience.

## Components

### ProfilePageWithTour

A wrapper component that adds guided tour functionality to the standard ProfilePage.

#### Props

- `showTour?: boolean` - Whether to show the tour (default: true)
- `onTourComplete?: () => void` - Callback when tour is completed
- `onTourSkip?: () => void` - Callback when tour is skipped
- All standard ProfilePage props

#### Usage

```tsx
import { ProfilePageWithTour } from '@repo/profile'

const MyProfilePage = () => {
  const handleTourComplete = () => {
    console.log('Tour completed!')
  }

  const handleTourSkip = () => {
    console.log('Tour skipped.')
  }

  return (
    <ProfilePageWithTour
      profile={userProfile}
      sidebarContent={sidebarContent}
      showTour={true}
      onTourComplete={handleTourComplete}
      onTourSkip={handleTourSkip}
    />
  )
}
```

### ProfileTourExample

A complete example component that demonstrates the guided tour functionality with sample data.

#### Usage

```tsx
import { ProfileTourExample } from '@repo/profile'

const ExamplePage = () => {
  return <ProfileTourExample showTour={true} />
}
```

## Tour Steps

The guided tour includes the following steps:

1. **Welcome** - Introduces the profile page
2. **Profile Avatar** - Explains the profile picture section
3. **Personal Information** - Shows how to view/edit basic info
4. **Bio Section** - Explains the about me section
5. **Account Settings** - Points to settings in the sidebar
6. **Quick Actions** - Shows available action buttons

## Features

### Interactive Guidance

- Highlights specific elements on the interface
- Provides contextual explanations
- Guides users through complex workflows

### Smart Positioning

- Automatically calculates optimal popover positioning
- Works perfectly on any screen size
- Responsive design

### Completion Tracking

- Tracks tour completion status in localStorage
- Prevents showing the tour repeatedly
- Customizable storage key

### Progress Tracking

- Built-in progress indicator
- Smooth transitions between steps
- Clear navigation controls

## Customization

### Tour Content

You can customize the tour content by modifying the `ProfilePageWithTour` component:

```tsx
<TourStep
  id="custom-step"
  title="Custom Title"
  content="Custom content for this step"
  order={1}
  position="bottom"
>
  <div>Your content here</div>
</TourStep>
```

### Styling

The tour trigger button and popovers can be styled using Tailwind CSS classes:

```tsx
<TourTrigger className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
  Custom Tour Button
</TourTrigger>
```

### Storage

The tour completion status is stored in localStorage with the key `profile-tour-completed`. You can customize this:

```tsx
<TourProvider storageKey="my-custom-tour-key">{/* Your content */}</TourProvider>
```

## Integration with Existing Profile Components

The guided tour works seamlessly with existing profile components:

- `ProfileCard` - Displays user information
- `ProfileMain` - Main content area
- `ProfileSidebar` - Sidebar navigation
- `AvatarUploader` - Profile picture upload
- `ProtectedProfilePage` - Route-protected profile page

## Best Practices

1. **Don't force the tour** - Always allow users to skip or dismiss the tour
2. **Keep steps concise** - Each step should focus on one concept
3. **Use clear language** - Write content that's easy to understand
4. **Test on different screen sizes** - Ensure the tour works on mobile and desktop
5. **Provide value** - Make sure the tour actually helps users understand the interface

## Troubleshooting

### Tour not showing

- Check that `showTour` prop is set to `true`
- Verify that the tour hasn't been completed before (check localStorage)
- Ensure all required dependencies are installed

### Import errors

- Make sure `@repo/ui` is properly installed and built
- Verify that the guided tour components are exported from the UI package
- Check that the profile package has `@repo/ui` as a dependency

### Styling issues

- Ensure Tailwind CSS is properly configured
- Check that the tour components are using the correct CSS classes
- Verify that the theme (light/dark) is properly applied

## Dependencies

- `@repo/ui` - Contains the guided tour components
- React 18+ - Required for the tour functionality
- Tailwind CSS - For styling the tour components

## Related Links

- [RigidUI Guided Tour Documentation](https://www.rigidui.com/docs/components/guided-tour)
- [Profile Feature Documentation](./README.md)
- [UI Package Documentation](../ui/README.md)
