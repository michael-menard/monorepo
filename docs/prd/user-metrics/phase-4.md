# User Tracking & Metrics Implementation - Phase 4

Part of the User Metrics PRD brownfield enhancement.

See [user-metrics-prd.md](./user-metrics-prd.md) for complete context.

---

### PHASE 4: Self-Hosted Analytics Tools

### Story 4.1: Umami Deployment on ECS/Fargate

**As a** DevOps Engineer,
**I want** Umami analytics deployed on ECS/Fargate with Aurora database,
**so that** the Product team can access privacy-focused web analytics.

**Acceptance Criteria:**
1. Umami Docker image configured and tested locally
2. ECS task definition created for Umami (0.25-0.5 vCPU, 512MB-1GB RAM)
3. ECS service deployed in private subnet with ALB (or direct service discovery)
4. Environment variables configured (database connection, encryption keys)
5. Umami web UI accessible and initial admin account created
6. Health checks configured and ECS service auto-recovery validated

**Integration Verification:**
- IV1: Aurora database performance unaffected by Umami connections
- IV2: ECS deployment doesn't interfere with existing application infrastructure
- IV3: Network connectivity from frontend (CloudFront) to Umami tracking endpoint works

---

### Story 4.2: OpenReplay Deployment on ECS/Fargate

**As a** DevOps Engineer,
**I want** OpenReplay deployed on ECS/Fargate with S3 storage,
**so that** Customer Service can replay user sessions for troubleshooting.

**Acceptance Criteria:**
1. OpenReplay Docker containers configured (multiple services: backend, storage, etc.)
2. ECS task definitions created for OpenReplay services (0.5-1 vCPU, 1-2GB RAM)
3. ECS services deployed with appropriate networking and load balancing
4. S3 bucket integration configured for session storage
5. OpenReplay web UI accessible and initial admin account created
6. Session recording backend validated with test recording

**Integration Verification:**
- IV1: S3 bucket permissions scoped correctly (no access to application buckets)
- IV2: ECS resources within VPC limits and quotas
- IV3: Network traffic from frontend to OpenReplay backend validated

---

### Story 4.3: Frontend Tracking Script Integration (Umami + OpenReplay)

**As a** Frontend Developer,
**I want** Umami and OpenReplay tracking scripts integrated into the React app,
**so that** user sessions and analytics are captured from production traffic.

**Acceptance Criteria:**
1. OpenReplay SDK installed via npm (`@openreplay/tracker`)
2. Umami tracking script integration configured (script tag or npm package)
3. Tracking initialization module created in `src/lib/tracking/` directory
4. Initialization happens in `main.tsx` before React render, asynchronously
5. Environment detection prevents tracking in development mode (optional based on preference)
6. Session recording and analytics events verified in respective UIs

**Integration Verification:**
- IV1: Vite HMR works correctly in development with tracking code present
- IV2: Production build succeeds and application loads without errors
- IV3: Tracking scripts don't block React render or impact initial page load

---

### Story 4.4: PII Masking Configuration and Validation

**As a** Privacy Officer,
**I want** comprehensive PII masking configured in OpenReplay session recordings,
**so that** sensitive user data is never captured or stored.

**Acceptance Criteria:**
1. OpenReplay sanitization rules configured for: email fields, name fields, payment info, password inputs, SSN, phone numbers
2. CSS selectors and input name patterns defined for PII fields
3. Automated tests created to verify PII masking (test forms with fake PII data)
4. Manual audit of 10+ test sessions confirms no PII visible in recordings
5. Masking configuration documented in runbook
6. PII masking rules versioned in source control

**Integration Verification:**
- IV1: Non-PII form fields still recorded correctly (debugging remains useful)
- IV2: Session replay usability maintained despite masking
- IV3: Application form validation and submission unaffected by tracking

---

### Story 4.5: End-to-End Testing and Documentation

**As a** Project Owner,
**I want** comprehensive end-to-end validation and documentation completed,
**so that** the observability stack is production-ready and maintainable.

**Acceptance Criteria:**
1. End-to-end smoke test suite created validating data flow: Frontend → OpenReplay/Umami → Grafana dashboards
2. All 18 previous story acceptance criteria re-validated in integrated environment
3. Runbook created covering: deployment, rollback, troubleshooting, common issues
4. Dashboard documentation created explaining each Grafana panel and its purpose
5. Team training materials prepared (quick start guides for Product, Engineering, CS)
6. Launch checklist completed confirming all success criteria from project brief met

**Integration Verification:**
- IV1: Complete application regression test suite passes with all tracking enabled
- IV2: Performance benchmarks meet targets (100% session capture, <50ms overhead, budget within limits)
- IV3: Existing functionality unaffected - application works identically to pre-instrumentation state

