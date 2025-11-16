# Introduction

This architecture document defines the complete technical implementation for migrating the LEGO Projects API from ECS Fargate to AWS Lambda using SST v3 (Ion). It provides detailed specifications for Lambda functions, infrastructure components, data flows, and integration patterns to guide AI-driven development.

## Migration Context

**Current State**: Express.js API running on ECS Fargate with PostgreSQL (RDS), Redis (ElastiCache), OpenSearch, and S3.

**Target State**: Serverless architecture using AWS Lambda with API Gateway HTTP API, maintaining the same external interfaces while leveraging serverless benefits (cost reduction, auto-scaling, improved developer experience).

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-02 | 1.0 | Initial architecture document for SST migration | Winston (Architect Agent) |

---
