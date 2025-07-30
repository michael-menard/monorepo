# LEGO App Turbo Commands

This document describes the comprehensive Turbo commands available for standing up the entire LEGO app and all its services.

## 🚀 Quick Start Commands

### **One-Command Full Stack Startup**

```bash
# Development Environment (Infrastructure + Local Dev Servers)
pnpm lego:dev

# Production Environment (Full Docker Stack)
pnpm lego:prod

# Local Development Only (No Docker)
pnpm lego:local
```

## 🌱 Database Seeding

The LEGO app includes automatic database seeding for the auth service:

### **Automatic Seeding**
- **50 users** are automatically created when the database is empty
- **Realistic data** including names, emails, and LEGO-themed bios
- **Role distribution**: ~85% users, ~10% moderators, ~5% admins
- **Email verification**: ~80% verified, ~20% unverified

### **Sample Login Credentials**
For testing, users are created with predictable passwords:

```
Email: james.smith1@gmail.com
Password: Password1!

Email: mary.johnson2@yahoo.com  
Password: Password2!

... and so on up to Password50!
```

### **Seeder Integration**
- Runs automatically when auth service starts
- Only seeds if database is empty
- Integrated into Docker containers
- Can be run manually: `npm run seed` (in auth-service directory)

## 📋 Available Commands

### **Main LEGO Commands**

| Command | Description | Use Case |
|---------|-------------|----------|
| `pnpm lego:dev` | Start development environment | Full development setup with hot reloading |
| `pnpm lego:prod` | Start production environment | Production deployment with Docker |
| `pnpm lego:local` | Start local dev servers only | Development without Docker infrastructure |
| `pnpm lego:build` | Build Docker images | Prepare images for deployment |
| `pnpm lego:status` | Show service status | Check what's running |
| `pnpm lego:logs` | Show service logs | Debug and monitor services |
| `pnpm lego:stop` | Stop all services | Clean shutdown |
| `pnpm lego:cleanup` | Clean up all resources | Remove containers, images, volumes |

### **Individual Docker Commands**

| Command | Description |
|---------|-------------|
| `pnpm docker:build` | Build all Docker images |
| `pnpm docker:dev` | Start development infrastructure |
| `pnpm docker:prod` | Start production stack |
| `pnpm docker:swarm` | Deploy to Docker Swarm |
| `pnpm docker:stop` | Stop Docker services |
| `pnpm docker:logs` | Show Docker logs |
| `pnpm docker:status` | Show Docker service status |
| `pnpm docker:cleanup` | Clean up Docker resources |

### **Individual Service Commands**

| Command | Description |
|---------|-------------|
| `pnpm docker:lego-app` | Start LEGO app (frontend) only |
| `pnpm docker:auth-service` | Start auth service only |
| `pnpm docker:backend-api` | Start backend API only |

## 🏗️ Development Workflows

### **Full Development Setup**

```bash
# 1. Start everything for development
pnpm lego:dev

# 2. Access your application
# Frontend: http://localhost:5173
# Auth API: http://localhost:5000
# Backend API: http://localhost:3000
# MongoDB Express: http://localhost:8081
# Kibana: http://localhost:5601

# 3. Test with seeded users
# Login with: james.smith1@gmail.com / Password1!

# 4. Make changes to your code (hot reloading enabled)

# 5. Check status
pnpm lego:status

# 6. View logs
pnpm lego:logs

# 7. Stop everything
pnpm lego:stop
```

### **Production Deployment**

```bash
# 1. Deploy production stack
pnpm lego:prod

# 2. Access production services
# Frontend: http://localhost:5173
# Auth API: http://localhost:5000
# Backend API: http://localhost:3000

# 3. Monitor services
pnpm lego:status
pnpm lego:logs

# 4. Scale with Docker Swarm
pnpm docker:swarm
```

### **Local Development Only**

```bash
# Start only local development servers (no Docker)
pnpm lego:local

# This starts:
# - LEGO app dev server (Vite)
# - Auth service dev server (Nodemon)
# - Backend API dev server (Nodemon)
```

## 🔧 Service Architecture

### **Development Environment (`pnpm lego:dev`)**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   LEGO App      │    │  Auth Service   │    │  Backend API    │
│   (Local Dev)   │    │   (Local Dev)   │    │   (Local Dev)   │
│   Port: 5173    │    │   Port: 5000    │    │   Port: 3000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                │
                   ┌─────────────────┐
                   │   Infrastructure │
                   │   (Docker)      │
                   │                 │
                   │ • MongoDB       │
                   │   (50 users)    │
                   │ • PostgreSQL    │
                   │ • Elasticsearch │
                   │ • Redis         │
                   │ • Kibana        │
                   └─────────────────┘
```

### **Production Environment (`pnpm lego:prod`)**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   LEGO App      │    │  Auth Service   │    │  Backend API    │
│   (Docker)      │    │   (Docker)      │    │   (Docker)      │
│   Port: 5173    │    │   Port: 5000    │    │   Port: 3000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                │
                   ┌─────────────────┐
                   │   Infrastructure │
                   │   (Docker)      │
                   │                 │
                   │ • MongoDB       │
                   │   (50 users)    │
                   │ • PostgreSQL    │
                   │ • Elasticsearch │
                   │ • Redis         │
                   │ • Kibana        │
                   │ • Nginx         │
                   └─────────────────┘
```

## 📊 Service Ports

| Service | Port | Description | Access URL |
|---------|------|-------------|------------|
| LEGO App (Frontend) | 5173 | React + Vite application | http://localhost:5173 |
| Auth Service | 5000 | Authentication API | http://localhost:5000 |
| Backend API | 3000 | Main application API | http://localhost:3000 |
| MongoDB | 27017 | Auth database (50 users) | mongodb://localhost:27017 |
| PostgreSQL | 5432 | Backend database | postgresql://localhost:5432 |
| Elasticsearch | 9200 | Search engine | http://localhost:9200 |
| Kibana | 5601 | Elasticsearch management | http://localhost:5601 |
| MongoDB Express | 8081 | MongoDB admin interface | http://localhost:8081 |
| Redis | 6379 | Caching | redis://localhost:6379 |

## 🔍 Monitoring and Debugging

### **Check Service Status**

```bash
# Check all services
pnpm lego:status

# Check Docker services only
pnpm docker:status
```

### **View Logs**

```bash
# View all logs
pnpm lego:logs

# View specific service logs
pnpm lego:logs lego-app
pnpm lego:logs auth-service
pnpm lego:logs backend-api

# View Docker logs
pnpm docker:logs
```

### **Database Verification**

```bash
# Check seeded users
mongosh mongodb://admin:password123@localhost:27017/lego_auth --eval "db.users.countDocuments()"

# View sample users
mongosh mongodb://admin:password123@localhost:27017/lego_auth --eval "db.users.find().limit(3).pretty()"
```

### **Troubleshooting**

```bash
# If services aren't starting properly
pnpm lego:cleanup
pnpm lego:dev

# If you need to rebuild everything
pnpm lego:build
pnpm lego:prod

# If you need to check what's using ports
lsof -i :5173
lsof -i :5000
lsof -i :3000
```

## 🛠️ Advanced Usage

### **Custom Environment Configuration**

```bash
# 1. Copy environment template
cp docker/env.docker.example docker/.env

# 2. Edit the environment file
nano docker/.env

# 3. Start services with custom config
pnpm lego:prod
```

### **Individual Service Development**

```bash
# Start only infrastructure
pnpm docker:dev

# Run individual services locally
cd apps/web/lego-moc-instructions-app && pnpm dev
cd apps/api/auth-service && pnpm dev
cd apps/api/lego-projects-api && pnpm dev
```

### **Manual Database Seeding**

```bash
# Run seeder manually
cd apps/api/auth-service
npm run seed

# Or run the script directly
node scripts/seed-database.js
```

### **Docker Swarm Deployment**

```bash
# Deploy to Docker Swarm for production scaling
pnpm docker:swarm

# Check swarm services
docker service ls

# Scale services
docker service scale lego-app_lego-app=3
docker service scale lego-app_auth-service=2
docker service scale lego-app_backend-api=5
```

## 📝 Environment Variables

The following environment variables are used by the services:

### **Frontend (LEGO App)**
- `VITE_API_URL` - Backend API URL
- `VITE_AUTH_API_URL` - Auth service URL

### **Auth Service**
- `JWT_SECRET` - JWT signing secret
- `MONGODB_URI` - MongoDB connection string
- `EMAIL_HOST` - SMTP server for emails
- `FRONTEND_URL` - Frontend URL for CORS

### **Backend API**
- `DATABASE_URL` - PostgreSQL connection string
- `ELASTICSEARCH_URL` - Elasticsearch URL
- `AWS_*` - AWS S3 configuration
- `JWT_SECRET` - JWT verification secret

## 🔒 Security Considerations

### **Development**
- Uses default passwords for databases
- CORS configured for localhost
- JWT secrets are development defaults
- Seeded users have predictable passwords (for testing)

### **Production**
- Update all secrets in `docker/.env`
- Configure proper CORS origins
- Set up SSL/TLS certificates
- Use strong database passwords
- Configure AWS credentials securely
- Disable or modify seeder for production

## 📚 Related Documentation

- [Docker Deployment Guide](./DOCKER_DEPLOYMENT.md)
- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Authentication Flow](./__docs__/ROUTING.md)
- [Testing Guide](./docs/PLAYWRIGHT_TESTING.md)
- [Database Seeder Documentation](./apps/api/auth-service/db/README.md)

## 🆘 Getting Help

### **Common Issues**

1. **Port conflicts**: Use `lsof -i :PORT` to check what's using a port
2. **Docker not running**: Start Docker Desktop or Docker Engine
3. **Permission issues**: Make sure scripts are executable (`chmod +x scripts/*.sh`)
4. **Environment issues**: Check `docker/.env` file exists and is configured
5. **Seeder not working**: Check MongoDB connection and logs

### **Useful Commands**

```bash
# Check Docker status
docker info

# Check running containers
docker ps

# Check Docker logs
docker logs <container-name>

# Check system resources
docker stats

# Clean up Docker system
docker system prune -a

# Check seeded users
mongosh --eval "db.users.countDocuments()"
```

### **Support**

For issues with the LEGO app setup:
1. Check the logs: `pnpm lego:logs`
2. Check service status: `pnpm lego:status`
3. Try cleanup and restart: `pnpm lego:cleanup && pnpm lego:dev`
4. Review the Docker deployment documentation
5. Check the database seeder documentation 