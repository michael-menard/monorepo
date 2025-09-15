# Development Commands

This document describes the **single, unified way** to start the development environment.

## 🚀 Quick Start

### Start Everything (Single Command)
```bash
# Start all services (Docker + APIs + Web App)
pnpm dev
# or
pnpm start

# Seed test users (South Park characters + test users)
pnpm seed:users
```

**That's it!** There is only one way to start the development environment to keep things simple.

This single command will start:
- 🐳 Docker infrastructure services (MongoDB, PostgreSQL, Redis, Elasticsearch)
- 🔐 Auth API service (port 9000)
- 🧱 LEGO Projects API service (port 5000) 
- 🌐 Web application (port 3002)

## 📋 Service URLs

After running `pnpm dev`, you'll have access to:

### Application Services
- **Web App**: http://localhost:3002
- **Auth API**: http://localhost:9000/api
- **LEGO Projects API**: http://localhost:5000/api

### Infrastructure Services
- **MongoDB**: mongodb://localhost:27017
- **PostgreSQL**: postgresql://localhost:5432
- **Redis**: redis://localhost:6379
- **Elasticsearch**: http://localhost:9200

### Admin Interfaces
- **Mongo Express**: http://localhost:8081 (MongoDB admin)
- **pgAdmin**: http://localhost:8082 (PostgreSQL admin)

## 🔧 Infrastructure Management

If you need to manage Docker services separately:

```bash
# Stop Docker services (if needed)
docker-compose -f docker-compose.dev.yml down

# View Docker service logs
docker-compose -f docker-compose.dev.yml logs -f

# Check Docker service status
docker-compose -f docker-compose.dev.yml ps
```

**Note**: The main `pnpm dev` command handles all infrastructure automatically.

## 👥 User Management

### Seed Test Users
```bash
# Seed South Park characters + test users
pnpm seed:users

# Clear existing users and reseed
pnpm seed:users:clear

# View available users
cat apps/api/auth-service/SEED_USERS.md
```

### Sample Login Credentials
```bash
# Standard test user
Email: test@example.com
Password: TestPassword123!

# Fun South Park character
Email: stan.marsh@southpark.co
Password: SouthPark123!

# Admin user
Email: admin@example.com
Password: AdminPassword123!
```

## 📝 Logs and Monitoring

### View Service Logs
```bash
# Auth service logs
pnpm logs:auth
# or
tail -f logs/auth-service.log

# LEGO Projects API logs
pnpm logs:lego
# or
tail -f logs/lego-projects-api.log

# Docker service logs
docker-compose -f docker-compose.dev.yml logs -f
```

### Check Service Health
```bash
# Check Docker services
docker-compose -f docker-compose.dev.yml ps

# Test auth service
curl http://localhost:9000/api/auth/csrf
```

## 🧪 Testing Commands

### Run Tests
```bash
# All E2E tests
pnpm test:e2e

# Auth-specific E2E tests
pnpm test:e2e:auth

# Run tests with browser UI
pnpm test:e2e:headed

# Auth package unit tests
cd packages/auth && pnpm test:all
```

### Test-Specific Commands
```bash
# Login tests only
pnpm test:e2e:login

# Signup tests only
pnpm test:e2e:signup

# Debug mode
pnpm test:e2e:debug

# Test UI
pnpm test:e2e:ui
```

## 🛠️ Development Workflow

### Typical Development Session
1. **Start all services**:
   ```bash
   pnpm dev
   ```

2. **Open your browser**:
   - Main app: http://localhost:3002
   - Check logs if needed: `pnpm logs:auth`

3. **Run tests** (in another terminal):
   ```bash
   pnpm test:e2e:auth
   ```

4. **Stop everything**:
   - Press `Ctrl+C` in the terminal running `pnpm dev`

## 🔍 Troubleshooting

### Common Issues

#### Port Conflicts
If you get "port already in use" errors:
```bash
# Check what's using the port
lsof -ti:9000  # Replace 9000 with the conflicting port
kill -9 <PID>  # Kill the process

# Or restart Docker
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
```

#### Services Not Starting
```bash
# Check Docker is running
docker info

# Check service logs
pnpm logs:auth
pnpm dev:infra:logs

# Restart everything
docker-compose -f docker-compose.dev.yml down
pnpm dev
```

#### Missing Dependencies
```bash
# Install dependencies
pnpm install

# Build packages
pnpm build

# Try starting again
pnpm dev
```

### Service Dependencies

The services have the following dependencies:
- **Web App** → Auth API (for authentication)
- **Auth API** → MongoDB (for user data)
- **LEGO Projects API** → PostgreSQL (for project data)
- **All APIs** → Redis (for caching)

Make sure infrastructure services are healthy before starting API services.

## 📚 Additional Resources

- **Testing Guide**: `packages/auth/TESTING.md`
- **Timeout Configuration**: `apps/web/lego-moc-instructions-app/tests/TIMEOUT_CONFIGURATION.md`
- **Architecture Docs**: `__docs__/ARCHITECTURE.md`
- **Docker Setup**: `__docs__/DOCKER_SETUP.md`

## 🎯 Quick Reference

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start everything (only way) |
| `pnpm start` | Same as `pnpm dev` |
| `pnpm test:e2e:auth` | Run auth tests |
| `pnpm logs:auth` | View auth service logs |
| `Ctrl+C` | Stop all services |
