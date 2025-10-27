# Layout Component

A comprehensive layout component that provides a sticky navigation bar with authentication-aware navigation and branding, fully leveraging shadcn/ui components.

## Features

### 🎨 **Sticky Navigation Bar**

- **Position**: Sticky at the top with high z-index
- **Styling**: Backdrop blur effect with semi-transparent background
- **Responsive**: Adapts to different screen sizes
- **Height**: Fixed 64px (h-16) height

### 🏷️ **Enhanced Branding**

- **Logo**: "M" icon in primary color with rounded background
- **Brand Name**: "MOC Builder" in bold typography
- **Badge**: "Beta" badge to indicate development status
- **Navigation**: Links to home page when clicked
- **Hover Effects**: Smooth opacity transitions

### 🔐 **Authentication-Aware Navigation**

#### **Unauthenticated Users**

- **Navigation Menu**: Browse MOCs link in center navigation
- **Sign In Button**: Placeholder for authentication
- **Sign Up Button**: Placeholder for registration

#### **Authenticated Users**

- **Navigation Menu**: Browse MOCs and Wishlist links in center navigation
- **User Dropdown**:
  - User avatar with initials fallback
  - User name and email display
  - Profile link
  - Settings option
  - Log out functionality

### 🎯 **Enhanced User Experience**

- **Shadcn Navigation Menu**: Professional navigation with proper styling
- **Dropdown Menu**: Rich user menu with proper separators and icons
- **Consistent Navigation**: Same navigation structure across all pages
- **Visual Feedback**: Hover effects and proper button states
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Responsive Design**: Mobile-friendly navigation structure

## Component Structure

```typescript
interface LayoutProps {
  children: React.ReactNode
}
```

## Usage

```tsx
import Layout from './components/Layout'

function App() {
  return (
    <Layout>
      <YourPageContent />
    </Layout>
  )
}
```

## Shadcn/ui Integration

### **Components Used**

- `NavigationMenu` - Professional navigation structure
- `DropdownMenu` - User account dropdown
- `Avatar` - User profile display
- `Badge` - Status indicators
- `Button` - Action buttons
- `cn` - Utility for class name merging

### **Navigation Menu Features**

- **Center Navigation**: Browse MOCs and Wishlist links
- **Conditional Rendering**: Wishlist only shows for authenticated users
- **Proper Styling**: Uses shadcn navigation menu styling
- **Icons**: Lucide React icons for visual clarity

### **Dropdown Menu Features**

- **User Information**: Displays name and email
- **Profile Link**: Direct navigation to profile page
- **Settings Option**: Placeholder for user settings
- **Log Out**: Placeholder for logout functionality
- **Proper Separators**: Visual separation between sections

## Authentication Integration

### **Mock Authentication State**

Currently uses a mock authentication state for development:

```typescript
const mockAuth = {
  isAuthenticated: false, // Toggle to test different states
  user: {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    emailVerified: true,
    avatar: null as string | null, // Will be replaced with real avatar URL
  },
}
```

### **Future Integration**

- Replace mock auth with real authentication state
- Add proper sign in/sign up functionality
- Integrate with user profile management
- Add avatar upload and management
- Implement logout functionality

## Styling

### **Navbar Styling**

- **Background**: Semi-transparent with backdrop blur
- **Border**: Bottom border for visual separation
- **Height**: Fixed 64px (h-16) height
- **Z-index**: High z-index (z-50) for proper layering

### **Brand Styling**

- **Logo**: 32px square with primary background
- **Typography**: Bold, large text for brand name
- **Badge**: Secondary variant badge for status
- **Spacing**: Proper spacing between logo and text
- **Hover Effects**: Smooth opacity transitions

### **Navigation Styling**

- **Shadcn Navigation**: Professional navigation menu styling
- **Dropdown Styling**: Rich dropdown with proper spacing
- **Button Variants**: Ghost and default button variants
- **Responsive**: Adapts to mobile and desktop layouts

## Navigation Flow

### **Public Routes**

- ✅ Home (`/`)
- ✅ Browse MOCs (`/moc-instructions`)
- ❌ Wishlist (redirects to home)
- ❌ Profile (redirects to home)

### **Authenticated Routes**

- ✅ Home (`/`)
- ✅ Browse MOCs (`/moc-instructions`)
- ✅ Wishlist (`/wishlist`)
- ✅ Profile (`/profile`)

## Technical Implementation

### **Shadcn Components**

- `NavigationMenu` - Professional navigation structure
- `DropdownMenu` - User account management
- `Avatar` - User profile display
- `Badge` - Status indicators
- `Button` - Action buttons
- `cn` - Utility for class name merging

### **State Management**

- Mock authentication state (ready for real auth integration)
- Conditional rendering based on auth status
- User avatar and initials handling

### **Routing**

- All navigation uses TanStack Router `Link` components
- Proper route protection integration
- Consistent redirect behavior

## Integration with Main App

The Layout component is integrated into the main application in `src/main.tsx`:

```typescript
export const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
      <TanStackRouterDevtools />
      <TanStackQueryLayout />
    </Layout>
  ),
})
```

This ensures that **ALL ROUTES** inherit the layout with the sticky navigation bar, providing consistent navigation and branding across the entire application.

## Route Wrapping

The Layout component wraps **ALL ROUTES** in the LEGO app:

- ✅ **Home Route** (`/`) - Landing page
- ✅ **MOC Gallery** (`/moc-instructions`) - Browse MOCs
- ✅ **MOC Detail** (`/moc-instructions/$id`) - Individual MOC view
- ✅ **Profile** (`/profile`) - User profile (protected)
- ✅ **Wishlist** (`/wishlist`) - User wishlist (protected)
- ✅ **Demo Routes** - TanStack Query demo pages

## Future Enhancements

### **Authentication Integration**

1. Replace mock auth with real authentication state
2. Add sign in/sign up modal or dedicated pages
3. Implement session management
4. Add user avatar upload functionality
5. Implement logout functionality

### **Navigation Enhancements**

1. Add mobile hamburger menu for smaller screens
2. Include user settings and preferences
3. Add notifications and alerts
4. Implement search functionality
5. Add breadcrumb navigation

### **Responsive Design**

1. Mobile hamburger menu for smaller screens
2. Collapsible navigation on mobile
3. Touch-friendly interactions
4. Proper mobile navigation patterns
5. Responsive dropdown positioning

### **Accessibility Improvements**

1. ARIA labels for all interactive elements
2. Keyboard navigation support
3. Screen reader optimization
4. High contrast mode support
5. Focus management for dropdowns

### **Shadcn Enhancements**

1. Add more shadcn components as needed
2. Implement theme switching
3. Add loading states with shadcn components
4. Implement toast notifications
5. Add form components for settings

The Layout component provides a solid foundation for consistent navigation and branding across the entire application while fully leveraging the power of shadcn/ui components for a professional, accessible, and maintainable user interface.
