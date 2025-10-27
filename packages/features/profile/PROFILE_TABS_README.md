# Profile Tabs Component

The Profile Tabs component provides a comprehensive tabbed interface for the profile page with four main sections: Instructions, Wishlist, Inspiration Gallery, and Settings.

## Features

- **Four Main Tabs**: Instructions, Wishlist, Inspiration Gallery, and Settings
- **Responsive Design**: Works on all screen sizes
- **Accessible**: Full keyboard navigation and screen reader support
- **Customizable**: Configurable default tab and styling
- **Rich Content**: Each tab contains relevant information and actions

## Usage

### Basic Usage

```tsx
import { ProfileTabs } from '@repo/profile'

function ProfilePage() {
  return (
    <div className="p-6">
      <ProfileTabs />
    </div>
  )
}
```

### With Custom Default Tab

```tsx
import { ProfileTabs } from '@repo/profile'

function ProfilePage() {
  return (
    <div className="p-6">
      <ProfileTabs defaultTab="wishlist" />
    </div>
  )
}
```

### With ProfileMain Component

```tsx
import { ProfileMain } from '@repo/profile'

function ProfilePage() {
  return (
    <ProfileMain
      title="My Profile"
      description="Manage your profile and preferences"
      showTabs={true}
      defaultTab="instructions"
    />
  )
}
```

## Tab Content

### Instructions Tab

- **My Instructions**: View and manage saved building instructions
- **Drafts**: Continue working on instruction drafts
- **In Progress**: Instructions currently being worked on
- **Recent Activity**: Timeline of instruction-related activities

### Wishlist Tab

- **Wishlist Items**: Total items in your wishlist
- **Purchased**: Items acquired from wishlist
- **Priority**: High priority wishlist items
- **Recent Activity**: Wishlist updates and purchases

### Inspiration Gallery Tab

- **Saved Images**: Images saved for inspiration
- **Favorites**: Most loved inspirational builds
- **Collections**: Organized inspiration collections
- **Recent Inspiration**: Latest saved inspirational content

### Settings Tab

- **Profile Settings**: Display name, email, avatar management
- **Notifications**: Email, push, and wishlist alerts
- **Appearance**: Theme, language, timezone settings
- **Privacy & Security**: Two-factor auth, password, data export

## Props

### ProfileTabs Props

| Prop         | Type     | Default          | Description            |
| ------------ | -------- | ---------------- | ---------------------- |
| `className`  | `string` | `''`             | Additional CSS classes |
| `defaultTab` | `string` | `'instructions'` | Initial active tab     |

### ProfileMain Props (Updated)

| Prop         | Type              | Default          | Description                             |
| ------------ | ----------------- | ---------------- | --------------------------------------- |
| `showTabs`   | `boolean`         | `true`           | Whether to show tabs or custom content  |
| `defaultTab` | `string`          | `'instructions'` | Default tab when tabs are shown         |
| `children`   | `React.ReactNode` | -                | Custom content when `showTabs` is false |

## Tab Values

- `'instructions'` - Instructions tab
- `'wishlist'` - Wishlist tab
- `'inspiration-gallery'` - Inspiration Gallery tab
- `'settings'` - Settings tab

## Styling

The tabs use a clean, modern design with:

- Horizontal tab navigation
- Active tab indicators
- Hover effects
- Responsive grid layouts for content
- Consistent spacing and typography

## Accessibility

- Full keyboard navigation support
- ARIA labels and roles
- Screen reader friendly
- Focus management
- High contrast support

## Dependencies

- `@repo/ui` - UI components (Tabs, Card, etc.)
- `lucide-react` - Icons
- `react` - React framework
- `tailwindcss` - Styling

## Testing

Run tests with:

```bash
pnpm test
```

The component includes comprehensive tests for:

- Tab rendering
- Tab switching
- Props handling
- Accessibility features
