---
id: backend-docker-modernization
title: Modernize Backend Development - Remove Docker from Application Services
owner: development-team
area: platform
type: refactor
risk: medium
created: 2025-01-09
package: apps/api
---

# Modernize Backend Development - Remove Docker from Application Services

## Executive Summary
- **Problem**: Current Docker-heavy development setup creates slow iteration cycles, complex debugging, and doesn't leverage monorepo benefits effectively. Developers wait for container rebuilds on every code change.
- **Audience**: Backend developers, full-stack developers, DevOps team
- **Opportunity**: Modernize to hybrid approach - containerize only stateful infrastructure while running applications natively for faster development cycles and better debugging experience
- **Desired Outcome**: Development environment that starts in <30 seconds, provides native debugging, hot reload, and leverages pnpm workspace benefits while maintaining infrastructure isolation

## Goals
- Remove Docker containers from application services (auth-service, lego-api, frontend apps)
- Keep only infrastructure services in Docker (databases, cache, search, management tools)
- Achieve <30 second startup time for full development environment
- Enable native Node.js debugging and hot reload for all services
- Leverage monorepo workspace linking for shared packages
- Maintain consistency with production deployment (Docker can still be used for production)
- Create wrapper services if needed for infrastructure management

## Constraints & Standards (Must-Follow)
- Maintain existing API contracts and service interfaces
- Preserve current environment variable patterns
- Keep production Docker setup intact
- Use existing monorepo tooling: pnpm workspaces, Turbo
- Maintain current testing patterns: Vitest (unit), Playwright (e2e)
- Security: maintain current auth patterns and CORS configuration
- Database schemas: no changes to existing MongoDB/PostgreSQL structures
- builds must pass for the entire monorepo in order for the task to be completed
- all tests must pass in order for the task to be completed

## Documentation & Testing Standards (Required for Each Task)
Every task completion MUST include the following subtasks:
- **Update Documentation**: Swagger/OpenAPI docs, __docs__ README files, inline code comments
- **Update HTTP Examples**: Any __http__ request files, Postman collections, curl examples
- **Update Tests**: Unit tests (Vitest), integration tests, E2E tests (Playwright) that cover the changes
- **Update Examples**: Code examples in documentation, sample configurations, demo scripts
- **Validation**: Verify all documentation is accurate and examples work as expected

## Acceptance Criteria

### Phase A — Infrastructure Isolation
- Create docker-compose-dev.yml with only infrastructure services
- MongoDB, PostgreSQL, Redis, Elasticsearch run in containers
- Management tools (mongo-express, pgAdmin) accessible
- Infrastructure services start in <10 seconds

### Phase B — Native Application Setup  
- Auth service runs natively with nodemon/hot reload
- LEGO API service runs natively with TypeScript compilation
- Frontend apps run with native Vite dev servers
- All services connect to containerized infrastructure
- Proper service discovery configuration

### Phase C — Enhanced Scripts & Tooling
- Single command startup: `pnpm dev:all`
- Individual service commands: `pnpm dev:auth`, `pnpm dev:lego`
- Turbo-powered orchestration with proper dependencies
- Environment management with .env files per service
- Health checks for all services

### Phase D — Developer Experience
- Native debugging works for all Node.js services
- Hot reload functional for all applications
- Shared package changes propagate instantly
- IDE integration improved (proper TypeScript resolution)
- Error handling and logging enhanced

### Phase E — Documentation & Migration
- Updated README with new development workflow
- Migration guide from old Docker setup
- Troubleshooting documentation
- Performance comparison metrics
- Rollback plan if needed

## Vertical Slices

### Phase A — Infrastructure Docker Setup
**Deliverable**: Lightweight docker-compose-dev.yml
- Extract infrastructure services from main docker-compose.yml
- Configure network and volume mappings
- Test infrastructure startup independently
- Validate database connections and management tools
- **Required Subtasks:**
  - Update __docs__/DOCKER_SETUP.md with new infrastructure-only approach
  - Update docker-compose documentation and inline comments
  - Create/update __http__ files for testing infrastructure connectivity
  - Add unit tests for infrastructure health checks
  - Update example configurations and startup scripts
  - Validate all documentation accuracy and examples functionality

### Phase B1 — Auth Service Native Setup
**Deliverable**: Auth service running natively
- Update package.json scripts for native execution
- Configure environment variables for native connection to Docker infrastructure
- Test MongoDB connection from native Node.js process
- Verify auth endpoints work correctly
- **Required Subtasks:**
  - Update Swagger/OpenAPI docs for auth service endpoints
  - Update __docs__/AUTH-DEV-SETUP.md with native development setup
  - Update all __http__ files with new localhost endpoints
  - Update auth service unit and integration tests for native execution
  - Update authentication examples and demo scripts
  - Validate all auth documentation and examples work correctly

### Phase B2 — LEGO API Native Setup  
**Deliverable**: LEGO API service running natively
- Configure PostgreSQL connection from native process
- Set up Redis caching connection
- Configure Elasticsearch search functionality
- Test API endpoints and file upload functionality
- **Required Subtasks:**
  - Update Swagger/OpenAPI docs for LEGO API endpoints
  - Update __docs__ README with native LEGO API development setup
  - Update all __http__ request files with new native endpoints
  - Update LEGO API tests (unit, integration, E2E) for native execution
  - Update file upload examples and search functionality demos
  - Validate all LEGO API documentation and examples work correctly

### Phase B3 — Frontend Native Setup
**Deliverable**: React applications running with native Vite
- Configure API endpoint connections to native backend services
- Update CORS configuration for native development
- Test authentication flow end-to-end
- Verify hot reload and development experience
- **Required Subtasks:**
  - Update frontend documentation with new development setup
  - Update API service configuration examples in documentation
  - Update E2E tests (Playwright) for native backend connections
  - Update frontend example components and demo pages
  - Update environment configuration examples
  - Validate all frontend documentation and examples work correctly

### Phase C — Enhanced Development Scripts
**Deliverable**: Improved npm scripts and Turbo configuration
- Create orchestrated startup commands using Turbo
- Implement service dependency management
- Add health check scripts
- Create service-specific commands for targeted development
- **Required Subtasks:**
  - Update main README.md with new development commands
  - Update __docs__ with Turbo orchestration documentation
  - Create/update __http__ files for service health checks
  - Add tests for new npm scripts and health check functionality
  - Update development workflow examples and guides
  - Validate all script documentation and examples work correctly

### Phase D — Developer Experience Improvements
**Deliverable**: Enhanced debugging and development workflow
- Configure VS Code launch configurations for native debugging
- Set up proper source map generation
- Implement enhanced logging and error handling
- Test monorepo workspace linking for shared packages
- **Required Subtasks:**
  - Update __docs__/DEVELOPMENT.md with debugging setup instructions
  - Update VS Code configuration examples and documentation
  - Update error handling documentation and logging examples
  - Add tests for enhanced error handling and logging
  - Update debugging examples and troubleshooting guides
  - Validate all debugging documentation and examples work correctly

### Phase E — Documentation and Migration
**Deliverable**: Complete documentation and migration support
- Write comprehensive setup and troubleshooting guides
- Create performance comparison metrics
- Document rollback procedures
- Provide team training materials
- **Required Subtasks:**
  - Update all __docs__ files with comprehensive migration guide
  - Update Swagger/OpenAPI docs with final configuration
  - Update all __http__ request collections with final endpoints
  - Update all tests to reflect final configuration
  - Update all examples, demos, and sample configurations
  - Final validation of all documentation accuracy and examples functionality

## Technical Architecture

### Current State Issues
- 8+ containers for development (resource heavy)
- Container rebuilds on every code change (slow iteration)
- Complex debugging through container layers
- Monorepo benefits not utilized (no workspace linking)
- TypeScript compilation issues in Docker environment

### Target Architecture
```
┌─────────────────────────────────────┐
│           Development Host          │
│                                     │
│  ┌─────────────┐ ┌─────────────────┐│
│  │ Auth Service│ │ LEGO API Service││
│  │ (Native)    │ │ (Native)        ││
│  │ Port: 9000  │ │ Port: 3001      ││
│  └─────────────┘ └─────────────────┘│
│                                     │
│  ┌─────────────┐ ┌─────────────────┐│
│  │ Frontend    │ │ Shared Packages ││
│  │ (Native)    │ │ (Workspace)     ││  
│  │ Port: 3000  │ │                 ││
│  └─────────────┘ └─────────────────┘│
└─────────────────────────────────────┘
           │ (connects to)
┌─────────────────────────────────────┐
│        Docker Infrastructure       │
│                                     │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │MongoDB  │ │Postgres │ │ Redis   │ │
│ │:27017   │ │:5432    │ │:6379    │ │
│ └─────────┘ └─────────┘ └─────────┘ │
│                                     │
│ ┌─────────┐ ┌─────────┐             │
│ │Elastic  │ │PgAdmin  │             │
│ │:9200    │ │:8082    │             │
│ └─────────┘ └─────────┘             │
└─────────────────────────────────────┘
```

### Service Communication
- Native apps connect to Docker infrastructure via localhost ports
- Service discovery through environment variables
- No container-to-container networking needed for apps
- Infrastructure services maintain Docker networking

### Environment Configuration
```bash
# Apps run natively
AUTH_SERVICE_URL=http://localhost:9000
LEGO_API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Infrastructure via Docker
MONGODB_URI=mongodb://localhost:27017/myapp
POSTGRES_URI=postgresql://localhost:5432/lego_projects
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200
```

## Implementation Approach

### New Scripts to Add
```json
{
  "dev:infra": "docker-compose -f docker-compose-dev.yml up -d",
  "dev:all": "pnpm dev:infra && turbo dev --parallel",
  "dev:auth": "pnpm dev:infra && turbo dev --filter=@repo/api-auth-service",
  "dev:lego": "pnpm dev:infra && turbo dev --filter=@repo/api-lego-projects",
  "dev:frontend": "turbo dev --filter=@repo/lego-moc-instructions-app",
  "dev:stop": "docker-compose -f docker-compose-dev.yml down"
}
```

### Wrapper Services (If Needed)
If infrastructure management becomes complex, create lightweight wrapper services:
- `apps/infrastructure/database-manager` - MongoDB health monitoring
- `apps/infrastructure/cache-manager` - Redis connection management
- `apps/infrastructure/search-manager` - Elasticsearch index management

## Rollout Strategy

### Phase 1: Parallel Setup (Low Risk)
- Create new development configuration alongside existing
- Team can opt-in to test new workflow
- Maintain fallback to current Docker setup

### Phase 2: Team Migration (Medium Risk)  
- Migrate team members individually
- Gather feedback and iterate
- Document common issues and solutions

### Phase 3: Full Migration (Medium Risk)
- Make new workflow default
- Archive old Docker development setup
- Update CI/CD to test both approaches initially

## Success Metrics
- **Startup Time**: <30 seconds for full environment (vs current 2+ minutes)
- **Iteration Speed**: <5 seconds for code changes to reflect (vs current 30+ seconds)
- **Developer Satisfaction**: Survey improvement in debugging and development experience
- **Resource Usage**: 50% reduction in CPU/memory usage during development
- **Error Rate**: No increase in development environment setup failures

## Risks & Mitigation

### High Risk: Service Discovery Complexity
**Mitigation**: Use simple localhost ports and environment variables rather than complex service discovery

### Medium Risk: Environment Configuration Drift
**Mitigation**: Standardized .env templates and validation scripts

### Medium Risk: Team Adoption Resistance
**Mitigation**: Gradual rollout with clear benefits demonstration

### Low Risk: Infrastructure Service Updates
**Mitigation**: Keep infrastructure Docker setup simple and well-documented

## Dependencies
- pnpm workspace functionality
- Turbo build system
- Docker for infrastructure only
- Node.js 18+ for native execution
- Existing service codebases (no major refactoring needed)

## Appendix

### Performance Comparison Target
| Metric | Current (Docker) | Target (Hybrid) | Improvement |
|--------|------------------|-----------------|-------------|
| Full Startup | 2-3 minutes | <30 seconds | 75%+ faster |
| Code Change Reflection | 30-60 seconds | <5 seconds | 85%+ faster |
| Memory Usage | 4-6GB | 2-3GB | 50% reduction |
| Debug Setup | Complex | Native | Qualitative |

### Reference Architecture
- Current: `docker-compose.yml` (full containerization)
- Target: `docker-compose-dev.yml` (infrastructure only)
- Scripts: Enhanced package.json with Turbo orchestration
- Documentation: Updated development workflow guides
