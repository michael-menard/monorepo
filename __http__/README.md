# API & Infrastructure Test Files

This directory contains HTTP test files for the LEGO MOC Instructions API and infrastructure services.

## Usage

These files can be used with REST clients like:

- **VS Code REST Client extension** (`.http` files)
- **curl** (copy commands from files)
- **HTTPie**
- **Postman** (import files)

## Test Files

### API Services

#### Active (Serverless)

- **`lego-projects-api-serverless.http`** - Serverless API endpoints (AWS Lambda + API Gateway)
  - Production: `https://api.lego-moc-instructions.com`
  - Staging: `https://staging-api.lego-moc-instructions.com`
  - Dev: `https://dev-api.lego-moc-instructions.com`
  - Local (sst dev): `http://localhost:3000`

#### Deprecated (Express Monolith - REMOVED)

- ~~`lego-projects-api.http`~~ - Express API (localhost:9000) - **Deprecated, monolith removed**
- ~~`auth-service.http`~~ - Auth Service API (localhost:5000) - **Deprecated, now using AWS Cognito**

### Infrastructure Health Checks

- `elasticsearch.http` - Test Elasticsearch cluster health and basic operations
- `mongo-express.http` - Test MongoDB web interface (admin)
- `pgadmin.http` - Test PostgreSQL web interface (admin)

## Authentication

### Serverless API (Current)

- **Method**: JWT tokens via AWS Cognito
- **Header**: `Authorization: Bearer <token>`
- **Token Source**: AWS Cognito User Pool
- **Validation**: API Gateway JWT Authorizer

### Express API (Deprecated)

- **Method**: Session cookies
- **Header**: `Cookie: token=<token>`
- **Token Source**: Auth Service (MongoDB)

## Key Differences: Express vs Serverless

| Feature              | Express (Old)     | Serverless (New)     |
| -------------------- | ----------------- | -------------------- |
| **Architecture**     | Monolith on ECS   | Lambda + API Gateway |
| **Authentication**   | Session cookies   | JWT Bearer tokens    |
| **Auth Provider**    | Custom (MongoDB)  | AWS Cognito          |
| **File Storage**     | Local + S3        | S3 only              |
| **Image Processing** | Sharp (on server) | Sharp (Lambda layer) |
| **Deployment**       | Docker + CDK      | SST v3 (Pulumi)      |
| **Base URL**         | `localhost:9000`  | API Gateway URL      |

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
