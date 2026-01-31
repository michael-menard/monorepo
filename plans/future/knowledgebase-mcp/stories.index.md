---
doc_type: stories_index
title: "KNOW Stories Index"
status: active
story_prefix: "KNOW"
created_at: "2026-01-24T23:55:00Z"
updated_at: "2026-01-25T14:00:00Z"
---

# KNOW Stories Index

A focused knowledge base MCP server for capturing and retrieving institutional knowledge.

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 9 |
| uat | 3 |
| ready-for-qa | 2 |
| ready-to-work | 0 |
| elaboration | 0 |
| backlog | 9 |
| cancelled | 1 |

**Goal:** Get to a working, usable KB. Then iterate based on real experience.

**Archived:** 35 stories moved to `stories-future.index.md` - premature optimizations and scope creep.

---

## What's Next

**Immediate:** QA and ship KNOW-006 and KNOW-007. Then you have a working KB.

**After that:** Use it for 2-3 real stories. Then decide what's missing.

---

## User Acceptance Testing (UAT)

### KNOW-016: PostgreSQL Monitoring

**Status:** uat
**Depends On:** KNOW-001
**Feature:** CloudWatch dashboards, alarms, SNS alerts for PostgreSQL monitoring with disk space and no-data monitoring

**Why it matters:** Production deployment requires comprehensive observability to enable proactive incident management. Prevents silent service degradation from connection exhaustion, high CPU, disk space issues, or monitoring pipeline failures.

**Story Document:** plans/future/knowledgebase-mcp/UAT/KNOW-016/KNOW-016.md

**Implementation Summary:**
- 10 Terraform files in `infra/monitoring/`
- 7-widget CloudWatch dashboard
- 6 CloudWatch alarms (connections, CPU, memory, latency, disk, no-data)
- SNS topic with email subscription support
- Comprehensive runbook documentation in README
- Multi-environment support (staging/production)

**Code Review:** PASS (iteration 1) - All 6 workers passed, no blocking issues

**QA Verification:** PASS - All 13 acceptance criteria verified

---

### KNOW-018: Audit Logging

**Status:** uat
**Depends On:** KNOW-003
**Feature:** Comprehensive audit logging for kb_add, kb_update, kb_delete operations with retention policy

**Why it matters:** Compliance, debugging, and operational transparency require audit trails. Tracks who changed what and when.

**Story Document:** plans/future/knowledgebase-mcp/UAT/KNOW-018/KNOW-018.md

**Verification Result:** PASS - All 15 ACs verified, 30/30 tests pass with 96.37% coverage

---

## Ready for QA

### KNOW-006: Parsers and Seeding

**Status:** ready-for-qa
**Feature:** Parsers for YAML/markdown, seed script, kb_bulk_import tool

**Why it matters:** Without this, you can't import your existing knowledge.

**Story Document:** plans/future/knowledgebase-mcp/ready-for-qa/KNOW-006/KNOW-006.md

---

### KNOW-007: Admin Tools and Polish

**Status:** ready-for-qa
**Depends On:** KNOW-006
**Feature:** kb_rebuild_embeddings, comprehensive logging, performance testing

**Why it matters:** Lets you rebuild embeddings when models change, plus production polish.

---

## Cancelled Stories

### KNOW-017: Data Encryption (CANCELLED)

**Status:** cancelled
**Depends On:** KNOW-001
**Feature:** RDS encryption at rest with AWS KMS key management, operational procedures, and verification
**Cancelled Date:** 2026-01-31
**Cancellation Reason:** Infrastructure change - project uses local Docker PostgreSQL, not AWS RDS. Aligns with cancellation rationale of KNOW-016 (PostgreSQL Monitoring).

**Why it was planned:** Protects sensitive institutional knowledge stored in Knowledge Base PostgreSQL from unauthorized access in case of physical media compromise. Required for security and compliance in AWS RDS deployment scenario.

**Story Document:** plans/future/knowledgebase-mcp/elaboration/KNOW-017/KNOW-017.md

**Future Consideration:** If AWS RDS deployment is planned in future, revisit after creating prerequisite infrastructure stories for AWS migration and RDS provisioning.

---

## Backlog (Do After Using the KB)

### KNOW-048: Document Chunking (Learning Story)

**Status:** backlog
**Priority:** P2 (learning opportunity)
**Depends On:** KNOW-006
**Feature:** Split long documents into chunks before importing to KB

**Why it matters:** Enables ingestion of long-form content (READMEs, guides, design docs). Also a learning opportunity for RAG chunking patterns.

**Scope (MVP):**
- Markdown-aware splitting on `##` headers
- Token-limited fallback (max 500 tokens per chunk)
- Metadata: source file, chunk index, total chunks
- CLI: `pnpm kb:chunk path/to/doc.md` → outputs JSON array
- Integration with `kb_bulk_import`

**Non-Goals (avoid over-engineering):**
- No overlap/sliding window (add later if retrieval quality suffers)
- No hierarchical parent-child retrieval
- No DOCX/HTML/PDF support (markdown only)
- No semantic boundary detection (just headers + token limit)

**Acceptance Criteria:**
1. `chunkMarkdown(content, maxTokens)` returns `ChunkedDocument[]`
2. Splits on `##` headers, keeps header as context
3. Falls back to token limit if section too long
4. Preserves code blocks (don't split mid-block)
5. CLI outputs JSON to stdout
6. Integration test: chunk → bulk_import → search returns chunk
7. 80% test coverage

**Story Points:** 3

**When to do:** After KNOW-006 passes QA and you've done a basic import. Then try importing a long doc and see if chunking helps retrieval.

---

### KNOW-040: Agent Instruction Integration

**Status:** backlog
**Feature:** Add KB search instructions to agent files

**Why it matters:** Makes agents automatically query the KB before tasks.

**When to do:** After you've manually used the KB for a few stories and understand the query patterns that work.

---

### KNOW-043: Lessons Learned Migration
### KNOW-043: Lessons Learned Migration


**Status:** backlog
**Status:** backlog
**Depends On:** KNOW-006
**Depends On:** KNOW-006
**Feature:** Migrate LESSONS-LEARNED.md to KB, transition agents to write to KB
**Feature:** Migrate LESSONS-LEARNED.md to KB, transition agents to write to KB


**Why it matters:** Makes the KB the canonical source of institutional knowledge.
**Why it matters:** Makes the KB the canonical source of institutional knowledge.


**When to do:** After KNOW-040, when you're confident the KB is useful.
**When to do:** After KNOW-040, when you're confident the KB is useful.


---

### KNOW-068: CloudWatch Anomaly Detection

**Status:** backlog
**Depends On:** KNOW-016
**Follow-up From:** KNOW-016 (QA Enhancement Opportunity #2)
**Priority:** P2 (operational improvement)
**Feature:** CloudWatch anomaly detection for PostgreSQL metrics with ML-based adaptive alerting

**Why it matters:** Eliminates manual threshold tuning by automatically learning normal patterns and alerting on deviations. Reduces operational burden and improves alert accuracy by adapting to changing usage patterns.

**Scope (MVP):**
- Enable anomaly detection on 4 key metrics: DatabaseConnections, CPUUtilization, ReadLatency, WriteLatency
- Add anomaly detection bands to CloudWatch dashboard for visual anomaly identification
- Create 4 anomaly-based alarms that coexist with static threshold alarms from KNOW-016
- Use CloudWatch default sensitivity (2 standard deviations) with tuning plan
- Wait 2-4 weeks after KNOW-016 production deployment for baseline data collection

**Non-Goals (avoid over-engineering):**
- No custom ML models (use CloudWatch built-in only)
- No anomaly detection for all metrics (focus on high-value metrics only)
- No replacing static threshold alarms (anomaly detection is additive)
- No real-time sub-minute anomaly detection (use 5-minute evaluation periods)
- No multi-metric composite anomaly detection (per-metric only)

**Acceptance Criteria:**
1. Dashboard updated with anomaly bands on 4 metrics
2. Anomaly detection models trained with 2+ weeks baseline data
3. 4 anomaly-based alarms created (connections, CPU, read latency, write latency)
4. Anomaly alarm test completed with notification delivery
5. Dual alarm strategy documented (static + anomaly)
6. False positive tuning plan documented (monitor 1 week, adjust if >3/week)
7. IaC includes anomaly detectors and alarms
8. Cost estimate: ~$2/month incremental cost

**Story Points:** 3

**CRITICAL:** Must wait 2-4 weeks after KNOW-016 deploys to production for baseline data collection. Deploying too early results in poor model accuracy and excessive false positives.

**When to do:** After KNOW-016 has been in production for 2-4 weeks and metrics show continuous data without significant gaps.

**Story Document:** plans/future/knowledgebase-mcp/backlog/KNOW-068/KNOW-068.md

**Source:** QA Discovery Notes from KNOW-016 (Enhancement Opportunity #2)

---

### KNOW-078: Composite Alarms for Database Health

**Status:** backlog
**Depends On:** KNOW-016
**Follow-up From:** KNOW-016 (QA Enhancement Opportunity #3)
**Priority:** P2 (operational improvement)
**Feature:** CloudWatch composite alarms to reduce alert noise and provide clearer database health states

**Why it matters:** Combines multiple metrics into single "database health" composite alarm that triggers only when multiple conditions indicate actual problems (e.g., high CPU + high connections + elevated latency = true degradation vs. just high CPU = normal batch job). Reduces alert fatigue and improves operational clarity.

**Scope:**
- Define database health states (Healthy, Degraded, Critical)
- Create composite alarms combining multiple metric alarms from KNOW-016
- Configure SNS routing (reuse existing topic or create severity-based topics)
- Update runbooks to focus on composite health states
- Document when to respond to individual vs composite alarms

**Story Points:** 2

**Story Document:** plans/future/knowledgebase-mcp/backlog/KNOW-078/KNOW-078.md

---

### KNOW-088: Dashboard Templates for Reusability

**Status:** backlog
**Depends On:** KNOW-016
**Follow-up From:** KNOW-016 (QA Enhancement Opportunity #5)
**Priority:** P3 (technical debt reduction)
**Story Points:** 2
**Feature:** Extract CloudWatch dashboard JSON into reusable parameterized template. Enable consistent monitoring dashboards across environments and databases with environment-specific variables (RDS instance ID, SNS topic ARN, alarm thresholds). Reduces duplication and ensures consistency.

**Why it matters:** As the monorepo scales to multiple environments, maintaining separate dashboard configurations becomes error-prone. Template-based approach enables consistent monitoring infrastructure with minimal duplication and maintenance burden.

**Scope:**
- Extract dashboard JSON from KNOW-016 into parameterized template
- Support environment-specific variables (RDS instance ID, SNS topic ARN, alarm thresholds)
- Provide template rendering mechanism (bash script or Terraform templatefile)
- Update IaC to use templates instead of static JSON
- Document template usage and new environment setup

**Non-Goals:**
- No multi-region dashboard consolidation
- No custom metric templates (RDS metrics only)
- No Grafana/Prometheus migration
- No dashboard versioning system

**Story Document:** plans/future/knowledgebase-mcp/backlog/KNOW-088/KNOW-088.md

**When to do:** After KNOW-016 is deployed to both staging and production. Reduces technical debt and improves operational consistency.

---

### KNOW-058: Connection Pool Metrics Monitoring

**Status:** backlog
**Depends On:** KNOW-016
**Follow-up From:** KNOW-016 (QA Gap #3)
**Priority:** P2 (operational improvement)
**Story Points:** 2
**Feature:** Add connection pool metrics to PostgreSQL monitoring. Evaluate RDS Enhanced Monitoring for pool-level metrics (idle connections, pool exhaustion, connection wait time). If available, add to dashboard and create alarms for pool health.

**Why it matters:** Connection pool health is critical for detecting connection leaks, pool exhaustion, and inefficient pool sizing before they impact service availability. Early warning signals enable proactive incident management.

**Scope:**
- Evaluate RDS Enhanced Monitoring for connection pool metric availability
- Extend CloudWatch dashboard (from KNOW-016) with pool metrics widgets
- Create alarms for pool utilization (90%), excessive idle connections (>50%), and connection wait time
- Update runbook with pool health troubleshooting procedures

**Non-Goals:**
- No application-level instrumentation (RDS metrics only)
- No connection pool library changes
- No auto-remediation (alerts only)

**Story Document:** plans/future/knowledgebase-mcp/backlog/KNOW-058/KNOW-058.md

**When to do:** After KNOW-016 is deployed and baseline monitoring is stable. Operational improvement, not critical for MVP.

---

### KNOW-098: CloudWatch Logs Integration

**Status:** backlog
**Depends On:** KNOW-016
**Follow-up From:** KNOW-016 (QA Enhancement Opportunity #1)
**Priority:** P2 (operational improvement)
**Story Points:** 3
**Feature:** Set up CloudWatch Logs for PostgreSQL log aggregation and integrate with CloudWatch Insights for query analysis

**Why it matters:** Enables analysis of slow queries, error patterns, and connection issues from database logs. Provides forensic analysis capabilities that complement metrics-based monitoring from KNOW-016. Critical for root cause analysis during incidents.

**Scope:**
- RDS PostgreSQL log export to CloudWatch Logs
- CloudWatch Insights query library for common analysis patterns (slow queries, connection errors, deadlocks)
- Log retention and archival policies (30 days operational logs)
- Integration with existing monitoring infrastructure (KNOW-016)
- Documentation for log analysis workflows and query patterns

**Non-Goals:**
- Custom application logging (PostgreSQL logs only)
- Real-time log streaming (CloudWatch Logs batching acceptable)
- Log-based alerting (metrics handle alerting)
- Third-party log aggregation (CloudWatch native tools only)

**Story Document:** plans/future/knowledgebase-mcp/backlog/KNOW-098/KNOW-098.md

**When to do:** After KNOW-016 is deployed and baseline monitoring is stable. Complements metrics with log-based forensics for incident investigation.

---

### KNOW-108: Cost Attribution Tags

**Status:** backlog
**Depends On:** KNOW-016
**Follow-up From:** KNOW-016 (QA Enhancement #7)
**Priority:** P3 (operational improvement)
**Story Points:** 1
**Feature:** Add resource tags (project, environment, service, cost-center) to CloudWatch monitoring infrastructure IaC for cost tracking and attribution. Enables AWS Cost Explorer analysis of monitoring costs separate from application costs.

**Why it matters:** Enables cost tracking, attribution analysis, and chargeback support for monitoring infrastructure. Separates monitoring costs from application costs in AWS Cost Explorer, supports multi-environment cost comparison, and establishes reusable tagging pattern for future AWS resources.

**Scope:**
- Add standardized tags to CloudWatch dashboards, alarms, and SNS topics from KNOW-016
- Update IaC (Terraform/CDK/CloudFormation) with tags configuration
- Document tag schema, Cost Explorer usage, and validation procedures
- Test tag-based filtering in AWS Cost Explorer (requires 24-hour wait for Cost Allocation Tags activation)

**Non-Goals:**
- No application resource tagging (RDS, Lambda out of scope)
- No custom cost allocation reports (Cost Explorer sufficient)
- No tag-based IAM policies
- No budget alerts or cost thresholds

**Story Document:** plans/future/knowledgebase-mcp/backlog/KNOW-108/KNOW-108.md

**When to do:** During or after KNOW-016 deployment. Low-effort operational improvement that establishes tagging pattern for future infrastructure.

---

## Completed

### KNOW-001: Package Infrastructure Setup ✓

Database schema, Docker setup, test configuration.

---

### KNOW-002: Embedding Client Implementation ✓

OpenAI embedding client with caching, retry logic, batch processing.

---

### KNOW-003: Core CRUD Operations ✓

kb_add, kb_get, kb_update, kb_delete, kb_list with deduplication.

---

### KNOW-004: Search Implementation ✓

Semantic search (pgvector), keyword search (FTS), hybrid search with RRF.

---

### KNOW-0051: MCP Server Foundation + CRUD Tools ✓

MCP server setup, 5 CRUD tools, error handling, logging.

---

### KNOW-0052: MCP Search Tools + Deployment Topology ✓

kb_search, kb_get_related tools, performance logging, deployment docs.

---

### KNOW-0053: MCP Admin Tool Stubs ✓

kb_stats, kb_health, stubs for bulk_import and rebuild_embeddings.

---

### KNOW-015: Disaster Recovery ✓

Backup/restore procedures, RTO/RPO targets, runbooks.

---

### KNOW-028: Environment Variable Documentation ✓

.env.example, Zod-based startup validation, git protection.

---

### KNOW-039: MCP Registration and Claude Integration ✓

Setup guide, config generator, connection validator.

---

## Archived Stories

35 stories have been moved to `stories-future.index.md`. These include:

- **Production hardening** (auth, rate limiting, encryption) - not needed for local dev
- **Performance optimization** (quantization, reranking) - premature for 50 entries
- **Analytics & dashboards** - no users to analyze yet
- **Advanced document processing** - your content is already simple
- **Scope creep** (story management database, user flows) - separate projects

Revisit after using the KB for 5-10 real stories.

---

## Quick Reference

```
# Start the KB
cd apps/api/knowledge-base
docker-compose up -d
pnpm dev

# Register with Claude
pnpm kb:generate-config
pnpm kb:validate-connection

# Import seed data (after KNOW-006)
pnpm kb:seed

# Use it
kb_search({ query: "drizzle migration patterns", limit: 5 })
kb_add({ content: "...", tags: ["pattern"], role: "dev" })
```
