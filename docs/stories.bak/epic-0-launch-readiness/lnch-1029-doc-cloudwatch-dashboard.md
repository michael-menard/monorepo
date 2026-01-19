# Story lnch-1029: CloudWatch Dashboard Guide

## Status

Draft

## Story

**As an** operator,
**I want** a CloudWatch dashboard guide,
**so that** I can effectively monitor system health.

## Epic Context

This is **Story 1 of Launch Readiness Epic: Monitoring Documentation Workstream**.
Priority: **High** - Required for production monitoring.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (first story in monitoring workstream)

## Related Stories

- lnch-1030: Alarm Response Runbooks (drill-down from alarms)
- lnch-1031: Metrics Reference Guide (metric details)

## Acceptance Criteria

1. Guide exists at `docs/operations/monitoring/cloudwatch-dashboard.md`
2. Documents dashboard layout and widgets
3. Documents key metrics and thresholds
4. Documents how to interpret each panel
5. Documents common patterns (good vs bad)
6. Documents drill-down procedures
7. Includes screenshots or diagrams

## Tasks / Subtasks

- [ ] **Task 1: Create Guide Structure** (AC: 1)
  - [ ] Create `docs/operations/monitoring/` directory
  - [ ] Create `cloudwatch-dashboard.md`

- [ ] **Task 2: Document Layout** (AC: 2)
  - [ ] Overall dashboard structure
  - [ ] Widget descriptions
  - [ ] Time range controls
  - [ ] Refresh settings

- [ ] **Task 3: Document Key Metrics** (AC: 3)
  - [ ] Lambda invocations, errors, duration
  - [ ] API Gateway requests, latency, 4xx/5xx
  - [ ] Aurora connections, CPU, latency
  - [ ] OpenSearch cluster health

- [ ] **Task 4: Document Interpretation** (AC: 4)
  - [ ] What each metric means
  - [ ] Normal ranges
  - [ ] Warning thresholds
  - [ ] Critical thresholds

- [ ] **Task 5: Document Patterns** (AC: 5)
  - [ ] Normal traffic patterns
  - [ ] Spike indicators
  - [ ] Degradation patterns
  - [ ] Outage patterns

- [ ] **Task 6: Document Drill-Down** (AC: 6)
  - [ ] How to investigate anomalies
  - [ ] Related log groups
  - [ ] X-Ray traces
  - [ ] Deeper metrics

- [ ] **Task 7: Add Visual Aids** (AC: 7)
  - [ ] Dashboard screenshot
  - [ ] Annotated panels
  - [ ] Example patterns

## Dev Notes

### Dashboard Location
- AWS Console → CloudWatch → Dashboards → `lego-api-{stage}`
- Available in staging/production only

### Key Widgets

| Widget | Metric | Normal | Warning | Critical |
|--------|--------|--------|---------|----------|
| Lambda Errors | Errors/5min | 0-2 | 3-10 | >10 |
| API Latency (p95) | ms | <500 | 500-2000 | >2000 |
| API 5xx Rate | errors/5min | 0 | 1-5 | >5 |
| Aurora CPU | % | <40 | 40-80 | >80 |
| Aurora Connections | count | <30 | 30-50 | >50 |
| OpenSearch Status | color | Green | Yellow | Red |

### Time Range Recommendations
- Real-time monitoring: 1 hour
- Daily review: 24 hours
- Trend analysis: 1 week
- Capacity planning: 1 month

### Drill-Down Paths

**High Lambda Errors**
1. Check Lambda Errors widget → identify function
2. Go to CloudWatch Logs for that function
3. Search for ERROR level logs
4. Check X-Ray for trace details

**High Latency**
1. Check API Latency widget → identify endpoint
2. Check corresponding Lambda duration
3. Check Aurora query latency
4. Review X-Ray service map

**Database Issues**
1. Check Aurora widgets
2. Review Performance Insights
3. Check slow query logs
4. Verify connection count

## Testing

### Verification
- Dashboard exists and is accessible
- All metrics are collecting data
- Thresholds are accurate

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
