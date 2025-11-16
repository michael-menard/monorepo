# Image Service Migration - Overview

**Version:** 1.0
**Date:** 2025-01-15
**Status:** Draft

---

## Executive Summary

This document provides an overview of the Image Service migration project, which extracts image upload functionality from the monolithic LEGO API into a standalone, dedicated service.

### Current State

- Image upload handled within `gallery.ts` Lambda (1,011 LOC)
- Image metadata stored in PostgreSQL (`gallery_images` table)
- Images stored in S3, cached in Redis, indexed in OpenSearch
- Tightly coupled to main application database and infrastructure

### Target State

- **Standalone Image Service** with dedicated infrastructure
- **DynamoDB** for image metadata (single-digit ms latency)
- **CloudFront CDN** for global image delivery
- **S3** with lifecycle policies for cost optimization
- **Decoupled** from main application concerns
- **Independent deployment pipeline**

---

## Business Objectives

### Primary Goals

1. **Improve Image Upload Performance**
   - Reduce P95 upload latency from ~2s to <800ms
   - Reduce P95 image retrieval latency from ~300ms to <50ms (with CloudFront)
   - Achieve 99.9% upload success rate

2. **Reduce Operational Costs**
   - Eliminate RDS storage costs for image metadata (~$0.115/GB/month)
   - Optimize S3 storage with lifecycle policies (30-50% cost reduction)
   - Reduce NAT Gateway costs via CloudFront

3. **Enable Independent Scaling**
   - Scale image service independently of main application
   - Support 10x traffic growth without main DB impact
   - Handle burst traffic (100+ concurrent uploads)

4. **Improve Developer Experience**
   - Independent deployment cycle for image features
   - Isolated testing environment
   - Clear service boundaries

---

## Technical Objectives

1. **Separation of Concerns** - Image service owns image lifecycle completely
2. **Performance First** - DynamoDB single-digit millisecond reads, CloudFront edge caching
3. **Cost Optimization** - DynamoDB on-demand pricing, S3 Intelligent-Tiering
4. **Resilience** - Multi-AZ deployment, graceful degradation

---

## Key Architecture Changes

| Component            | Current                | New                               |
| -------------------- | ---------------------- | --------------------------------- |
| **Metadata Storage** | PostgreSQL (RDS)       | DynamoDB                          |
| **Metadata Schema**  | `gallery_images` table | `ImageMetadata` table             |
| **API Endpoint**     | `/api/images` (shared) | `images.lego-api.com` (dedicated) |
| **CDN**              | None                   | CloudFront                        |
| **Cache**            | Redis (required)       | Redis (optional)                  |
| **Upload Strategy**  | Direct Lambda upload   | S3 Transfer Acceleration          |
| **Deployment**       | Coupled with main API  | Independent SST stack             |

---

## Performance Targets

| Operation           | Current (P95) | Target (P95) | Improvement |
| ------------------- | ------------- | ------------ | ----------- |
| **Upload**          | 2500ms        | <1000ms      | 60% faster  |
| **Get by ID**       | 300ms         | <50ms        | 83% faster  |
| **List (20 items)** | 400ms         | <100ms       | 75% faster  |
| **Update**          | 350ms         | <80ms        | 77% faster  |
| **Delete**          | 300ms         | <100ms       | 67% faster  |

---

## Migration Timeline

**Total Duration:** 6 weeks

```
Week 1: Infrastructure Setup
Week 2: Lambda Implementation
Week 3: Dual-Write Implementation
Week 4: Data Migration
Week 5: Cutover
Week 6: Optimization & Cleanup
```

---

## Document Structure

This PRD has been sharded into focused documents:

1. **00-overview.md** (this file) - Executive summary and navigation
2. **01-architecture.md** - High-level architecture and diagrams
3. **02-data-model.md** - DynamoDB schema and access patterns
4. **03-api-specification.md** - REST API endpoints and contracts
5. **04-infrastructure.md** - AWS services configuration (SST, CloudFront, etc.)
6. **05-migration-strategy.md** - Phased migration plan and rollback
7. **06-performance-optimization.md** - Performance tuning opportunities
8. **07-security.md** - Authentication, authorization, and security requirements
9. **08-cost-analysis.md** - Cost breakdown and ROI analysis
10. **09-monitoring.md** - Observability, metrics, and dashboards
11. **10-implementation-phases.md** - Detailed phase-by-phase tasks

---

## Quick Links

- **Architecture Diagram:** [01-architecture.md](./01-architecture.md)
- **API Specification:** [03-api-specification.md](./03-api-specification.md)
- **Migration Plan:** [05-migration-strategy.md](./05-migration-strategy.md)
- **Implementation Tasks:** [10-implementation-phases.md](./10-implementation-phases.md)

---

## Success Metrics

### Technical KPIs

- P95 Upload Latency: **<1000ms**
- P95 Get Latency: **<50ms**
- Upload Success Rate: **>99.9%**
- CloudFront Cache Hit Rate: **>85%**

### Business KPIs

- Images Uploaded/Day: **50 → 200**
- Unique Users: **100 → 500**
- Average Upload Time: **2.1s → <1.0s**

### Cost KPIs

- Monthly Infrastructure Cost: **<$150** (optimized)
- Cost per Image Upload: **<$0.005**
- Cost per 1K Image Views: **<$0.10**

---

## Approval Status

| Role                  | Name | Status     | Date |
| --------------------- | ---- | ---------- | ---- |
| **Product Owner**     |      | ⏳ Pending |      |
| **Tech Lead**         |      | ⏳ Pending |      |
| **DevOps Lead**       |      | ⏳ Pending |      |
| **Security Engineer** |      | ⏳ Pending |      |

---

## Next Steps

1. **Review** all sharded documents
2. **Approve** architecture and migration strategy
3. **Kick off** Phase 1 (Infrastructure Setup)
4. **Track progress** in [10-implementation-phases.md](./10-implementation-phases.md)

---

**For detailed information on any aspect, refer to the corresponding numbered document.**
