---
doc_type: stories_index
title: "KNOW Stories Index"
status: active
story_prefix: "KNOW"
created_at: "2026-01-24T23:55:00Z"
updated_at: "2026-01-24T23:55:00Z"
---

# KNOW Stories Index

All stories in this epic use the `KNOW-XXX` naming convention (starting at 001).

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 6 |
| ready-for-code-review | 0 |
| in-elaboration | 2 |
| generated | 1 |
| in-progress | 0 |
| pending | 20 |
| deferred | 1 |
| superseded | 1 |

**Last Updated:** 2026-01-25 (KNOW-015 completed QA verification)

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Feature | Blocked By |
|-------|---------|------------|
| (No stories ready - all pending stories need elaboration first) | | |

---

## KNOW-001: Package Infrastructure Setup

**Status:** completed
**Depends On:** none
**Feature:** Create package structure, database schema, Docker setup, and test configuration
**Endpoints:** —
**Infrastructure:**
- Docker Compose with pgvector/pgvector:0.5.1-pg16
- PostgreSQL with pgvector extension
- Vitest configuration

**Goal:** Establish the foundational package structure and database infrastructure for the knowledge base MCP server
**Proof Document:** PROOF-KNOW-001.md

**Risk Notes:** pgvector compatibility and Docker setup may require version-specific configuration

**Findings Applied:**
- SEC-003: Enable SSL/TLS for PostgreSQL connections; configure RDS with encryption in transit and at rest
- PLAT-002: Document connection pooling configuration (max connections, idle timeout); define read replica strategy; add connection pool monitoring
- PLAT-004: Define SLOs (99.9% uptime target); set up CloudWatch alerts for KB unavailability
- PLAT-006: Test IVFFlat index with realistic dataset (1k-10k entries); benchmark different lists parameters

---

## KNOW-002: Embedding Client Implementation

**Status:** completed
**Depends On:** none
**Feature:** Build OpenAI embedding client with text-embedding-3-small, content-hash caching, retry logic, and batch processing
**Endpoints:** —
**Infrastructure:**
- OpenAI API integration
- embedding_cache table in PostgreSQL

**Goal:** Provide reliable embedding generation with caching to minimize API calls and costs

**Proof Document:** PROOF-KNOW-002.md

**Test Coverage:** 116+ test cases across 4 test files (1860+ lines), >80% coverage target

**Status Update:** Fixed missing test coverage (0% → 80% target). Implementation complete with comprehensive test suite. Ready for code review and test execution with database.

**Risk Notes:** OpenAI API rate limits and transient failures require robust retry logic; batch processing complexity

**Findings Applied:**
- SEC-002: Migrate to AWS Secrets Manager or HashiCorp Vault for OpenAI API key; implement key rotation policy (30-day cycle); audit all environment variable usage
- PLAT-001: Implement OpenAI API call budgeting per story; set up CloudWatch alerts for cost thresholds; track embedding costs and search query volumes
- ENG-001: Implement queue/semaphore pattern for concurrent batches; add retry logic with exponential backoff; document batch processing architecture
- ENG-002: Document cache invalidation scenarios (model upgrade, content changes, manual flush); add cache versioning strategy

---

## KNOW-003: Core CRUD Operations

**Status:** completed
**Depends On:** none
**Feature:** Implement kb_add, kb_get, kb_update, kb_delete, and kb_list with deduplication and validation
**Endpoints:** —
**Infrastructure:** —

**Goal:** Enable basic create, read, update, delete, and list operations for knowledge entries

**Story Document:** plans/future/knowledgebase-mcp/UAT/KNOW-003/KNOW-003.md

**Proof Document:** plans/future/knowledgebase-mcp/UAT/KNOW-003/PROOF-KNOW-003.md

**QA Verification:** PASS - All 10 ACs verified, 65 unit tests passing (93.94% coverage), architecture compliant

**Risk Notes:** Deduplication logic must be reliable; content_hash collisions (unlikely but possible); re-embedding on update requires careful coordination

**Findings Applied:**
- SEC-006: Implement per-agent query rate limiting (100 searches/minute); add rate limit headers to responses; monitor rate limit violations

---

## KNOW-004: Search Implementation

**Status:** completed
**Depends On:** KNOW-003
**Feature:** Build semantic search (pgvector cosine), keyword search (PostgreSQL FTS), hybrid search with RRF, kb_get_related, and fallback mechanisms
**Endpoints:** —
**Infrastructure:** —

**Goal:** Provide fast, relevant search across knowledge entries using hybrid semantic and keyword approaches

**Story Document:** plans/future/knowledgebase-mcp/UAT/KNOW-004/KNOW-004.md

**Proof Document:** plans/future/knowledgebase-mcp/UAT/KNOW-004/PROOF-KNOW-004.md

**QA Verification:** PASS - All 10 ACs verified, 91 unit tests passing (100% pass rate), hybrid RRF search implementation complete with pgvector semantic + keyword FTS, graceful OpenAI API fallback, comprehensive test coverage, architecture compliant

**Risk Notes:** RRF algorithm tuning (0.7 semantic, 0.3 keyword weights may need adjustment); performance at scale; fallback behavior must be transparent

**Findings Applied:**
- UX-002: Design human-readable JSON response format; add field descriptions and semantic metadata; document response schema
- UX-003: Plan future feedback loop for result relevance rating; document as enhancement for post-MVP iteration
- UX-004: Include fallback_mode flag in search responses; document fallback behavior in agent instructions
- SEC-005: Sanitize error responses to agents; log full errors server-side only
- QA-004: Create test fixtures with known relevant/irrelevant entries; document expected ranking for test queries; add relevance testing

---

## KNOW-005: MCP Server Setup

**Status:** In Elaboration
**Depends On:** none
**Feature:** Configure MCP server using @modelcontextprotocol/sdk, register all 10 tools with schemas, implement handlers, integrate @repo/logger
**Endpoints:** —
**Infrastructure:**
- MCP Server registration in ~/.claude/mcp.json

**Goal:** Expose all knowledge base functionality as MCP tools accessible to Claude Code

**Risk Notes:** MCP SDK integration patterns; Claude Code spawning and communication; error handling across MCP boundary

**Findings Applied:**
- SEC-001: Implement role-based access control for MCP tools before production deployment; design pm/dev/qa role filters for kb_search tool; document access control matrix
- PLAT-003: Document MCP server deployment topology (embedded vs separate service); clarify how Claude Code spawns and manages MCP server lifecycle; add deployment architecture diagram
- ENG-004: Add integration tests for MCP spawning errors; test tool invocation failure scenarios
- SEC-006: Implement per-agent query rate limiting; add rate limit headers; monitor rate limit violations
- UX-001: Document kb_search usage examples in agent instructions template; create sample queries for common scenarios
- QA-002: Create integration test harness that simulates Claude Code MCP client; mock MCP protocol requests/responses
- PLAT-004: Set up CloudWatch alerts for KB unavailability

---

## KNOW-006: Parsers and Seeding

**Status:** pending
**Depends On:** KNOW-005
**Feature:** Build parsers for LESSONS-LEARNED.md and templates, create seed script for YAML import, implement kb_bulk_import and kb_stats tools
**Endpoints:** —
**Infrastructure:** —

**Goal:** Import existing knowledge from markdown files and templates into the knowledge base

**Risk Notes:** Markdown parsing complexity; maintaining YAML structure; handling malformed source files; bulk import performance

**Findings Applied:**
- PROD-003: Document tagging standards (pm/dev/qa roles); add tag validation to seed scripts; include in seed documentation
- SEC-004: Implement strict YAML parsing with schema allowlist; reject unexpected fields and nested structures; add validation tests

---

## KNOW-007: Admin Tools and Polish

**Status:** pending
**Depends On:** KNOW-006
**Feature:** Implement kb_rebuild_embeddings, comprehensive logging, performance testing, and documentation
**Endpoints:** —
**Infrastructure:** —

**Goal:** Provide administrative capabilities and production-ready quality

**Risk Notes:** Performance at scale (1000+ entries); rebuild time and cost implications; comprehensive test coverage

**Findings Applied:**
- ENG-002: Document cache invalidation scenarios; add cache versioning strategy; include invalidation procedures
- ENG-003: Include pgvector index tuning in performance tests; validate lists=100 parameter with realistic dataset; add performance testing
- QA-001: Add test cases for cache corruption scenarios; test model upgrade invalidation; test manual invalidation procedures
- QA-005: Add stress test scenarios (API delays, connection timeouts); test concurrent query load; add performance suite

---

## KNOW-008: Workflow Integration

**Status:** pending
**Depends On:** KNOW-007
**Feature:** Migrate LESSONS-LEARNED.md content, modify learnings agent to write to KB, create LEARNINGS.yaml output, add kb_search to setup leader agents, implement sync recovery script
**Endpoints:** —
**Infrastructure:** —

**Goal:** Integrate knowledge base into the story lifecycle for automatic learnings capture and context retrieval

**Risk Notes:** Agent file modifications require careful testing; graceful degradation must work reliably; migration of existing content without data loss; potential workflow disruption during transition

**Findings Applied:**
- PROD-001: Plan phased migration with parallel LESSONS-LEARNED.md and KB writes; define validation period (2-3 sprints) before full cutover; document rollback procedures
- PROD-002: Create change management plan for agent file updates; validate kb_search integration with 2-3 pilot stories; document agent instruction templates for kb_search usage
- PLAT-005: Plan feature flag strategy for kb_search in agent files; define rollback procedures
- QA-003: Create test suite for agent file modifications; test with pilot stories before full rollout; validate existing agent lifecycle unchanged

---

## KNOW-009: MCP Tool Authorization

**Status:** pending
**Priority:** P0
**Depends On:** KNOW-005
**Source:** Epic Elaboration - Security Finding (SEC-001)
**Feature:** Implement role-based access control for MCP tools with pm/dev/qa role filters
**Infrastructure:** —

**Goal:** Add authentication and authorization to MCP tools to prevent unauthorized access before production deployment

**Description:** Implement role-based access control for MCP tools, specifically designing pm/dev/qa role filters for kb_search tool. Document access control matrix to ensure only authorized agents can access sensitive operations.

---

## KNOW-010: API Rate Limiting

**Status:** pending
**Priority:** P0
**Depends On:** KNOW-005
**Source:** Epic Elaboration - Security Finding (SEC-006)
**Feature:** Implement per-agent query rate limiting and quota management
**Infrastructure:** —

**Goal:** Protect against DoS attacks and API abuse by implementing rate limiting before production deployment

**Description:** Implement per-agent query rate limiting (100 searches/minute), add rate limit headers to responses, and monitor rate limit violations. Essential for DoS protection in production.

---

## KNOW-011: Secrets Management

**Status:** deferred (post-launch)
**Priority:** P0
**Depends On:** KNOW-001
**Source:** Epic Elaboration - Security Finding (SEC-002)
**Feature:** Migrate to AWS Secrets Manager or HashiCorp Vault for OpenAI API keys and database credentials
**Infrastructure:**
- AWS Secrets Manager or HashiCorp Vault
- Key rotation infrastructure

**Goal:** Implement secure secrets management with rotation policies before production deployment

**Description:** Migrate API keys and database credentials to AWS Secrets Manager or HashiCorp Vault. Implement key rotation policy (30-day cycle) and audit all environment variable usage.

**Story Document:** plans/future/knowledgebase-mcp/elaboration/KNOW-011/KNOW-011.md

**Deferred Reason:** For MVP, using local .env files. AWS Secrets Manager migration deferred to post-launch. See KNOW-028 for MVP environment variable best practices.

---

## KNOW-012: Large-Scale Benchmarking

**Status:** pending
**Priority:** P1
**Depends On:** KNOW-007
**Source:** Epic Elaboration - Engineering Finding (PLAT-001)
**Feature:** Performance benchmarking and scaling tests with 10k+ entries and concurrent agents
**Infrastructure:** —

**Goal:** Validate performance at production scale before deployment

**Description:** Comprehensive performance benchmarking and scaling tests. Test with 10k+ entries and concurrent agent queries to ensure system meets production requirements.

---

## KNOW-013: Feedback Loop

**Status:** pending
**Priority:** P1
**Depends On:** KNOW-008
**Source:** Epic Elaboration - Product Finding (PROD-001)
**Feature:** Implement user feedback mechanism for knowledge base relevance rating
**Infrastructure:** —

**Goal:** Enable quality improvement through user feedback on search result relevance

**Description:** Create feedback loop mechanism for agents to rate search result relevance. Implement relevance rating mechanism and collect data for long-term KB quality improvements.

---

## KNOW-014: Chaos Testing

**Status:** pending
**Priority:** P1
**Depends On:** KNOW-007
**Source:** Epic Elaboration - QA Finding (QA-001)
**Feature:** Chaos testing for API resilience (OpenAI failures, DB unavailable, network partitions)
**Infrastructure:** —

**Goal:** Validate resilience before production deployment

**Description:** Comprehensive chaos testing for API resilience. Test OpenAI API failures, database unavailability, network partitions, and other failure scenarios to ensure graceful degradation.

---

## KNOW-015: Disaster Recovery

**Status:** completed
**Priority:** P1
**Depends On:** KNOW-001
**Source:** Epic Elaboration - Platform Finding (PLAT-002)
**Feature:** Disaster recovery and backup strategy for knowledge base with RTO/RPO targets
**Infrastructure:**
- Automated backup procedures
- Restore testing infrastructure

**Goal:** Implement data protection and recovery procedures before production deployment

**Description:** Implement backup/restore procedures for knowledge base. Document RTO/RPO targets and establish disaster recovery runbooks. Critical for data protection and compliance.

**Story Document:** plans/future/knowledgebase-mcp/UAT/KNOW-015/KNOW-015.md

**Proof Document:** plans/future/knowledgebase-mcp/UAT/KNOW-015/PROOF-KNOW-015.md

**QA Verification:** PASS - All 12 ACs verified, Bash syntax validation complete, comprehensive runbook documentation, security best practices implemented, architecture compliant

---

## KNOW-016: PostgreSQL Monitoring

**Status:** superseded
**Superseded By:** KNOW-016-A, KNOW-016-B
**Priority:** P1
**Depends On:** KNOW-001
**Source:** Epic Elaboration - Platform Finding (PLAT-004)
**Feature:** PostgreSQL monitoring and alerting setup with CloudWatch dashboards
**Infrastructure:**
- CloudWatch dashboards
- Alert policies

**Goal:** Enable proactive incident management through observability

**Description:** Set up CloudWatch dashboards and alerts for PostgreSQL metrics. Define key metrics and thresholds. Essential for proactive incident management in production.

**Story Document:** plans/future/knowledgebase-mcp/elaboration/KNOW-016/KNOW-016.md

**Split Reason:** Story exceeded sizing guidelines with 13 acceptance criteria. Split into Foundation (KNOW-016-A) and Production Readiness (KNOW-016-B) to improve clarity and testability.

---

## KNOW-016-A: PostgreSQL Monitoring - Foundation

**Status:** pending
**Depends On:** KNOW-001
**Split From:** KNOW-016

**Goal:** Implement core monitoring infrastructure setup with CloudWatch dashboard creation, key metrics collection, basic alarm configuration, SNS topic setup, and IaC implementation

### Scope
Core monitoring infrastructure setup:
- CloudWatch dashboard creation with key PostgreSQL metrics
- Key metrics collection validation
- CloudWatch alarms configured for critical thresholds
- SNS topic and subscriptions setup
- Infrastructure-as-Code implementation
- IAM permissions documentation
- Error handling for infrastructure failures

### Acceptance Criteria (from parent)
AC1, AC2, AC3, AC4, AC6, AC9, AC12 (7 ACs)

**Story Document:** plans/future/knowledgebase-mcp/backlog/KNOW-016-A/KNOW-016-A.md

---

## KNOW-016-B: PostgreSQL Monitoring - Production Readiness

**Status:** pending
**Depends On:** KNOW-016-A
**Split From:** KNOW-016

**Goal:** Implement production validation, testing, documentation, runbooks, threshold tuning, and multi-environment support for operational readiness

### Scope
Production validation and operational readiness:
- Alert testing and notification delivery validation
- Threshold documentation with rationale
- Runbook documentation for alert response
- Staging environment validation
- Cost estimation and monitoring
- Multi-environment support (staging/production)

### Acceptance Criteria (from parent)
AC5, AC7, AC8, AC10, AC11, AC13 (6 ACs)

**Story Document:** plans/future/knowledgebase-mcp/backlog/KNOW-016-B/KNOW-016-B.md

---

## KNOW-017: Data Encryption

**Status:** pending
**Priority:** P1
**Depends On:** KNOW-001
**Source:** Epic Elaboration - Security Finding (SEC-003)
**Feature:** Data encryption at-rest for PostgreSQL with encryption key management
**Infrastructure:**
- RDS encryption at rest
- KMS key management

**Goal:** Implement data encryption to meet security and compliance requirements

**Description:** Enable RDS encryption at rest for PostgreSQL. Document encryption key management procedures. Required for compliance and security best practices.

---

## KNOW-018: Audit Logging

**Status:** pending
**Priority:** P1
**Depends On:** KNOW-003
**Source:** Epic Elaboration - Security Finding (SEC-005)
**Feature:** Audit logging for KB modifications with retention policy
**Infrastructure:**
- Audit log storage
- Retention policy infrastructure

**Goal:** Enable compliance and debugging through comprehensive audit trails

**Description:** Implement audit logging to track who changed what and when in the knowledge base. Implement audit log retention policy for compliance and debugging support.

---

## KNOW-019: Query Analytics

**Status:** pending
**Priority:** P2
**Depends On:** KNOW-008
**Source:** Epic Elaboration - Product Finding (PROD-002)
**Feature:** Analytics for knowledge base query patterns and agent usage insights
**Infrastructure:** —

**Goal:** Inform future improvements through usage pattern insights

**Description:** Track query patterns, popular searches, and missing results. Collect analytics to understand agent usage patterns and inform future KB improvements.

---

## KNOW-020: Deduplication Edge Cases

**Status:** pending
**Priority:** P2
**Depends On:** KNOW-007
**Source:** Epic Elaboration - QA Finding (QA-005)
**Feature:** Edge case testing for deduplication (SHA-256 collision simulation)
**Infrastructure:** —

**Goal:** Validate deduplication logic for completeness

**Description:** Test SHA-256 collision scenarios and other edge cases in deduplication logic. Low probability but important for comprehensive quality coverage.

---

## KNOW-021: Cost Optimization

**Status:** pending
**Priority:** P2
**Depends On:** KNOW-002
**Source:** Epic Elaboration - Platform Finding (PLAT-001)
**Feature:** OpenAI API cost optimization (batching effectiveness, cache hit rates validation)
**Infrastructure:** —

**Goal:** Optimize long-term sustainability through cost management

**Description:** Validate batching effectiveness and cache hit rates to optimize OpenAI API costs. Monitor cost trends and identify optimization opportunities.

---

## KNOW-022: GDPR Compliance

**Status:** pending
**Priority:** P2
**Depends On:** KNOW-008
**Source:** Epic Elaboration - Security Finding (SEC-006)
**Feature:** GDPR compliance for knowledge entries with data retention and deletion policies
**Infrastructure:** —

**Goal:** Implement data retention policies for compliance

**Description:** Implement data retention and deletion policies for GDPR compliance. Document procedures and ensure compliance with data privacy regulations.

---

## KNOW-023: Search UI

**Status:** pending
**Priority:** P2
**Depends On:** KNOW-004
**Source:** Epic Elaboration - UX Finding (UX-001)
**Feature:** Search UI for human debugging (optional web dashboard)
**Infrastructure:** —

**Goal:** Improve developer experience through debugging interface

**Description:** Build optional web dashboard for knowledge base browsing and search testing. Enables developers to debug and validate search results manually.

---

## KNOW-024: Management UI

**Status:** pending
**Priority:** P2
**Depends On:** KNOW-008
**Source:** Epic Elaboration - UX Finding (UX-002)
**Feature:** Knowledge base UI for curation and management
**Infrastructure:** —

**Goal:** Improve KB quality through human curation interface

**Description:** Build web interface for editing and curating knowledge base entries. Enables human management and quality improvement of KB content.

---

## KNOW-025: Embedding Vector Compression (Quantization)

**Status:** pending
**Priority:** P2
**Depends On:** KNOW-002
**Follow-up From:** KNOW-002
**Source:** QA Discovery Notes - Enhancement Opportunity #2
**Feature:** Vector quantization (int8 or float16) to reduce storage by 50-75%
**Infrastructure:**
- Updated embedding_cache table with quantized vector type
- pgvector quantization support

**Goal:** Reduce embedding storage footprint by 50-75% through vector quantization while maintaining search quality above 95% relevance threshold

### Scope
Implement vector quantization for embeddings using pgvector's quantization support. Research int8 vs float16 quantization tradeoffs, validate search quality impact, implement zero-downtime migration strategy.

### Source
Follow-up from QA Elaboration of KNOW-002. Enhancement opportunity for significant storage and cost reduction at scale.

---

## KNOW-026: Semantic Deduplication for Near-Duplicate Content

**Status:** pending
**Priority:** P2
**Depends On:** KNOW-002
**Follow-up From:** KNOW-002
**Source:** QA Discovery Notes - Enhancement Opportunity #3
**Feature:** Reuse cached embeddings for semantically similar text (cosine similarity > 0.99)
**Infrastructure:**
- pgvector ANN index for similarity search
- In-memory deduplication state

**Goal:** Reduce OpenAI API calls by 20-40% through semantic deduplication of near-duplicate content while maintaining embedding generation correctness and performance

### Scope
Implement semantic similarity check before generating new embeddings. If similar text exists in cache (similarity > 0.99), reuse existing embedding instead of calling OpenAI API. Add pgvector approximate nearest neighbor (ANN) index for fast similarity search.

### Source
Follow-up from QA Elaboration of KNOW-002. Enhancement opportunity for massive cost savings on near-duplicate content.

---

## KNOW-027: Adaptive Batch Sizing Based on Rate Limit Headers

**Status:** pending
**Priority:** P2
**Depends On:** KNOW-002
**Follow-up From:** KNOW-002
**Source:** QA Discovery Notes - Enhancement Opportunity #4
**Feature:** Dynamic batch size adjustment based on OpenAI rate limit headers
**Infrastructure:** —

**Goal:** Improve embedding generation throughput by 15-30% under rate limit pressure through adaptive batch sizing based on OpenAI rate limit headers

### Scope
Parse OpenAI rate limit headers (X-RateLimit-Remaining-Requests, X-RateLimit-Reset-Requests) and dynamically adjust batch sizes and concurrency. Reduce 429 retry overhead and maximize throughput under rate pressure.

### Source
Follow-up from QA Elaboration of KNOW-002. Enhancement opportunity for improved throughput and reduced retry overhead.

---

## KNOW-028: Environment Variable Documentation and Validation

**Status:** completed
**Priority:** P0
**Depends On:** none
**Replaces:** KNOW-011 (for MVP)
**Source:** Elaboration of KNOW-011 - User decision to defer secrets management
**Feature:** Document environment variables, create .env.example, implement startup validation
**Infrastructure:** —

**Goal:** Ensure all required environment variables are documented, validated at startup, and protected from accidental git commits

**Description:** MVP alternative to KNOW-011 (Secrets Management). Establishes best practices for local .env file management including documentation, .env.example template, Zod-based startup validation, and git protection. AWS Secrets Manager migration deferred to post-launch.

**Story Document:** plans/future/knowledgebase-mcp/UAT/KNOW-028/KNOW-028.md

**Proof Document:** plans/future/knowledgebase-mcp/UAT/KNOW-028/PROOF-KNOW-028.md

**QA Verification:** PASS - All 5 ACs verified, 22/22 unit tests passing (100% coverage), architecture compliant, Zod-first patterns applied correctly

**Story Points:** 2
