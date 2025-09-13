# Docker Migration Plan: From Full Containerization to External Services Only

## 🎯 Migration Goal

**Objective**: Minimize Docker usage to only external services (databases, search engines, admin tools) while running application services natively for better development experience.

## 📊 Current Docker Usage Audit

### ✅ **Keep in Docker (External Services)**
These services should remain containerized as they're external dependencies:

1. **MongoDB** (Port 27017) - Database for auth service
2. **PostgreSQL** (Port 5432) - Database for LEGO projects API  
3. **Redis** (Port 6379) - Caching layer
4. **Elasticsearch** (Port 9200) - Search functionality
5. **Mongo Express** (Port 8081) - MongoDB admin interface
6. **pgAdmin** (Port 8082) - PostgreSQL admin interface

### ❌ **Migrate Away from Docker (Application Services)**
These should run natively for better development experience:

1. **Frontend React App** (`lego-moc-instructions-app`)
2. **Auth Service API** (`auth-service`)
3. **LEGO Projects API** (`lego-projects-api`)

## 🔄 Migration Benefits

### **Advantages of Native Development**
- ✅ **Faster startup times** - No container build/startup overhead
- ✅ **Better debugging** - Direct access to Node.js debugger
- ✅ **Hot reload performance** - Faster file watching and reloading
- ✅ **IDE integration** - Better IntelliSense and debugging support
- ✅ **Resource efficiency** - Lower memory and CPU usage
- ✅ **Simplified networking** - Direct localhost connections
- ✅ **Easier dependency management** - Direct npm/pnpm package management

### **What We Keep from Docker**
- ✅ **Consistent external services** - Same database versions across team
- ✅ **Easy service management** - One command to start all databases
- ✅ **Data persistence** - Docker volumes for database data
- ✅ **Admin interfaces** - Web-based database management

## 📋 Current State Analysis

### **Docker Compose Files** ✅
1. ✅ `docker-compose.yml` - **REMOVED** (contained app services)
2. ✅ `docker-compose.dev.yml` - **KEPT** (external services only)
3. ✅ `docker-compose.override.yml` - **REMOVED** (app service overrides)
4. ✅ `apps/api/auth-service/docker-compose.yml` - **REMOVED** (redundant)

### **Dockerfiles to Remove**
1. `apps/web/lego-moc-instructions-app/Dockerfile`
2. `apps/api/auth-service/Dockerfile`
3. `apps/api/lego-projects-api/Dockerfile`
4. `.dockerignore` files in app directories

### **Scripts to Update**
1. `docker-scripts.sh` - **MODIFY** (external services only)
2. `dev.sh` - **KEEP** (already starts external services only)
3. `scripts/start-auth-dev.sh` - **KEEP** (good native development pattern)
4. `scripts/start-lego-apps.sh` - **KEEP** (native development)

## 🚀 Migration Steps

### **Phase 1: Prepare External Services Configuration**

1. **Update `docker-compose.dev.yml`** to be the single source of truth for external services
2. **Remove application services** from all Docker configurations
3. **Ensure all external services** have proper health checks and networking

### **Phase 2: Update Development Scripts**

1. **Modify `docker-scripts.sh`** to only manage external services
2. **Update package.json scripts** to use native development commands
3. **Create new development workflow scripts** for common tasks

### **Phase 3: Remove Application Dockerfiles**

1. **Delete Dockerfiles** from application directories
2. **Remove .dockerignore files** from application directories
3. **Clean up Docker-related configurations** in application code

### **Phase 4: Update Documentation**

1. **Update README.md** with new development workflow
2. **Modify onboarding documentation** to reflect native development
3. **Create troubleshooting guides** for common native development issues

### **Phase 5: Test and Validate**

1. **Test full development workflow** from clean environment
2. **Validate all services** can connect to external services
3. **Ensure team members** can follow new setup process

## 📝 Detailed Implementation Plan

### **Step 1: Clean Up docker-compose.dev.yml**

**Current**: Mixed application and external services
**Target**: External services only

**Actions**:
- Keep: mongodb, postgres, redis, elasticsearch, mongo-express, pgadmin
- Remove: Any application service definitions
- Ensure proper networking and health checks

### **Step 2: Update Package.json Scripts**

**Scripts Updated** ✅:
```json
{
  "test:setup": "pnpm dev:infra && concurrently \"pnpm auth:backend\" \"pnpm auth:ui\"",
  "auth:dev": "pnpm dev:infra && concurrently \"pnpm auth:backend\" \"pnpm auth:ui\"",
  "auth:backend": "cd apps/api/auth-service && pnpm dev",
  "auth:ui": "cd apps/web/auth-ui-example && pnpm dev"
}
```

**New Scripts Added** ✅:
```json
{
  "dev:infra": "docker-compose -f docker-compose.dev.yml up -d",
  "dev:infra:stop": "docker-compose -f docker-compose.dev.yml down",
  "dev:infra:logs": "docker-compose -f docker-compose.dev.yml logs -f",
  "dev:infra:status": "docker-compose -f docker-compose.dev.yml ps",
  "dev:all": "pnpm dev:infra && turbo dev --parallel",
  "dev:auth": "pnpm dev:infra && turbo dev --filter=@repo/api-auth-service",
  "dev:lego": "pnpm dev:infra && turbo dev --filter=@repo/api-lego-projects",
  "dev:frontend": "turbo dev --filter=@repo/lego-moc-instructions-app"
}
```

### **Step 3: Environment Configuration**

**Database Connection Updates**:
- **MongoDB**: `mongodb://admin:password123@localhost:27017/myapp?authSource=admin`
- **PostgreSQL**: `postgresql://postgres:password@localhost:5432/lego_projects`
- **Redis**: `redis://localhost:6379`
- **Elasticsearch**: `http://localhost:9200`

### **Step 4: Development Workflow**

**New Standard Workflow**:
```bash
# 1. Start external services
pnpm dev:infra

# 2. Start all applications natively
pnpm dev

# Or start specific services
pnpm dev:auth      # Auth service only
pnpm dev:lego      # LEGO API only  
pnpm dev:frontend  # Frontend only

# 3. Stop external services when done
pnpm dev:stop
```

## 🔧 Files to Modify/Remove

### **Files Removed** ✅
- ✅ `docker-compose.yml` (removed)
- ✅ `docker-compose.override.yml` (removed)
- ✅ `apps/web/lego-moc-instructions-app/Dockerfile` (removed)
- ✅ `apps/web/lego-moc-instructions-app/.dockerignore` (removed)
- ✅ `apps/api/auth-service/Dockerfile` (removed)
- ✅ `apps/api/auth-service/.dockerignore` (removed)
- ✅ `apps/api/lego-projects-api/Dockerfile` (removed)
- ✅ `apps/api/lego-projects-api/.dockerignore` (removed)
- ✅ `apps/api/auth-service/docker-compose.yml` (removed - redundant)
- ✅ `apps/api/lego-projects-api/docker-compose.yml` (removed - redundant)
- ✅ `docker/` directory (removed - no longer needed)

### **Files Modified** ✅
- ✅ `docker-compose.dev.yml` - Already contained external services only
- ✅ `docker-scripts.sh` - Already manages external services only
- ✅ `package.json` - Updated scripts for native development
- ✅ `README.md` - Updated setup instructions
- ✅ `__docs__/ONBOARDING.md` - Updated development workflow
- ✅ `__docs__/DOCKER_SETUP.md` - Already focused on external services
- ✅ `scripts/start-auth-dev.sh` - Updated to use centralized external services

### **Files Kept** ✅
- ✅ `dev.sh` - Already follows the target pattern
- ✅ `scripts/start-auth-dev.sh` - Updated to use centralized external services
- ✅ `scripts/start-lego-apps.sh` - Native frontend development
- ✅ `docker-compose.dev.yml` - Centralized external services configuration

## ⚠️ Migration Considerations

### **Potential Issues**
1. **Port conflicts** - Ensure no conflicts between native apps and external services
2. **Environment variables** - Update connection strings from container names to localhost
3. **File watching** - Ensure hot reload works properly in native development
4. **Team synchronization** - All team members need to migrate simultaneously

### **Rollback Plan**
- Keep current Docker files in a `docker-legacy/` directory during migration
- Document rollback steps in case issues arise
- Test migration on non-critical environments first

## 📈 Success Metrics

### **Performance Improvements**
- [ ] Application startup time < 10 seconds (vs current Docker startup)
- [ ] Hot reload response time < 2 seconds
- [ ] Memory usage reduction of 30-50%
- [ ] CPU usage reduction during development

### **Developer Experience**
- [ ] Simplified onboarding process (< 5 commands to get running)
- [ ] Better debugging capabilities
- [ ] Faster iteration cycles
- [ ] Improved IDE integration

## 🎉 Post-Migration Benefits

1. **Faster Development Cycles** - Immediate code changes without container rebuilds
2. **Better Resource Utilization** - Lower memory and CPU usage
3. **Simplified Debugging** - Direct access to Node.js debugging tools
4. **Improved IDE Support** - Better IntelliSense and code navigation
5. **Maintained Service Consistency** - External services still containerized for consistency

---

**Next Steps**: Ready to begin implementation? Start with Phase 1 to prepare the external services configuration.
