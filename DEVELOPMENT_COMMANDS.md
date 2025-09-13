# Development Commands

This document lists all available commands for starting and managing the development environment.

## 🚀 Quick Start

### Start Everything
```bash
# Start all services (Docker + APIs + Web App)
pnpm dev:full
# or
pnpm start:full
```

This single command will start:
- 🐳 Docker infrastructure services (MongoDB, PostgreSQL, Redis, Elasticsearch)
- 🔐 Auth API service (port 9000)
- 🧱 LEGO Projects API service (port 5000) 
- 🌐 Web application (port 3002)

## 📋 Service URLs

After running `pnpm dev:full`, you'll have access to:

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

## 🔧 Individual Service Commands

### Infrastructure Only
```bash
# Start Docker services only
pnpm dev:infra

# Stop Docker services
pnpm dev:infra:stop

# View Docker service logs
pnpm dev:infra:logs

# Check Docker service status
pnpm dev:infra:status
```

### API Services
```bash
# Auth service only
pnpm dev:auth

# LEGO Projects API only  
pnpm dev:lego

# Frontend only
pnpm dev:frontend
```

### Combined Services
```bash
# Infrastructure + Auth + Frontend (no LEGO API)
pnpm auth:dev

# All services via Turbo (may start extra services)
pnpm dev:all
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
pnpm dev:infra:logs
```

### Check Service Health
```bash
# Check Docker services
docker-compose -f docker-compose.dev.yml ps

# Test auth service
curl http://localhost:9000/api/auth/csrf

# Check infrastructure status
pnpm dev:infra:status
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
   pnpm dev:full
   ```

2. **Open your browser**:
   - Main app: http://localhost:3002
   - Check logs if needed: `pnpm logs:auth`

3. **Run tests** (in another terminal):
   ```bash
   pnpm test:e2e:auth
   ```

4. **Stop everything**:
   - Press `Ctrl+C` in the terminal running `pnpm dev:full`

### Working on Specific Components
```bash
# Just auth development
pnpm auth:dev

# Just frontend development (with mocked APIs)
pnpm dev:frontend

# Just infrastructure for external API testing
pnpm dev:infra
```

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
pnpm dev:infra:stop
pnpm dev:full
```

#### Missing Dependencies
```bash
# Install dependencies
pnpm install

# Build packages
pnpm build

# Try starting again
pnpm dev:full
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
| `pnpm dev:full` | Start everything (recommended) |
| `pnpm dev:infra` | Docker services only |
| `pnpm auth:dev` | Auth development setup |
| `pnpm test:e2e:auth` | Run auth tests |
| `pnpm logs:auth` | View auth service logs |
| `Ctrl+C` | Stop all services |
