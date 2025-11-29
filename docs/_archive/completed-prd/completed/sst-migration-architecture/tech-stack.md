# Tech Stack

## Technology Stack Table

| Category               | Technology               | Version          | Purpose                              | Rationale                                                                          |
| ---------------------- | ------------------------ | ---------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| Infrastructure as Code | SST (Ion)                | 3.x              | Serverless infrastructure definition | Type-safe IaC with Pulumi backend, unified dev/deploy experience, resource linking |
| IaC Backend            | Pulumi                   | Latest           | Cloud resource provisioning          | 150+ providers, mature state management, SST v3 foundation                         |
| Runtime                | Node.js                  | 20 LTS           | Lambda execution environment         | Matches existing API, fast cold starts, native async/await, ES modules support     |
| API Gateway            | AWS API Gateway HTTP API | v2               | REST API endpoint management         | Lower cost than REST API v1, improved performance, simpler pricing                 |
| Compute                | AWS Lambda               | Latest           | Serverless function execution        | Auto-scaling, pay-per-use, no server management, millisecond billing               |
| Language               | TypeScript               | 5.8+             | Lambda function development          | Type safety, matches existing codebase, shared types with frontend                 |
| ORM                    | Drizzle ORM              | 0.44+            | Database query builder               | Lightweight, PostgreSQL-focused, excellent TypeScript support, existing schemas    |
| Validation             | Zod                      | 4.0+             | Runtime type validation              | Schema-based validation, TypeScript integration, existing patterns                 |
| Database               | PostgreSQL               | 15               | Relational data storage              | Existing database, mature JSON support, full-text search capabilities              |
| Database Proxy         | AWS RDS Proxy            | Latest           | Connection pooling                   | Mandatory for Lambda-RDS connectivity, manages connection lifecycle                |
| Cache                  | ElastiCache Redis        | 7.x              | Query result caching                 | Fast in-memory cache, reduces database load, supports TTL                          |
| Search Engine          | AWS OpenSearch           | 2.x              | Full-text search indexing            | Elasticsearch compatibility, managed service, JSON document store                  |
| File Storage           | AWS S3                   | Latest           | Object storage for uploads           | Scalable, durable, cost-effective, existing file storage                           |
| Image Processing       | Sharp                    | 0.34+            | Image optimization/resizing          | Fast, memory-efficient, supports WebP conversion                                   |
| Authentication         | AWS Cognito              | Latest           | User authentication                  | Existing auth provider, JWT tokens, no changes required                            |
| Secrets Management     | AWS Secrets Manager      | Latest           | Database credentials                 | Automatic rotation, IAM-based access                                               |
| Lambda Bundler         | esbuild                  | Latest (via SST) | JavaScript bundling                  | Ultra-fast builds, tree-shaking, automatic via SST                                 |
| Testing Framework      | Vitest                   | Latest           | Unit/integration tests               | Fast, Vite-based, existing monorepo standard                                       |
| E2E Testing            | Playwright               | Latest           | End-to-end testing                   | Existing E2E framework, cross-browser support                                      |
| API Testing            | Supertest                | 7.x              | Lambda handler testing               | HTTP assertions, integration test support                                          |
| Logging                | Pino                     | 9.x              | Structured logging                   | Fast, JSON logging, existing standard                                              |
| Monitoring             | AWS CloudWatch           | Latest           | Logs, metrics, alarms                | Native AWS integration, Lambda default                                             |
| Tracing                | AWS X-Ray                | Latest           | Distributed tracing                  | Service map visualization, performance insights                                    |
| CI/CD                  | GitHub Actions           | Latest           | Automated deployments                | Existing monorepo CI/CD, OIDC auth to AWS                                          |
| Package Manager        | pnpm                     | 9.x              | Dependency management                | Existing monorepo standard, fast installs                                          |

---
