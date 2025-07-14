# Auth UI Example

This is an example application demonstrating how to use the `@repo/auth` package in a real React application.

## Features

- Complete authentication flow demonstration
- All auth pages and components from the auth package
- Redux integration
- React Router setup
- Tailwind CSS styling

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the development server:
   ```bash
   pnpm dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

## Available Routes

- `/` - Home page
- `/login` - Login page
- `/signup` - Signup page
- `/forgot-password` - Forgot password page
- `/reset-password/:token` - Reset password page
- `/verify-email` - Email verification page
- `/dashboard` - Dashboard page (protected)

## Testing

Run the test suite:

```bash
pnpm test
```

## Building

Build the app for production:

```bash
pnpm build
```

## Integration with Auth Package

This example shows how to:

1. Import and use auth components from `@repo/auth`
2. Set up Redux store with auth reducer
3. Configure React Router with auth routes
4. Handle authentication state and navigation

The auth package provides reusable components that can be integrated into any React application following this pattern. 