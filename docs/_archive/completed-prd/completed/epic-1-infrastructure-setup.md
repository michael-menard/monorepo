# Epic 1: Infrastructure Setup

**PRD Reference:** [10-implementation-phases.md](./image-service-migration/10-implementation-phases.md#phase-1-infrastructure-setup-week-1)
**Duration:** Week 1
**Team Size:** 2-3 engineers
**Estimated Effort:** 12 hours

---

## Epic Goal

Set up the foundational AWS infrastructure for the Image Service using SST, including DynamoDB, S3, CloudFront, API Gateway, and comprehensive monitoring.

---

## Epic Description

### Context

The Image Service migration requires a completely separate infrastructure stack from the main LEGO API. This epic establishes the foundation by:

- Creating a new SST project structure
- Deploying AWS resources (DynamoDB, S3, CloudFront, API Gateway)
- Configuring monitoring and alarms for production readiness

### Success Criteria

- SST infrastructure deployed to dev environment
- All AWS resources created and verified
- CloudWatch monitoring and alarms configured
- Infrastructure ready for Lambda implementation

---

## Stories

### Story 1.1: SST Project Initialization & TypeScript Configuration

**Description:** Create the SST project structure, configure TypeScript, set up pnpm workspaces, and initialize Git repository.

**Acceptance Criteria:**

1. SST project created in `apps/api/image-service/`
2. `package.json` configured with required dependencies (sst, aws-cdk-lib, constructs)
3. `tsconfig.json` configured for TypeScript compilation
4. `sst.config.ts` scaffolded
5. Git repository initialized with initial commit
6. Project builds successfully (`pnpm build` completes)

**Estimated Time:** 2 hours

**Tasks:**

- Create project directory structure
- Initialize pnpm workspace
- Install SST and TypeScript dependencies
- Configure TypeScript compiler options
- Create initial sst.config.ts
- Initialize Git and create first commit

---

### Story 1.2: SST Infrastructure Stack Implementation

**Description:** Implement the complete ImageServiceStack with DynamoDB table, S3 bucket with lifecycle policies, CloudFront distribution, and API Gateway HTTP API.

**Acceptance Criteria:**

1. `ImageServiceStack.ts` created in `stacks/` directory
2. DynamoDB table configured with:
   - Primary key: PK (partition), SK (sort)
   - GSI: UserIndex (userId, createdAt)
   - On-demand billing mode
3. S3 bucket configured with:
   - Lifecycle policies (Intelligent-Tiering after 30 days)
   - CORS configuration for uploads
   - Versioning enabled
4. CloudFront distribution configured with:
   - S3 origin
   - Cache behavior optimized for images
   - Custom domain (images.lego-api.com)
5. API Gateway HTTP API configured with JWT authorizer
6. TypeScript compiles without errors
7. Stack validates successfully

**Estimated Time:** 4 hours

**Reference Documents:**

- [01-architecture.md](./image-service-migration/01-architecture.md) - Architecture overview
- [02-data-model.md](./image-service-migration/02-data-model.md) - DynamoDB schema
- [04-infrastructure.md](./image-service-migration/04-infrastructure.md) - SST configuration details

---

### Story 1.3: Deploy Infrastructure to Dev Environment

**Description:** Deploy the SST stack to the dev environment, verify all AWS resources are created correctly, and validate API Gateway endpoints.

**Acceptance Criteria:**

1. AWS credentials configured for lego-moc profile
2. SST stack deployed successfully to dev stage
3. DynamoDB table `ImageMetadata-dev` exists and accessible
4. S3 bucket `images-lego-moc-dev` created
5. CloudFront distribution created and accessible
6. API Gateway created with endpoints
7. All SST outputs printed (API endpoint, bucket name, CloudFront URL)
8. Manual verification of resources via AWS CLI succeeds
9. API Gateway returns 404 (expected - no Lambda handlers yet)

**Estimated Time:** 2 hours

**Deployment Commands:**

```bash
export AWS_PROFILE=lego-moc
pnpm sst deploy --stage dev
```

**Verification Commands:**

```bash
aws dynamodb describe-table --table-name ImageMetadata-dev
aws s3 ls s3://images-lego-moc-dev
aws cloudfront list-distributions
```

---

### Story 1.4: CloudWatch Monitoring & Alarms Setup

**Description:** Configure comprehensive CloudWatch dashboard and alarms for monitoring Image Service health, performance, and errors.

**Acceptance Criteria:**

1. CloudWatch dashboard created with widgets for:
   - Lambda invocations, errors, duration
   - DynamoDB read/write capacity, throttles
   - S3 upload/download metrics
   - CloudFront requests, cache hit rate
   - API Gateway 4xx/5xx errors
2. CloudWatch alarms configured for:
   - Lambda error rate >1%
   - Lambda P95 duration >1000ms
   - DynamoDB throttling >0
   - S3 5xx errors >5/hour
   - API Gateway 5xx errors >10/hour
3. SNS topic created for alarm notifications
4. Test alarm triggering verified
5. Dashboard accessible via AWS Console
6. All alarms in "OK" state (no active alerts)

**Estimated Time:** 4 hours

**Reference Documents:**

- [09-monitoring.md](./image-service-migration/09-monitoring.md) - Full dashboard and alarm specifications

---

## Dependencies

**External Dependencies:**

- AWS account access with appropriate IAM permissions
- AWS CLI configured locally
- pnpm installed and configured

**Internal Dependencies:**

- None (first epic in sequence)

---

## Technical Notes

### Architecture Reference

See [01-architecture.md](./image-service-migration/01-architecture.md) for high-level architecture diagrams and component relationships.

### Infrastructure Details

See [04-infrastructure.md](./image-service-migration/04-infrastructure.md) for complete SST stack implementation code and configuration.

### Security Considerations

- All resources deployed in VPC where applicable
- IAM roles follow least-privilege principle
- S3 bucket has encryption at rest enabled
- CloudFront uses HTTPS only

---

## Definition of Done

- [ ] All 4 stories completed with acceptance criteria met
- [ ] Infrastructure deployed to dev environment
- [ ] All AWS resources verified via AWS Console and CLI
- [ ] CloudWatch dashboard shows metrics flowing
- [ ] All alarms configured and tested
- [ ] No TypeScript compilation errors
- [ ] Infrastructure code reviewed and merged
- [ ] Ready for Lambda implementation (Epic 2)

---

## Risks & Mitigations

| Risk                                              | Likelihood | Impact | Mitigation                                                 |
| ------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------- |
| AWS service limits exceeded                       | Low        | High   | Pre-check service quotas, request increases if needed      |
| CloudFront distribution takes 15-30 min to deploy | High       | Low    | Plan deployment timing, can proceed with other tasks       |
| SST deployment fails                              | Medium     | Medium | Test in isolated AWS account first, maintain rollback plan |
| Cost overruns during dev                          | Low        | Medium | Set billing alarms, use on-demand pricing                  |

---

**Next Epic:** [Epic 2: Lambda Implementation](./epic-2-lambda-implementation.md)
