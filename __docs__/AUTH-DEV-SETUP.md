# Auth Development Environment Setup

This guide explains how to run the complete auth development environment, including the backend API, frontend UI, and MongoDB database for the LEGO MOC Instructions application.

## Prerequisites

- **Docker**: Make sure Docker is installed and running
- **Node.js**: Version 18 or higher
- **pnpm**: The package manager used in this monorepo

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Start all services with one command
pnpm auth:start

# Stop all services
pnpm auth:stop-all
```

### Option 2: Manual Setup

```bash
# 1. Start the database
pnpm auth:db:up

# 2. Start the backend (in a new terminal)
pnpm auth:backend

# 3. Start the frontend (in a new terminal)
pnpm auth:ui

# 4. Stop the database when done
pnpm auth:stop
```

### Option 3: Concurrent Setup

```bash
# Start backend and frontend concurrently (database must be running)
pnpm auth:dev
```

## Available Services

Once started, you'll have access to:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend UI** | http://localhost:3000 | LEGO MOC Instructions app |
| **Backend API** | http://localhost:5000 | Express auth service |
| **MongoDB** | mongodb://localhost:27017 | Database |
| **Mongo Express** | http://localhost:8081 | Database admin interface |

## Available Scripts

### Database Management
- `pnpm auth:db:up` - Start MongoDB and Mongo Express
- `pnpm auth:db:down` - Stop MongoDB and Mongo Express
- `pnpm auth:db:logs` - View database logs

### Application Services
- `pnpm auth:backend` - Start the auth backend service
- `pnpm auth:ui` - Start the LEGO MOC Instructions frontend app
- `pnpm auth:dev` - Start backend and frontend concurrently

### Complete Environment
- `pnpm auth:start` - Start everything (database + backend + frontend)
- `pnpm auth:stop-all` - Stop everything and clean up processes

## Development Workflow

1. **Start the environment**:
   ```bash
   pnpm auth:start
   ```

2. **Make changes** to your code - both frontend and backend will hot-reload

3. **View logs** if needed:
   ```bash
   pnpm auth:db:logs
   ```

4. **Stop everything** when done:
   ```bash
   pnpm auth:stop-all
   ```

## Troubleshooting

### Port Conflicts
If you see warnings about ports being in use:
- Check if you have other services running on ports 27017, 8081, 5000, or 3000
- Stop conflicting services or change the ports in the respective configuration files

### Docker Issues
- Ensure Docker is running
- Try restarting Docker if containers won't start
- Check Docker logs: `docker-compose logs` (in the auth-service directory)

### Database Connection Issues
- Wait a few seconds after starting the database before starting the backend
- Check if MongoDB is running: `docker ps`
- Verify the connection string in the backend configuration

### Process Management
- If processes don't stop properly, you can manually kill them:
  ```bash
  # Kill processes on specific ports
  lsof -ti:5000 | xargs kill -9  # Backend
  lsof -ti:3000 | xargs kill -9  # Frontend
  ```

## Environment Variables

The backend uses environment variables for configuration. Make sure you have a `.env` file in the `apps/api/auth-service` directory with the necessary variables.

### Email Configuration
For testing email flows (password reset, verification), you can use Ethereal Email:

```bash
# Add to your .env file
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=your_ethereal_username
ETHEREAL_PASS=your_ethereal_password
ETHEREAL_SECURE=false
CLIENT_URL=http://localhost:3000
```

To get Ethereal credentials, visit: https://ethereal.email/create

## Project Structure

The auth functionality is integrated into the main LEGO MOC Instructions application:

```
apps/
├── api/
│   └── auth-service/          # Authentication backend service
└── web/
    └── lego-moc-instructions-app/  # Main React application with auth

packages/
├── auth/                      # Auth components and utilities
├── features/                  # Feature packages
├── ui/                        # UI component library
└── shared/                    # Shared utilities
```

## API Endpoints

The backend provides these main endpoints:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify authentication
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

## Testing

Run tests for the auth service:
```bash
cd apps/api/auth-service
pnpm test
```

Run tests for the frontend app:
```bash
cd apps/web/lego-moc-instructions-app
pnpm test
```

Run E2E tests for auth flows:
```bash
# Run all E2E tests
pnpm test:e2e:all

# Run only auth-related E2E tests
pnpm test:e2e:auth

# Run specific auth flows
pnpm test:e2e:login
pnpm test:e2e:signup
```

## Auth Package

The `packages/auth/` directory contains reusable authentication components:

- **Components**: Login, Signup, Password Reset forms
- **Hooks**: `useAuth` for authentication state management
- **Store**: Redux store for auth state
- **Utilities**: Auth helpers and utilities

To use auth components in other parts of the application:

```bash
# Import from the auth package
import { LoginForm, SignupForm, useAuth } from '@repo/auth'
``` 