# User Tracking & Metrics Implementation - Phase 1

Part of the User Metrics PRD brownfield enhancement.

See [user-metrics-prd.md](./user-metrics-prd.md) for complete context.

---

### PHASE 1: Infrastructure Foundation

### Story 1.1: AWS Infrastructure Foundation Setup

**As a** DevOps Engineer,
**I want** to establish the core AWS infrastructure foundation for observability,
**so that** all observability tools have the necessary networking, storage, and access controls in place.

**Acceptance Criteria:**
1. VPC created or identified with /24 CIDR block, 2 availability zones, 2 public subnets (/27), 2 private subnets (/26)
2. Single NAT Gateway deployed in one AZ for cost optimization
3. Security groups created for ECS tasks (OpenReplay, Umami) with appropriate ingress/egress rules
4. IAM roles created for ECS task execution, Lambda enhanced permissions, Grafana access
5. Comprehensive resource tagging schema implemented on all resources:
   - Required tags: Project, Environment, ManagedBy, CostCenter, Owner
   - Functional tags: Component, Function, DataType (where applicable)
   - Centralized tag configuration created in `sst/observability/tags.ts`
   - Cost allocation tags activated in AWS Billing Console
6. Tag compliance validated via AWS CLI or Tag Editor (all resources have minimum 5 required tags)
7. SST configuration extended with observability infrastructure constructs

**Integration Verification:**
- IV1: Existing VPC resources (if any) remain unaffected and accessible
- IV2: Application Lambda functions can still access existing Aurora database
- IV3: No disruption to current application deployment pipeline

---

### Story 1.2: Aurora PostgreSQL Schema for Umami

**As a** Database Administrator,
**I want** to create an isolated PostgreSQL schema in Aurora for Umami analytics,
**so that** Umami has dedicated database storage without impacting application data.

**Acceptance Criteria:**
1. New PostgreSQL schema `umami` created in existing Aurora instance
2. Dedicated database user created with permissions scoped to `umami` schema only
3. Connection string and credentials stored in AWS Secrets Manager
4. Schema isolation verified (Umami cannot access application schemas)
5. Database performance baseline documented before and after schema addition
6. Umami schema migrations (tables, indexes) applied successfully

**Integration Verification:**
- IV1: Existing application schemas remain untouched and functional
- IV2: Application database connections unaffected by new schema
- IV3: Aurora RDS metrics show no performance degradation (CPU, connections, IOPS)

---

### Story 1.3: S3 Buckets and Lifecycle Policies

**As a** DevOps Engineer,
**I want** to create S3 buckets with appropriate lifecycle policies for session replay storage,
**so that** OpenReplay can store recordings cost-effectively with automatic cleanup.

**Acceptance Criteria:**
1. S3 bucket created for OpenReplay session recordings with encryption at rest
2. 30-day lifecycle policy configured to automatically delete old recordings
3. S3 Intelligent-Tiering enabled for automatic cost optimization
4. Bucket policy configured to allow ECS task role access only
5. CloudWatch metrics enabled for storage monitoring
6. S3 bucket for CloudWatch Logs export (optional) with 1-year Glacier transition

**Integration Verification:**
- IV1: Existing S3 buckets (frontend assets, etc.) remain unaffected
- IV2: CloudFront distribution continues serving frontend assets without disruption
- IV3: Application's existing S3 access patterns unchanged

---

### Story 1.4: Cost Monitoring and Budget Alerts

**As a** Budget Manager,
**I want** comprehensive cost monitoring and alerts configured,
**so that** observability infrastructure stays within $100-150/month budget.

**Acceptance Criteria:**
1. AWS Budget created with $150/month limit and alerts at 80% ($120) and 100% ($150)
2. Cost allocation tags applied to all observability resources
3. CloudWatch dashboard created showing daily cost trends by service
4. SNS topic configured for budget alert notifications (email)
5. Cost Explorer report created for observability resource group
6. Documentation created for monthly cost review process

**Integration Verification:**
- IV1: Existing AWS budgets and billing alarms remain active
- IV2: Cost allocation tags don't interfere with existing resource tagging
- IV3: Billing reports include both existing and new resources correctly

---

