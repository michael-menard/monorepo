# Docker Infrastructure Setup

This Docker setup provides **infrastructure-only services** needed to support local development of the Lego MOC Instructions application. The applications themselves run natively on your machine for better development experience and hot-reloading.

## Infrastructure Services

### Databases
- **MongoDB** (Port 27017) - Database for auth service
- **PostgreSQL** (Port 5432) - Database for lego projects API  
- **Redis** (Port 6379) - Caching layer for improved performance

### Search & Analytics  
- **Elasticsearch** (Port 9200) - Full-text search functionality

### Administration Tools
- **Mongo Express** (Port 8081) - Web-based MongoDB admin interface
- **pgAdmin** (Port 8082) - Web-based PostgreSQL admin interface

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js and pnpm installed for running applications locally
- At least 2GB of available RAM (Elasticsearch requires memory)

### Start Infrastructure

```bash
# Start all infrastructure services
docker-compose -f docker-compose-dev.yml up -d

# Or use the convenient script
./dev.sh
```

### Access Infrastructure Services

- **MongoDB**: `mongodb://admin:password123@localhost:27017/myapp`
- **PostgreSQL**: `postgresql://postgres:password@localhost:5432/lego_projects`
- **Redis**: `redis://localhost:6379`
- **Elasticsearch**: http://localhost:9200
- **MongoDB Admin**: http://localhost:8081
- **pgAdmin**: http://localhost:8082 (admin@admin.com / admin)

### Stop Infrastructure

```bash
# Stop all services
docker-compose -f docker-compose-dev.yml down

# Keep data volumes (recommended)
docker-compose -f docker-compose-dev.yml down --volumes
```

## Development Workflow

### 1. Start Infrastructure
```bash
./dev.sh
```

### 2. Run Applications Locally
```bash
# Terminal 1: Start auth service
cd apps/api/auth-service
pnpm dev

# Terminal 2: Start lego projects API  
cd apps/api/lego-projects-api
pnpm dev

# Terminal 3: Start frontend
cd apps/web/lego-moc-instructions-app
pnpm dev

# Or run all at once from root
pnpm dev
```

### 3. Access Your Applications
- **Frontend**: http://localhost:3000
- **Auth API**: http://localhost:5000/api/auth
- **Lego Projects API**: http://localhost:5001

## Infrastructure Management

### Individual Service Control

```bash
# Start only databases
docker-compose -f docker-compose-dev.yml up -d mongodb postgres redis

# Start only search services  
docker-compose -f docker-compose-dev.yml up -d elasticsearch

# Start only admin tools
docker-compose -f docker-compose-dev.yml up -d mongo-express pgadmin
```

### View Logs

```bash
# View all infrastructure logs
docker-compose -f docker-compose-dev.yml logs

# View specific service logs
docker-compose -f docker-compose-dev.yml logs mongodb
docker-compose -f docker-compose-dev.yml logs postgres
docker-compose -f docker-compose-dev.yml logs elasticsearch

# Follow logs in real-time
docker-compose -f docker-compose-dev.yml logs -f redis
```

### Health Checks

```bash
# Check service status
docker-compose -f docker-compose-dev.yml ps

# Test infrastructure connectivity (see __http__ test files)
```

## Environment Configuration

### Required Environment Variables

Your applications need these environment variables to connect to the infrastructure:

#### Auth Service (.env)
```env
MONGODB_URI=mongodb://admin:password123@localhost:27017/myapp?authSource=admin
JWT_SECRET=your_jwt_secret_here
FRONTEND_URL=http://localhost:3000
```

#### Lego Projects API (.env)
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/lego_projects
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200
JWT_SECRET=your_jwt_secret_here
AUTH_API=http://localhost:5000
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5001
VITE_AUTH_API_URL=http://localhost:5000
```

## Data Persistence

All services use Docker volumes for data persistence:

- `mongodb_data` - MongoDB database files
- `mongodb_config` - MongoDB configuration files  
- `postgres_data` - PostgreSQL database files
- `redis_data` - Redis persistence files
- `esdata` - Elasticsearch indices and data
- `pgadmin_data` - pgAdmin configuration and connections

Data persists between container restarts unless explicitly removed with `--volumes` flag.

## Testing Infrastructure Connectivity

Use the provided HTTP test files to verify infrastructure services are working:

```bash
# Test all services (requires REST client like curl or HTTPie)
# See __http__/ directory for test files
```

## Troubleshooting

### Memory Issues (Elasticsearch)

If Elasticsearch fails to start due to memory issues:

```bash
# Linux: Increase virtual memory map count
sudo sysctl -w vm.max_map_count=262144

# Or reduce Elasticsearch memory in docker-compose-dev.yml:
environment:
  - ES_JAVA_OPTS=-Xms256m -Xmx256m
```

### Port Conflicts

```bash
# Check what's using the ports
lsof -i :27017  # MongoDB
lsof -i :5432   # PostgreSQL  
lsof -i :6379   # Redis
lsof -i :9200   # Elasticsearch
lsof -i :8081   # Mongo Express
lsof -i :8082   # pgAdmin

# Stop conflicting services
docker-compose -f docker-compose-dev.yml down
```

### Database Connection Issues

```bash
# Check if services are running and healthy
docker-compose -f docker-compose-dev.yml ps

# Restart specific service
docker-compose -f docker-compose-dev.yml restart mongodb
docker-compose -f docker-compose-dev.yml restart postgres

# Check logs for errors
docker-compose -f docker-compose-dev.yml logs mongodb
docker-compose -f docker-compose-dev.yml logs postgres
```

### Clean Slate

```bash
# Stop and remove all infrastructure
docker-compose -f docker-compose-dev.yml down -v

# Remove all images (will need to re-download)
docker-compose -f docker-compose-dev.yml down -v --rmi all

# Start fresh
docker-compose -f docker-compose-dev.yml up -d
```

## Monitoring

### Resource Usage

```bash
# Monitor Docker resource usage
docker stats

# Check disk usage
docker system df

# View network information
docker network ls
```

### Health Status

All infrastructure services include health checks that verify:

- **MongoDB**: Database connectivity and admin commands
- **PostgreSQL**: Database readiness and connection acceptance  
- **Redis**: Service ping response
- **Elasticsearch**: Cluster health status

View health status:
```bash
docker-compose -f docker-compose-dev.yml ps
```

## Production Considerations

This infrastructure setup is optimized for **development only**. For production:

1. **Security**: Change all default passwords and use secrets management
2. **Networking**: Use proper network isolation and firewall rules  
3. **SSL/TLS**: Enable encryption for all database connections
4. **Backup**: Implement regular database backups
5. **Monitoring**: Add proper logging, metrics, and alerting
6. **Scaling**: Consider clustered configurations for high availability
7. **Updates**: Regularly update container images for security patches

## Network Architecture

All infrastructure services run on the `dev-infrastructure` Docker network, allowing:

- Service-to-service communication by container name
- Isolation from other Docker networks
- Consistent networking for development

Applications running locally connect to infrastructure via `localhost` ports.
