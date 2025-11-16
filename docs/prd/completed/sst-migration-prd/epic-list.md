# Epic List

## Epic 1: SST Infrastructure Foundation & Database Migration
**Goal**: Establish SST v3 project structure, configure VPC, RDS PostgreSQL with Proxy, ElastiCache Redis, and OpenSearch. Implement Drizzle migrations and validate database connectivity from Lambda. Deploy a basic health check endpoint to verify end-to-end infrastructure.

## Epic 2: Core MOC Instructions API Migration
**Goal**: Migrate all MOC Instructions CRUD operations to Lambda functions with API Gateway routes. Implement authentication, validation, caching, and Elasticsearch indexing. Ensure complete feature parity with existing Express endpoints.

## Epic 3: Gallery & Wishlist APIs Migration
**Goal**: Migrate Gallery Images and Wishlist APIs to serverless architecture including file upload handlers, S3 integration, image processing, and Redis caching. Validate all CRUD operations and search functionality.

## Epic 4: User Profile & Advanced Features Migration
**Goal**: Migrate user profile operations (avatar upload, profile management) and implement advanced features including CSV parts list parsing, multi-file uploads, and comprehensive error handling.

## Epic 5: Production Deployment, Monitoring & Cutover
**Goal**: Implement production-grade monitoring, alerting, and logging. Execute blue/green deployment strategy with progressive traffic shifting. Decommission legacy ECS infrastructure after validation.

---
