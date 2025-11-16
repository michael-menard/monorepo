# Next Steps

## UX Expert Prompt

*This migration is primarily backend infrastructure with no UI changes. The existing frontend remains unchanged and continues to consume the same API contracts. No UX Expert consultation required for this PRD.*

## Architect Prompt

**Prompt for Architect**:

```
I've completed the Product Requirements Document for migrating the LEGO Projects API from ECS Fargate to AWS Lambda using SST v3 (Ion). The PRD is located at docs/sst-migration-prd.md.

Please review the PRD and create a comprehensive architecture document (docs/sst-migration-architecture.md) that includes:

1. **High-Level Architecture Diagram**: Visual representation of serverless components (API Gateway, Lambda, RDS Proxy, ElastiCache, OpenSearch, S3, Cognito)
2. **Lambda Function Specifications**: Memory, timeout, environment variables, IAM roles, VPC configuration for each function
3. **Database Connection Strategy**: RDS Proxy configuration, connection pooling best practices, migration from direct RDS connections
4. **File Upload Flow**: Detailed sequence diagram for multipart uploads with Sharp processing in Lambda
5. **Caching Strategy**: Redis key patterns, TTL policies, invalidation triggers
6. **Search Architecture**: OpenSearch indexing pipelines, fallback to PostgreSQL patterns
7. **Security Model**: IAM policies, JWT validation, resource isolation, secrets management
8. **Migration Strategy**: Detailed blue/green deployment plan with rollback procedures
9. **Cost Model**: Break down projected costs by service (Lambda, RDS, Redis, OpenSearch, S3, data transfer)
10. **Performance Optimization**: Cold start mitigation (provisioned concurrency, Lambda layers), connection reuse patterns, bundle optimization

Reference the existing codebase at apps/api/lego-projects-api for current implementation details. Use SST v3 best practices and AWS Well-Architected Framework principles.
```

---
