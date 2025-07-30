# LEGO App Docker Deployment Guide

This guide covers the complete Docker deployment setup for the LEGO MOC Instructions App, organized in a monorepo-friendly structure.

## 🏗️ Architecture Overview

The LEGO app consists of multiple services:

- **LEGO MOC Instructions App** (React + Vite) - Frontend application
- **Auth Service** (Node.js + MongoDB) - Authentication and user management
- **Backend API** (Node.js + PostgreSQL + Elasticsearch) - Main application API
- **Databases** (MongoDB, PostgreSQL, Redis)
- **Search Engine** (Elasticsearch + Kibana)
- **Reverse Proxy** (Nginx) - Production load balancing

## 📁 File Structure

```
├── docker/                          # Docker configuration directory
│   ├── docker-compose.yml           # Production full stack
│   ├── docker-compose.dev.yml       # Development infrastructure only
│   ├── docker-stack.yml            # Docker Swarm configuration
│   ├── auth-service.yml            # Auth service standalone
│   ├── backend-api.yml             # Backend API standalone
│   ├── lego-app.yml               # LEGO App (frontend) standalone
│   ├── env.docker.example          # Environment variables template
│   └── nginx.conf                  # Nginx configuration (optional)
├── scripts/
│   └── docker-deploy.sh            # Deployment automation script
├── apps/api/auth-service/
│   └── Dockerfile                  # Auth service container
├── apps/api/lego-projects-api/
│   └── Dockerfile                  # Backend API container
└── apps/web/lego-moc-instructions-app/
    ├── Dockerfile                  # LEGO App (frontend) container
    └── nginx.conf                  # Frontend nginx configuration
```

## 🚀 Quick Start

### Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- At least 4GB RAM available for Docker
- Ports 3000, 5000, 5173, 5432, 27017, 9200, 5601, 8081, 6379 available

### 1. Development Environment

Start only the infrastructure services (databases, search, cache):

```bash
# Make the deployment script executable
chmod +x scripts/docker-deploy.sh

# Start development infrastructure
./scripts/docker-deploy.sh dev
```

This starts:
- MongoDB (Auth Service database)
- PostgreSQL (Backend API database)
- Elasticsearch (Search functionality)
- Kibana (Elasticsearch management)
- Redis (Caching)
- MongoDB Express (Database admin)

### 2. Production Environment

Start the complete stack with all services:

```bash
# Build images and start production environment
./scripts/docker-deploy.sh prod
```

### 3. Individual Services

Run services independently:

```bash
# Run only auth service
docker-compose -f docker/auth-service.yml up -d

# Run only backend API
docker-compose -f docker/backend-api.yml up -d

# Run only LEGO app (frontend)
docker-compose -f docker/lego-app.yml up -d
```

### 4. Docker Swarm Deployment

Deploy to Docker Swarm for production scaling:

```bash
# Deploy to Docker Swarm
./scripts/docker-deploy.sh swarm
```

## 🔧 Configuration

### Environment Variables

1. Copy the environment template:
   ```bash
   cp docker/env.docker.example docker/.env
   ```

2. Update the `docker/.env` file with your configuration:
   ```bash
   # Required for production
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_S3_BUCKET=your-s3-bucket-name
   ```

### Service Ports

| Service | Port | Description |
|---------|------|-------------|
| LEGO App (Frontend) | 5173 | Main React application |
| Auth Service | 5000 | Authentication API |
| Backend API | 3000 | Main application API |
| MongoDB | 27017 | Auth database |
| PostgreSQL | 5432 | Backend database |
| Elasticsearch | 9200 | Search engine |
| Kibana | 5601 | Elasticsearch management |
| MongoDB Express | 8081 | MongoDB admin interface |
| Redis | 6379 | Caching |
| Nginx | 80/443 | Reverse proxy (production) |

## 🛠️ Deployment Scripts

The `scripts/docker-deploy.sh` script provides comprehensive deployment management:

### Available Commands

```bash
# Build Docker images
./scripts/docker-deploy.sh build

# Start development environment (infrastructure only)
./scripts/docker-deploy.sh dev

# Start production environment
./scripts/docker-deploy.sh prod

# Deploy to Docker Swarm
./scripts/docker-deploy.sh swarm

# Stop services
./scripts/docker-deploy.sh stop

# Remove swarm stack
./scripts/docker-deploy.sh stop-swarm

# Show logs
./scripts/docker-deploy.sh logs [service-name]

# Show service status
./scripts/docker-deploy.sh status

# Clean up Docker resources
./scripts/docker-deploy.sh cleanup

# Show help
./scripts/docker-deploy.sh help
```

### Examples

```bash
# Start development and run your apps locally
./scripts/docker-deploy.sh dev
pnpm dev  # Run your frontend and backend apps locally

# Deploy full production stack
./scripts/docker-deploy.sh prod

# Check logs for LEGO app
./scripts/docker-deploy.sh logs lego-app

# Monitor all services
./scripts/docker-deploy.sh logs
```

## 🐳 Docker Compose Configurations

### Development (`docker/docker-compose.dev.yml`)

- **Purpose**: Infrastructure services only
- **Use Case**: Local development with hot reloading
- **Services**: Databases, search, cache
- **Networking**: Isolated development network

### Production (`docker/docker-compose.yml`)

- **Purpose**: Complete production stack
- **Use Case**: Full application deployment
- **Services**: All services including frontend and APIs
- **Features**: Health checks, resource limits, security

### Individual Services

#### Auth Service (`docker/auth-service.yml`)
- **Purpose**: Standalone auth service deployment
- **Services**: Auth API + MongoDB + MongoDB Express
- **Use Case**: Independent auth service deployment

#### Backend API (`docker/backend-api.yml`)
- **Purpose**: Standalone backend API deployment
- **Services**: Backend API + PostgreSQL + Elasticsearch + Kibana
- **Use Case**: Independent backend API deployment

#### LEGO App (`docker/lego-app.yml`)
- **Purpose**: Standalone frontend deployment
- **Services**: LEGO MOC Instructions App (React)
- **Use Case**: Independent frontend deployment

### Docker Swarm (`docker/docker-stack.yml`)

- **Purpose**: Scalable production deployment
- **Use Case**: High availability, load balancing
- **Features**: Service replication, rolling updates, resource management

## 🔍 Monitoring and Management

### Health Checks

All services include health checks:

```bash
# Check service health
docker-compose -f docker/docker-compose.yml ps

# View health check logs
docker-compose -f docker/docker-compose.yml logs [service-name]
```

### Logs

```bash
# View all logs
./scripts/docker-deploy.sh logs

# View specific service logs
./scripts/docker-deploy.sh logs lego-app
./scripts/docker-deploy.sh logs auth-service
./scripts/docker-deploy.sh logs backend-api
```

### Database Management

- **MongoDB**: http://localhost:8081 (MongoDB Express)
- **PostgreSQL**: Use any PostgreSQL client
- **Elasticsearch**: http://localhost:5601 (Kibana)

## 🔒 Security Considerations

### Production Security

1. **Environment Variables**: Never commit `.env` files
2. **JWT Secrets**: Use strong, unique secrets
3. **Database Passwords**: Use strong passwords
4. **Network Security**: Use Docker networks for service isolation
5. **SSL/TLS**: Configure Nginx with SSL certificates

### Security Checklist

- [ ] Update JWT_SECRET in production
- [ ] Configure AWS credentials securely
- [ ] Set up SSL certificates for Nginx
- [ ] Configure firewall rules
- [ ] Enable database authentication
- [ ] Set up monitoring and alerting

## 📊 Resource Requirements

### Minimum Requirements

- **RAM**: 4GB (2GB for Docker + 2GB for services)
- **CPU**: 2 cores
- **Storage**: 10GB available space

### Recommended Requirements

- **RAM**: 8GB
- **CPU**: 4 cores
- **Storage**: 20GB available space

### Service Resource Limits

| Service | CPU | Memory |
|---------|-----|--------|
| LEGO App (Frontend) | 0.5 | 512MB |
| Auth Service | 0.5 | 512MB |
| Backend API | 1.0 | 1GB |
| MongoDB | 1.0 | 1GB |
| PostgreSQL | 1.0 | 1GB |
| Elasticsearch | 2.0 | 2GB |
| Redis | 0.25 | 256MB |
| Nginx | 0.25 | 128MB |

## 🚨 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check what's using a port
   lsof -i :5173
   
   # Stop conflicting services
   sudo systemctl stop [service-name]
   ```

2. **Memory Issues**
   ```bash
   # Check Docker resource usage
   docker stats
   
   # Increase Docker memory limit in Docker Desktop
   ```

3. **Database Connection Issues**
   ```bash
   # Check database health
   docker-compose -f docker/docker-compose.yml logs mongodb
   docker-compose -f docker/docker-compose.yml logs postgres
   
   # Restart database services
   docker-compose -f docker/docker-compose.yml restart mongodb postgres
   ```

4. **Build Failures**
   ```bash
   # Clean and rebuild
   ./scripts/docker-deploy.sh cleanup
   ./scripts/docker-deploy.sh build
   ```

### Debug Commands

```bash
# Check Docker status
docker info

# Check service status
./scripts/docker-deploy.sh status

# View detailed logs
docker-compose -f docker/docker-compose.yml logs --tail=100 [service-name]

# Access service shell
docker-compose -f docker/docker-compose.yml exec [service-name] sh

# Check network connectivity
docker-compose -f docker/docker-compose.yml exec auth-service ping mongodb
```

## 🔄 Updates and Maintenance

### Updating Services

```bash
# Pull latest images and restart
docker-compose -f docker/docker-compose.yml pull
docker-compose -f docker/docker-compose.yml up -d

# Or use the deployment script
./scripts/docker-deploy.sh build
./scripts/docker-deploy.sh prod
```

### Backup and Restore

```bash
# Backup databases
docker-compose -f docker/docker-compose.yml exec mongodb mongodump --out /backup
docker-compose -f docker/docker-compose.yml exec postgres pg_dump -U lego_user lego_projects > backup.sql

# Restore databases
docker-compose -f docker/docker-compose.yml exec mongodb mongorestore /backup
docker-compose -f docker/docker-compose.yml exec postgres psql -U lego_user lego_projects < backup.sql
```

### Scaling Services

```bash
# Scale services (Docker Swarm)
docker service scale lego-app_lego-app=3
docker service scale lego-app_auth-service=2
docker service scale lego-app_backend-api=5

# Check scaling status
docker service ls
```

## 🏗️ Monorepo Benefits

### Modular Deployment

- **Individual Services**: Deploy services independently
- **Shared Infrastructure**: Common databases and search services
- **Isolated Networks**: Each service has its own network
- **Flexible Scaling**: Scale services based on demand

### Development Workflow

```bash
# Start only what you need
docker-compose -f docker/auth-service.yml up -d  # Auth service only
docker-compose -f docker/backend-api.yml up -d  # Backend API only
docker-compose -f docker/lego-app.yml up -d     # Frontend only

# Run your apps locally with containerized infrastructure
pnpm dev  # Your apps connect to containerized databases
```

### Adding New Services

1. Create a new service directory in `apps/`
2. Add a `Dockerfile` to the service
3. Create a service-specific compose file in `docker/`
4. Update the main compose files if needed
5. Update the deployment script

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Swarm Documentation](https://docs.docker.com/engine/swarm/)
- [MongoDB Docker Guide](https://hub.docker.com/_/mongo)
- [PostgreSQL Docker Guide](https://hub.docker.com/_/postgres)
- [Elasticsearch Docker Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html)

## 🤝 Contributing

When adding new services or modifying the Docker configuration:

1. Update the appropriate docker-compose file
2. Add health checks for new services
3. Update the deployment script if needed
4. Update this documentation
5. Test in both development and production environments 