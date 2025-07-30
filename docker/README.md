# Docker Configuration Directory

This directory contains all Docker-related configurations for the LEGO MOC Instructions App, organized in a monorepo-friendly structure.

## 📁 Structure

```
docker/
├── docker-compose.yml           # Production full stack
├── docker-compose.dev.yml       # Development infrastructure only
├── docker-stack.yml            # Docker Swarm configuration
├── auth-service.yml            # Auth service standalone
├── backend-api.yml             # Backend API standalone
├── lego-app.yml               # LEGO App (frontend) standalone
├── env.docker.example          # Environment variables template
└── README.md                   # This file
```

## 🚀 Quick Commands

### Development (Infrastructure Only)
```bash
# Start databases, search, and cache services
docker-compose -f docker/docker-compose.dev.yml up -d

# Or use the deployment script
./scripts/docker-deploy.sh dev
```

### Production (Full Stack)
```bash
# Start complete production stack
docker-compose -f docker/docker-compose.yml up -d

# Or use the deployment script
./scripts/docker-deploy.sh prod
```

### Individual Services
```bash
# Run only auth service
docker-compose -f docker/auth-service.yml up -d

# Run only backend API
docker-compose -f docker/backend-api.yml up -d

# Run only LEGO app (frontend)
docker-compose -f docker/lego-app.yml up -d
```

## 🏗️ Monorepo Benefits

### Modular Design
- **Individual Service Files**: Each service has its own compose file
- **Shared Infrastructure**: Common databases and search services
- **Isolated Networks**: Each service has its own network
- **Flexible Deployment**: Deploy services independently or together

### Development Workflow
```bash
# Start only what you need for development
docker-compose -f docker/docker-compose.dev.yml up -d

# Run your apps locally with containerized infrastructure
pnpm dev  # Your apps connect to containerized databases
```

### Adding New Services
1. Create a new service directory in `apps/`
2. Add a `Dockerfile` to the service
3. Create a service-specific compose file in `docker/`
4. Update the main compose files if needed
5. Update the deployment script

## 🔧 Configuration

### Environment Variables
```bash
# Copy and configure environment
cp docker/env.docker.example docker/.env
# Edit docker/.env with your settings
```

### Service Ports
- **LEGO App (Frontend)**: 5173
- **Auth Service**: 5000
- **Backend API**: 3000
- **MongoDB**: 27017
- **PostgreSQL**: 5432
- **Elasticsearch**: 9200
- **Kibana**: 5601
- **MongoDB Express**: 8081
- **Redis**: 6379

## 📚 Documentation

For complete documentation, see [DOCKER_DEPLOYMENT.md](../DOCKER_DEPLOYMENT.md) in the project root. 