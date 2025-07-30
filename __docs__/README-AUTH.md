# Auth Development Quick Reference

## 🚀 Quick Start

```bash
# Test the setup
pnpm auth:test-setup

# Start everything
pnpm auth:start

# Stop everything
pnpm auth:stop-all
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `pnpm auth:test-setup` | Test if the setup is working correctly |
| `pnpm auth:start` | Start database, backend, and frontend |
| `pnpm auth:stop-all` | Stop all services and clean up |
| `pnpm auth:db:up` | Start only the database |
| `pnpm auth:db:down` | Stop only the database |
| `pnpm auth:db:logs` | View database logs |
| `pnpm auth:backend` | Start only the backend |
| `pnpm auth:ui` | Start only the frontend |
| `pnpm auth:dev` | Start backend and frontend concurrently |

## 🌐 Services

- **Frontend**: http://localhost:3000 (LEGO MOC Instructions app)
- **Backend API**: http://localhost:5000 (Auth service)
- **MongoDB**: mongodb://localhost:27017
- **Mongo Express**: http://localhost:8081

## 📖 Full Documentation

See `AUTH-DEV-SETUP.md` for detailed setup instructions and troubleshooting.

## 🧪 Testing

```bash
# Run auth service tests
cd apps/api/auth-service && pnpm test

# Run frontend tests
cd apps/web/lego-moc-instructions-app && pnpm test

# Run E2E auth tests
pnpm test:e2e:auth

# Run specific auth flows
pnpm test:e2e:login
pnpm test:e2e:signup
```

## 📦 Project Structure

```
apps/
├── api/auth-service/          # Authentication backend
└── web/lego-moc-instructions-app/  # Main React app with auth

packages/
├── auth/                      # Auth components & utilities
├── features/                  # Feature packages
├── ui/                        # UI component library
└── shared/                    # Shared utilities
```

## 🔧 Prerequisites

- Docker (running)
- Node.js 18+
- pnpm

## 📧 Email Configuration

For testing email flows (password reset, verification), configure Ethereal Email:

```bash
# Add to apps/api/auth-service/.env
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=your_ethereal_username
ETHEREAL_PASS=your_ethereal_password
ETHEREAL_SECURE=false
CLIENT_URL=http://localhost:3000
```

Get free Ethereal credentials at: https://ethereal.email/create

## 🎯 Auth Package

The `packages/auth/` directory contains reusable authentication components:

- **Components**: Login, Signup, Password Reset forms
- **Hooks**: `useAuth` for authentication state management
- **Store**: Redux store for auth state
- **Utilities**: Auth helpers and utilities

Import auth components in your app:
```typescript
import { LoginForm, SignupForm, useAuth } from '@repo/auth'
```

## 🐛 Troubleshooting

If you encounter issues:

1. **Docker not running**: Start Docker Desktop
2. **Port conflicts**: Check if ports 27017, 8081, 5000, 3000 are in use
3. **Database connection**: Wait 5-10 seconds after starting database before starting backend
4. **Process cleanup**: Use `pnpm auth:stop-all` to properly clean up all processes
5. **Email testing**: Ensure Ethereal Email is configured in `.env` for password reset testing 