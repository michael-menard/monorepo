# Routing Guide

## Route Structure
- Use a central `routes/` directory for all route definitions
- Group related pages under feature folders

## Protected Routes
- Use a `ProtectedRoute` component to guard authenticated pages
- Redirect unauthenticated users to the login page

## Auth Flow
- Store JWT tokens in httpOnly cookies
- Use a global auth context or store
- Refresh tokens automatically when expired

## Example
```tsx
<Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
``` 