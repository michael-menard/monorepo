# React Constructs Monorepo - Chat Context

## Project Overview
This is a React monorepo using pnpm workspaces with the following structure:
- `apps/web/lego-projects-ui/` - Main React frontend application
- `apps/api/` - Backend API service
- `packages/ui/` - Shared UI components
- `packages/utils/` - Shared utilities

## Current State
- Frontend: React + TypeScript + Vite + Tailwind CSS
- State Management: Redux Toolkit
- Authentication: Protected routes with Redux state
- UI Components: shadcn/ui + custom components
- Navigation: React Router with nested routes
- Layouts: Authenticated and Unauthenticated layouts

## Key Features
- Module-based routing (Auth, Instructions, Inspiration, Profile)
- Redux authentication state management
- Protected routes with route guards
- Responsive design with Tailwind CSS
- Component-based architecture

## Development Guidelines
- Use TypeScript for all new code
- Prefer Tailwind CSS classes over inline styles
- Keep components in their own directories
- Use functional components with hooks

## Recent Changes
- Set up Redux Toolkit with user authentication slice
- Created protected route component
- Implemented nested routing with layout wrappers
- Added shadcn/ui components
- Created standard navbar with conditional rendering

## Next Steps
- Create auth service in `apps/api/auth-service/`
- Integrate auth UI components
- Connect frontend to auth service

## Common Tasks
- Adding new components
- Setting up new routes
- Integrating with backend services
- Managing authentication state
- Styling with Tailwind CSS 