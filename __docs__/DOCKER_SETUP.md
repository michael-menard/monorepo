# Docker Setup for Lego MOC Instructions App

This Docker setup includes all three services needed to run the complete Lego MOC Instructions application:

## Services

1. **Auth Service** (Port 5000) - User authentication and authorization
2. **Lego Projects API** (Port 5001) - Main API for lego projects and instructions
3. **Lego MOC Instructions App** (Port 3000) - Frontend React application

## Dependencies

- **MongoDB** (Port 27017) - Database for auth service
- **PostgreSQL** (Port 5432) - Database for lego projects API
- **Redis** (Port 6379) - Caching for lego projects API
- **Elasticsearch** (Port 9200) - Search functionality for lego projects API
- **Mongo Express** (Port 8081) - Web-based MongoDB admin interface

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- At least 4GB of available RAM (Elasticsearch requires significant memory)

### Start All Services

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Auth API**: http://localhost:5000/api/auth
- **Lego Projects API**: http://localhost:5001
- **MongoDB Admin**: http://localhost:8081

### Stop All Services

```bash
docker-compose down
```

## Individual Service Management

### Start Specific Services

```bash
# Start only the databases
docker-compose up mongodb postgres redis elasticsearch

# Start only the APIs
docker-compose up auth-service lego-projects-api

# Start only the frontend
docker-compose up lego-moc-app
```

### View Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs auth-service
docker-compose logs lego-projects-api
docker-compose logs lego-moc-app

# Follow logs in real-time
docker-compose logs -f lego-moc-app
```

### Rebuild Specific Services

```bash
# Rebuild and restart a specific service
docker-compose up --build auth-service

# Rebuild without cache
docker-compose build --no-cache auth-service
```

## Environment Variables

The services use the following environment variables:

### Auth Service
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `FRONTEND_URL` - Frontend URL for CORS

### Lego Projects API
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `ELASTICSEARCH_URL` - Elasticsearch connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `AUTH_API` - Auth service URL

### Lego MOC App
- `VITE_API_URL` - Lego Projects API URL
- `VITE_AUTH_API_URL` - Auth API URL

## Development Workflow

### Hot Reloading

All services are configured with hot reloading for development:

- **Auth Service**: Uses nodemon for automatic restarts
- **Lego Projects API**: Uses nodemon for automatic restarts
- **Frontend**: Uses Vite dev server with hot module replacement

### File Changes

Changes to source code will automatically trigger rebuilds and restarts in development mode.

### Database Persistence

All databases use Docker volumes for data persistence:

- `mongodb_data` - MongoDB data
- `postgres_data` - PostgreSQL data
- `redis_data` - Redis data
- `esdata` - Elasticsearch data

## Troubleshooting

### Memory Issues

If you encounter memory issues with Elasticsearch:

```bash
# Increase virtual memory map count (Linux)
sudo sysctl -w vm.max_map_count=262144

# Or reduce Elasticsearch memory in docker-compose.yml
environment:
  - ES_JAVA_OPTS=-Xms256m -Xmx256m
```

### Port Conflicts

If ports are already in use:

```bash
# Check what's using the ports
lsof -i :3000
lsof -i :5000
lsof -i :5001

# Stop conflicting services
docker-compose down
```

### Database Connection Issues

```bash
# Check if databases are running
docker-compose ps

# Restart databases
docker-compose restart mongodb postgres redis elasticsearch
```

### Clean Slate

To start completely fresh:

```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Rebuild everything
docker-compose up --build
```

## Production Considerations

For production deployment:

1. Change default passwords in environment variables
2. Use proper SSL certificates
3. Configure proper CORS settings
4. Set up proper logging and monitoring
5. Use production-grade database configurations
6. Consider using Docker Swarm or Kubernetes for orchestration

## Monitoring

### Health Checks

All services include health checks. Check service health:

```bash
docker-compose ps
```

### Resource Usage

Monitor resource usage:

```bash
docker stats
```

### Logs

Access logs for debugging:

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs lego-moc-app
``` 