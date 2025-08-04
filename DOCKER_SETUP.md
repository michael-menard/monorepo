# Docker Compose Setup Guide

This guide explains how to run your LEGO MOC Instructions application using Docker Compose.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose installed
- At least 4GB of available RAM (for all services)

## Quick Start

1. **Clone and navigate to the project:**
   ```bash
   cd /path/to/your/monorepo
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Stop all services:**
   ```bash
   docker-compose down
   ```

## Services Overview

### Frontend Application
- **URL:** http://localhost:3000
- **Service:** React app with Vite
- **Container:** lego-moc-frontend

### Auth Service
- **URL:** http://localhost:9000
- **Service:** Authentication API
- **Container:** auth-service
- **Database:** MongoDB

### LEGO Projects API
- **URL:** http://localhost:3001
- **Service:** Main API for LEGO projects
- **Container:** lego-projects-api
- **Database:** PostgreSQL

### Databases
- **MongoDB:** localhost:27017 (Auth service)
- **PostgreSQL:** localhost:5432 (LEGO API)
- **Redis:** localhost:6379 (Caching)
- **Elasticsearch:** localhost:9200 (Search)

### Admin Tools
- **Mongo Express:** http://localhost:8081 (MongoDB admin)
- **pgAdmin:** http://localhost:8082 (PostgreSQL admin)
  - Email: admin@admin.com
  - Password: admin

## Development Workflow

### Starting Services for Development
```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d frontend auth-service lego-api

# Start with logs
docker-compose up
```

### Viewing Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f auth-service
docker-compose logs -f lego-api
```

### Accessing Containers
```bash
# Frontend container
docker-compose exec frontend sh

# Auth service container
docker-compose exec auth-service sh

# LEGO API container
docker-compose exec lego-api sh

# Database containers
docker-compose exec mongodb mongosh
docker-compose exec postgres psql -U postgres -d lego_projects
```

### Database Management

#### MongoDB (Auth Service)
- **Connection:** mongodb://admin:password123@localhost:27017/myapp?authSource=admin
- **Admin UI:** http://localhost:8081

#### PostgreSQL (LEGO API)
- **Connection:** postgresql://postgres:password@localhost:5432/lego_projects
- **Admin UI:** http://localhost:8082

## Environment Variables

The setup uses the following default environment variables:

### Frontend
- `VITE_API_URL=http://localhost:9000/api`
- `VITE_LEGO_API_URL=http://localhost:3001/api`

### Auth Service
- `PORT=9000`
- `MONGODB_URI=mongodb://admin:password123@mongodb:27017/myapp?authSource=admin`
- `JWT_SECRET=dev-jwt-secret-key-change-in-production`

### LEGO API
- `PORT=3001`
- `DATABASE_URL=postgresql://postgres:password@postgres:5432/lego_projects`
- `REDIS_URL=redis://redis:6379`

## Troubleshooting

### Port Conflicts
If you get port conflicts, check what's running on the ports:
```bash
# Check ports in use
lsof -i :3000
lsof -i :9000
lsof -i :3001
lsof -i :27017
lsof -i :5432
```

### Container Issues
```bash
# Check container status
docker-compose ps

# Restart specific service
docker-compose restart frontend

# Rebuild and restart
docker-compose up --build -d
```

### Database Issues
```bash
# Reset databases (WARNING: This will delete all data)
docker-compose down -v
docker-compose up -d

# Check database connectivity
docker-compose exec mongodb mongosh --eval "db.runCommand('ping')"
docker-compose exec postgres pg_isready -U postgres
```

### Memory Issues
If you encounter memory issues:
1. Increase Docker Desktop memory limit (8GB+ recommended)
2. Start services individually instead of all at once
3. Use `docker-compose up --scale elasticsearch=0` to disable Elasticsearch temporarily

## Production Considerations

For production deployment:

1. **Change default passwords** in environment variables
2. **Use proper JWT secrets**
3. **Configure proper AWS credentials**
4. **Set up SSL/TLS certificates**
5. **Use production database instances**
6. **Configure proper backup strategies**

## Useful Commands

```bash
# Clean up everything
docker-compose down -v --remove-orphans

# Rebuild all images
docker-compose build --no-cache

# View resource usage
docker stats

# Backup databases
docker-compose exec mongodb mongodump --out /backup
docker-compose exec postgres pg_dump -U postgres lego_projects > backup.sql
```

## Network Access

All services are accessible on the `app-network` Docker network. Services can communicate with each other using their container names:

- Frontend → Auth Service: `http://auth-service:9000`
- Frontend → LEGO API: `http://lego-api:3001`
- Auth Service → MongoDB: `mongodb://mongodb:27017`
- LEGO API → PostgreSQL: `postgresql://postgres:5432`
- LEGO API → Redis: `redis://redis:6379` 