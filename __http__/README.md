# Infrastructure Connectivity Tests

This directory contains HTTP test files to verify that Docker infrastructure services are running correctly.

## Usage

These files can be used with REST clients like:

- **VS Code REST Client extension** (`.http` files)
- **curl** (copy commands from files)
- **HTTPie**
- **Postman** (import files)

## Test Files

### API Services

- `auth-service.http` - Test Auth Service API endpoints (localhost:5000)
- `lego-projects-api.http` - Test LEGO Projects API endpoints (localhost:3000)

### Database Health Checks

- `mongodb.http` - Test MongoDB connection and basic queries
- `postgresql.http` - Test PostgreSQL connection (via pgAdmin API)
- `redis.http` - Test Redis connection (via REST proxy if available)
- `elasticsearch.http` - Test Elasticsearch cluster health and basic operations

### Admin Interface Tests

- `mongo-express.http` - Test MongoDB web interface
- `pgadmin.http` - Test PostgreSQL web interface

## Running Tests

### With VS Code REST Client

1. Install the "REST Client" extension
2. Open any `.http` file
3. Click "Send Request" above each request

### With curl

1. Copy the curl commands from the `.http` files
2. Run in terminal

### Quick Health Check Script

```bash
# Run all health checks quickly
./scripts/test-infrastructure.sh
```

## Expected Results

All services should return healthy responses when the infrastructure is running correctly via `docker-compose -f docker-compose.dev.yml up -d`.
