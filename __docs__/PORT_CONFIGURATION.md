# Port Configuration Guide

This document explains how port configuration works in the monorepo and how to customize it for your development environment.

## Overview

The monorepo uses a centralized port configuration system that allows you to:
- Define all service ports in one place
- Override ports locally without affecting the team
- Automatically configure all services and scripts
- Avoid port conflicts during development

## Configuration Files

### `.env.ports` (Main Configuration)
Contains the default port assignments for all services:

```bash
# Application Service Ports
WEB_APP_PORT=3002
AUTH_API_PORT=9300
LEGO_API_PORT=9000
DOCS_PORT=3000

# Infrastructure Service Ports
MONGODB_PORT=27017
POSTGRESQL_PORT=5432
REDIS_PORT=6379
ELASTICSEARCH_PORT=9200
MONGO_EXPRESS_PORT=8081
PGADMIN_PORT=8082
```

### `.env.ports.local` (Local Overrides)
Create this file to override ports for your local development:

```bash
# Copy the template
cp .env.ports .env.ports.local

# Edit to customize your ports
WEB_APP_PORT=4000
AUTH_API_PORT=9400
LEGO_API_PORT=9100
```

**Note**: `.env.ports.local` is gitignored, so your local changes won't affect other developers.

### `.env` (Main Environment File)
The main `.env` file includes port variables and uses them to construct URLs:

```bash
# Port Configuration
WEB_APP_PORT=3002
AUTH_API_PORT=9300
LEGO_API_PORT=9000

# API Configuration (uses port variables)
VITE_API_BASE_URL=http://localhost:${LEGO_API_PORT}
VITE_AUTH_API_URL=http://localhost:${AUTH_API_PORT}
```

## How It Works

### 1. Port Loading
The `scripts/load-ports.sh` script loads port configuration in this order:
1. `.env.ports.local` (if exists) - highest priority
2. `.env.ports` (fallback)
3. `.env` (fallback)
4. Hardcoded defaults (last resort)

### 2. Script Integration
All development scripts automatically load port configuration:

```bash
# scripts/start-full-dev.sh
source scripts/load-ports.sh
kill_port $WEB_APP_PORT "Web App"
kill_port $AUTH_API_PORT "Auth API"
```

### 3. Application Configuration
Applications use environment variables with fallbacks:

```typescript
// vite.config.ts
server: {
  port: parseInt(process.env.WEB_APP_PORT || '3002')
}
```

```bash
# .env.example
PORT=${AUTH_API_PORT:-9300}
FRONTEND_URL=http://localhost:${WEB_APP_PORT:-3002}
```

## Customizing Ports

### For Individual Development
1. Create local port configuration:
   ```bash
   cp .env.ports .env.ports.local
   ```

2. Edit `.env.ports.local` with your preferred ports:
   ```bash
   WEB_APP_PORT=4000
   AUTH_API_PORT=9400
   LEGO_API_PORT=9100
   ```

3. Restart development services:
   ```bash
   pnpm kill-ports
   pnpm dev
   ```

### For Team Changes
1. Edit `.env.ports` with new default ports
2. Update this documentation
3. Commit the changes
4. Notify the team to restart their development environment

## Port Ranges

### Recommended Port Ranges
- **Web Applications**: 3000-3999
- **API Services**: 9000-9999
- **Infrastructure**: Standard ports (27017, 5432, etc.)

### Current Assignments
| Service | Port | Type | Configurable |
|---------|------|------|--------------|
| Web App | 3002 | Application | ✅ |
| Documentation | 3000 | Application | ✅ |
| Auth API | 9300 | Application | ✅ |
| LEGO Projects API | 9000 | Application | ✅ |
| MongoDB | 27017 | Infrastructure | ❌ |
| PostgreSQL | 5432 | Infrastructure | ❌ |
| Redis | 6379 | Infrastructure | ❌ |
| Elasticsearch | 9200 | Infrastructure | ❌ |
| Mongo Express | 8081 | Infrastructure | ❌ |
| pgAdmin | 8082 | Infrastructure | ❌ |

## Troubleshooting

### Port Conflicts
```bash
# Check what's using a port
lsof -ti:3002

# Kill processes on application ports
pnpm kill-ports

# Kill specific port
pnpm kill-port 3002
```

### Configuration Not Loading
```bash
# Verify port configuration
source scripts/load-ports.sh
echo "Web App Port: $WEB_APP_PORT"

# Check file exists
ls -la .env.ports*
```

### Services Starting on Wrong Ports
1. Ensure `.env` files are updated with new port variables
2. Restart all services: `pnpm kill-ports && pnpm dev`
3. Check for hardcoded ports in configuration files

## Advanced Usage

### Environment Variable Precedence
1. `.env.ports.local` (highest)
2. `.env.ports`
3. `.env`
4. Process environment variables
5. Hardcoded defaults (lowest)

### Adding New Services
1. Add port variable to `.env.ports`:
   ```bash
   NEW_SERVICE_PORT=9500
   ```

2. Update `scripts/load-ports.sh` if needed
3. Use the variable in service configuration:
   ```bash
   PORT=${NEW_SERVICE_PORT:-9500}
   ```

4. Add to port cleanup scripts:
   ```bash
   kill_port $NEW_SERVICE_PORT "New Service"
   ```

## Best Practices

1. **Use environment variables** instead of hardcoded ports
2. **Provide fallbacks** for all port variables
3. **Document port changes** in this file
4. **Test locally** before committing port changes
5. **Use standard ports** for infrastructure services
6. **Avoid conflicts** with common development ports (3000, 8000, etc.)
