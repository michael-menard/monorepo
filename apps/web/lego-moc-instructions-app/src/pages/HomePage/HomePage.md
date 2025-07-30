# HomePage Implementation

This document outlines the comprehensive HomePage component that serves as the main entry point for the LEGO MOC Instructions application.

## File Structure

```
src/
├── pages/
│   └── HomePage/
│       ├── index.tsx                    ← HomePage component
│       └── __tests__/
│           └── HomePage.test.tsx        ← HomePage tests
├── routes/
│   └── home.tsx                         ← Home route configuration
└── App.tsx                              ← Simplified app wrapper
```

## Overview

The HomePage (`/`) is a public landing page that provides users with an overview of the application's features and serves as a gateway to all other sections. It's designed to be welcoming for both new and returning users.

## Features

### 🌟 **Hero Section**
- **Main Heading**: Application name with large, bold typography
- **Description**: Compelling description of the platform's purpose
- **Call-to-Action Buttons**: 
  - **Authenticated Users**: "Browse MOCs" and "My Wishlist"
  - **Unauthenticated Users**: "Browse MOCs" and "Sign Up"
- **Welcome Message**: Personalized greeting for authenticated users

### 📊 **Statistics Section**
Displays key platform metrics in card format:
- **10,000+ MOC Instructions**
- **5,000+ Active Users**
- **50,000+ Downloads**
- **4.8★ Community Rating**

### 🎯 **Feature Cards**
Four main feature cards highlighting core functionality:

1. **Browse MOC Instructions** (Public)
   - Explore community MOCs
   - Link to `/moc-instructions`

2. **Personal Wishlist** (Protected)
   - Save favorite MOCs
   - Link to `/wishlist`
   - Shows "Login Required" for unauthenticated users

3. **User Profiles** (Protected)
   - Manage profile and uploads
   - Link to `/profile`
   - Shows "Login Required" for unauthenticated users

4. **Share Your MOCs** (Protected)
   - Upload custom creations
   - Link to `/moc-instructions/new`
   - Shows "Login Required" for unauthenticated users

### 🏆 **Why Choose Us Section**
Three value propositions with icons:
- **Secure & Reliable**: Enterprise-grade security
- **Lightning Fast**: Optimized performance
- **Community Driven**: Builder-focused platform

### 🚀 **Call-to-Action Section**
Final encouragement to join the platform with prominent buttons.

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
  },
};
```

### **Conditional Rendering**
- **Navigation Buttons**: Different CTAs based on auth status
- **Feature Cards**: Disabled state for protected features
- **Welcome Message**: Only shown for authenticated users

## Navigation Flow

### **Public Access**
- ✅ Browse MOC Gallery (`/moc-instructions`)
- ❌ Wishlist (redirects to home)
- ❌ Profile (redirects to home)
- ❌ Upload MOC (redirects to home)

### **Authenticated Access**
- ✅ Browse MOC Gallery (`/moc-instructions`)
- ✅ Wishlist (`/wishlist`)
- ✅ Profile (`/profile`)
- ✅ Upload MOC (`/moc-instructions/new`)

## Design Features

### **Responsive Layout**
- Mobile-first design
- Grid layouts that adapt to screen size
- Proper spacing and typography hierarchy

### **Visual Elements**
- **Icons**: Lucide React icons for visual appeal
- **Cards**: Shadcn/ui card components
- **Buttons**: Consistent button styling with variants
- **Colors**: Theme-aware color scheme

### **Interactive Elements**
- **Hover Effects**: Cards have shadow transitions
- **Links**: Proper navigation with TanStack Router
- **Disabled States**: Clear indication for protected features

## Technical Implementation

### **Components Used**
- `Button`, `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle` from `@repo/ui`
- `Link` from `@tanstack/react-router`
- Lucide React icons for visual elements

### **State Management**
- Mock authentication state (ready for real auth integration)
- Conditional rendering based on auth status
- Feature availability indicators

### **Routing**
- All navigation uses TanStack Router `Link` components
- Proper route protection integration
- Consistent redirect behavior

## Route Configuration

The HomePage is configured in `src/routes/home.tsx`:

```typescript
export const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});
```

And registered in `src/main.tsx`:

```typescript
const routeTree = rootRoute.addChildren([
  homeRoute,  // HomePage at root path
  // ... other routes
])
```

## Testing

### **HomePage Tests**
Located in `src/pages/HomePage/__tests__/HomePage.test.tsx`:
- Component rendering tests
- Authentication state handling
- Navigation functionality
- Feature card interactions

### **Test Coverage**
- ✅ Main heading and description
- ✅ Navigation buttons
- ✅ Feature cards
- ✅ Statistics section
- ✅ Why choose us section
- ✅ Call-to-action section
- ✅ Authentication integration

## Future Enhancements

### **Real Authentication Integration**
1. Replace mock auth with real authentication state
2. Add login/signup modal or dedicated pages
3. Implement session management
4. Add user avatar and profile menu

### **Content Management**
1. Dynamic statistics from backend
2. Featured MOCs carousel
3. Recent activity feed
4. Community highlights

### **Performance Optimizations**
1. Image optimization for hero section
2. Lazy loading for feature cards
3. Prefetching for main navigation routes
4. Analytics integration

### **Accessibility Improvements**
1. ARIA labels for all interactive elements
2. Keyboard navigation support
3. Screen reader optimization
4. High contrast mode support

## Security Considerations

### **Route Protection**
- Home page remains public
- Protected features clearly marked
- Consistent redirect behavior
- No sensitive data exposure

### **Content Security**
- Sanitized user content
- XSS protection
- CSRF protection
- Secure navigation

The HomePage provides a solid foundation for user engagement while maintaining security through proper route protection and authentication integration. 