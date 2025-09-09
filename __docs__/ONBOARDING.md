# Onboarding Guide

Welcome to the LEGO MOC Instructions monorepo! This guide will help you get started with development.

## Quick Start Options

Choose your preferred development setup:

### Option 1: Native Development (Recommended for Development)

**Prerequisites:**
- Node.js 18+
- pnpm 8+
- MongoDB (for auth service)

**Steps:**
1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd <repo-dir>
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example files
   cp .env.example .env
   cp apps/api/auth-service/.env.example apps/api/auth-service/.env
   cp apps/api/lego-projects-api/.env.example apps/api/lego-projects-api/.env
   cp apps/web/lego-moc-instructions-app/.env.example apps/web/lego-moc-instructions-app/.env
   ```

4. **Start MongoDB (if using local MongoDB)**
   ```bash
   # macOS with Homebrew
   brew services start mongodb-community
   
   # Or manually
   mongod --dbpath /usr/local/var/mongodb
   ```

5. **Start the backend services**
   ```bash
   # Terminal 1: Auth Service
   cd apps/api/auth-service && pnpm dev
   
   # Terminal 2: LEGO Projects API
   cd apps/api/lego-projects-api && pnpm dev
   ```

6. **Start the frontend**
   ```bash
   # Terminal 3: Main Application
   cd apps/web/lego-moc-instructions-app && pnpm dev
   
   # Terminal 4 (Optional): Documentation Site
   cd apps/web/lego-moc-docs && pnpm start
   ```

### Option 2: Docker Development

**Prerequisites:**
- Docker and Docker Compose

**Steps:**
```bash
# Start all services with Docker
pnpm auth:start

# Or start services individually
pnpm auth:db:up      # Database only
pnpm auth:backend    # Backend only
pnpm auth:ui         # Frontend only
```

## Available Services

Once started, you'll have access to:

| Service | URL | Description |
|---------|-----|-------------|
| **Main App** | http://localhost:5173 | React application (Vite dev server) |
| **Documentation** | http://localhost:3000 | Docusaurus docs site |
| **Auth API** | http://localhost:5000 | Authentication service |
| **LEGO Projects API** | http://localhost:3001 | Main backend API |
| **MongoDB** | mongodb://localhost:27017 | Database |
| **Mongo Express** | http://localhost:8081 | Database admin UI |

## Testing Your Setup

1. **Verify backend services:**
   ```bash
   curl http://localhost:5000/health  # Auth service
   curl http://localhost:3001/health  # LEGO Projects API
   ```

2. **Test frontend:**
   - Visit http://localhost:5173
   - Try logging in/signing up
   - Create a test instruction

3. **Run tests:**
   ```bash
   pnpm test:run        # All unit tests
   pnpm test:e2e        # End-to-end tests
   ```

## Development Workflow

### Working on Frontend
- Main app auto-reloads on changes
- Shared packages rebuild automatically
- Use browser dev tools for debugging

### Working on Backend
- APIs restart automatically on changes
- Check logs in terminal for errors
- Use HTTP client files in `__http__/` for testing

### Working on Shared Packages
- Changes propagate to consuming apps
- TypeScript provides immediate feedback
- Tests run in watch mode during development

## Essential Documentation

📖 **Setup Guides:**
- [Frontend Native Setup](FRONTEND_NATIVE_SETUP.md) - Detailed frontend development guide
- [Auth Development Setup](AUTH-DEV-SETUP.md) - Authentication service setup
- [Docker Setup](DOCKER_SETUP.md) - Container-based development

🏗️ **Architecture:**
- [Architecture Overview](ARCHITECTURE_README.md) - System design and patterns
- [Package Structure](PACKAGE-STRUCTURE.md) - Monorepo organization
- [API Documentation](API_DOCUMENTATION.md) - Backend API reference

🧪 **Testing:**
- [Testing Guide](TESTING_GUIDE.md) - Testing strategies and best practices
- [Playwright Testing](PLAYWRIGHT_TESTING.md) - E2E testing setup

## Troubleshooting

### Common Issues

**Port conflicts:**
- Check if services are running on required ports (3000, 3001, 5000, 5173)
- Kill conflicting processes: `lsof -ti:PORT | xargs kill -9`

**Database connection:**
- Ensure MongoDB is running
- Check connection string in `.env` files
- Verify database is accessible: `mongo mongodb://localhost:27017`

**Frontend not loading:**
- Verify backend APIs are running and healthy
- Check browser console for errors
- Confirm environment variables are set correctly

**Package issues:**
- Clear node_modules and reinstall: `rm -rf node_modules && pnpm install`
- Clear pnpm cache: `pnpm store prune`

### Getting Help

- **Documentation**: Check the docs in `__docs__/` directory
- **Issues**: Search existing issues or create a new one
- **API Testing**: Use the HTTP files in `__http__/` directory
- **Logs**: Check terminal outputs for detailed error messages

## Next Steps

1. **Explore the codebase**: Start with `apps/web/lego-moc-instructions-app/src`
2. **Read the architecture docs**: Understand the system design
3. **Try making changes**: Start with small UI tweaks
4. **Run the tests**: Familiarize yourself with the test suites
5. **Review shared packages**: See what's available for reuse

Happy coding! 🚀
