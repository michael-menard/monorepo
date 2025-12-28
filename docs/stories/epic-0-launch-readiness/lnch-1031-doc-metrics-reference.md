# Story lnch-1031: Metrics Reference Guide

## Status

Draft

## Story

**As an** operator,
**I want** a comprehensive metrics reference,
**so that** I understand all available metrics and their meaning.

## Epic Context

This is **Story 3 of Launch Readiness Epic: Monitoring Documentation Workstream**.
Priority: **Medium** - Supports monitoring effectiveness.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- lnch-1029: CloudWatch Dashboard Guide (dashboard context)

## Related Stories

- lnch-1029: CloudWatch Dashboard Guide (uses these metrics)
- lnch-1030: Alarm Response Runbooks (alarm thresholds)
- lnch-1032: Log Analysis Guide (log-based metrics)

## Acceptance Criteria

1. Guide exists at `docs/operations/monitoring/metrics-reference.md`
2. Documents all Lambda metrics
3. Documents all API Gateway metrics
4. Documents all Aurora metrics
5. Documents all OpenSearch metrics
6. Documents custom business metrics
7. Includes metric dimensions and units

## Tasks / Subtasks

- [ ] **Task 1: Create Guide Structure** (AC: 1)
  - [ ] Create `docs/operations/monitoring/metrics-reference.md`
  - [ ] Organize by service

- [ ] **Task 2: Document Lambda Metrics** (AC: 2)
  - [ ] Invocations
  - [ ] Duration (Avg, p95, p99, Max)
  - [ ] Errors
  - [ ] Throttles
  - [ ] ConcurrentExecutions
  - [ ] IteratorAge (if using streams)

- [ ] **Task 3: Document API Gateway Metrics** (AC: 3)
  - [ ] Count (requests)
  - [ ] Latency (Avg, p95, p99)
  - [ ] 4XXError
  - [ ] 5XXError
  - [ ] IntegrationLatency

- [ ] **Task 4: Document Aurora Metrics** (AC: 4)
  - [ ] DatabaseConnections
  - [ ] CPUUtilization
  - [ ] ServerlessDatabaseCapacity
  - [ ] Queries
  - [ ] ReadLatency / WriteLatency
  - [ ] FreeableMemory

- [ ] **Task 5: Document OpenSearch Metrics** (AC: 5)
  - [ ] ClusterStatus
  - [ ] JVMMemoryPressure
  - [ ] CPUUtilization
  - [ ] FreeStorageSpace
  - [ ] SearchLatency
  - [ ] IndexingLatency

- [ ] **Task 6: Document Business Metrics** (AC: 6)
  - [ ] Custom application metrics (if any)
  - [ ] Request counts by endpoint
  - [ ] User activity metrics

- [ ] **Task 7: Document Dimensions/Units** (AC: 7)
  - [ ] Dimension filters (FunctionName, etc.)
  - [ ] Units (Count, Milliseconds, Percent)
  - [ ] Statistics (Sum, Avg, p95, etc.)

## Dev Notes

### Lambda Metrics

| Metric | Description | Unit | Good Value |
|--------|-------------|------|------------|
| Invocations | Number of function calls | Count | Varies |
| Duration | Execution time | ms | <1000 |
| Errors | Failed invocations | Count | 0 |
| Throttles | Rate limited invocations | Count | 0 |
| ConcurrentExecutions | Parallel executions | Count | <100 |

### API Gateway Metrics

| Metric | Description | Unit | Good Value |
|--------|-------------|------|------------|
| Count | Total requests | Count | Varies |
| Latency | Total response time | ms | <500 |
| IntegrationLatency | Backend time | ms | <400 |
| 4XXError | Client errors | Count | Low |
| 5XXError | Server errors | Count | 0 |

### Aurora Serverless v2 Metrics

| Metric | Description | Unit | Good Value |
|--------|-------------|------|------------|
| ServerlessDatabaseCapacity | Current ACUs | Count | <Max |
| DatabaseConnections | Active connections | Count | <50 |
| CPUUtilization | CPU usage | Percent | <80 |
| ReadLatency | Read time | seconds | <0.01 |
| WriteLatency | Write time | seconds | <0.01 |

### CloudWatch Namespaces
- `AWS/Lambda`
- `AWS/ApiGateway`
- `AWS/RDS`
- `AWS/ES` (OpenSearch)
- `AWS/DynamoDB`

## Testing

### Verification
- All metrics are documented
- Values are accurate
- Units are correct

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
