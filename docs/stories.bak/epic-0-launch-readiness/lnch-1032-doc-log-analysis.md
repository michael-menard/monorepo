# Story lnch-1032: Log Analysis Guide

## Status

Draft

## Story

**As an** operator,
**I want** a log analysis guide,
**so that** I can effectively search and analyze logs.

## Epic Context

This is **Story 4 of Launch Readiness Epic: Monitoring Documentation Workstream**.
Priority: **Medium** - Supports debugging and investigation.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- lnch-1029: CloudWatch Dashboard Guide (dashboard context)

## Related Stories

- lnch-1029: CloudWatch Dashboard Guide (overview)
- lnch-1013: Lambda Troubleshooting (Lambda logs)
- lnch-1015: Database Troubleshooting (DB logs)

## Acceptance Criteria

1. Guide exists at `docs/operations/monitoring/log-analysis.md`
2. Documents log group locations
3. Documents log format and structure
4. Documents CloudWatch Logs Insights queries
5. Documents common search patterns
6. Documents log retention settings
7. Includes troubleshooting query cookbook

## Tasks / Subtasks

- [ ] **Task 1: Create Guide Structure** (AC: 1)
  - [ ] Create `docs/operations/monitoring/log-analysis.md`
  - [ ] Add standard sections

- [ ] **Task 2: Document Log Groups** (AC: 2)
  - [ ] Lambda log groups
  - [ ] API Gateway logs
  - [ ] VPC Flow Logs (if enabled)
  - [ ] Naming patterns

- [ ] **Task 3: Document Log Format** (AC: 3)
  - [ ] JSON structure
  - [ ] Field definitions
  - [ ] Log levels
  - [ ] Correlation IDs

- [ ] **Task 4: Document Logs Insights** (AC: 4)
  - [ ] Query syntax basics
  - [ ] Field extraction
  - [ ] Aggregations
  - [ ] Time-based queries

- [ ] **Task 5: Document Search Patterns** (AC: 5)
  - [ ] Finding errors
  - [ ] Tracing requests
  - [ ] User activity
  - [ ] Performance analysis

- [ ] **Task 6: Document Retention** (AC: 6)
  - [ ] Retention periods by log group
  - [ ] Cost implications
  - [ ] Compliance requirements

- [ ] **Task 7: Create Query Cookbook** (AC: 7)
  - [ ] Common queries with descriptions
  - [ ] Copy-paste ready
  - [ ] Categorized by use case

## Dev Notes

### Log Group Naming
- Lambda: `/aws/lambda/lego-api-{stage}-{functionName}`
- API Gateway: `/aws/apigateway/lego-api-{stage}`

### Structured Log Format
```json
{
  "level": "info",
  "message": "Request processed",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "requestId": "abc-123",
  "userId": "user-456",
  "endpoint": "/api/mocs",
  "duration": 150
}
```

### Logs Insights Query Cookbook

**Find All Errors**
```
fields @timestamp, @message, @logStream
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
```

**Find Errors by Function**
```
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by @logStream
| sort count desc
```

**Trace a Request**
```
fields @timestamp, @message
| filter @message like /requestId-abc-123/
| sort @timestamp asc
```

**Find Slow Requests**
```
fields @timestamp, @message, @duration
| filter @type = "REPORT"
| filter @duration > 1000
| sort @duration desc
| limit 20
```

**User Activity**
```
fields @timestamp, @message
| filter @message like /userId.*user-456/
| sort @timestamp desc
| limit 50
```

**Error Rate Over Time**
```
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() as errors by bin(5m)
| sort @timestamp desc
```

**Cold Starts**
```
fields @timestamp, @logStream, @initDuration, @duration
| filter @type = "REPORT" and ispresent(@initDuration)
| stats count() as coldStarts by @logStream
| sort coldStarts desc
```

### Retention Settings
| Log Group | Retention | Notes |
|-----------|-----------|-------|
| Lambda logs | 14 days | Default |
| API Gateway | 7 days | Default |
| Application logs | 30 days | Custom |

## Testing

### Verification
- All queries work in Logs Insights
- Log groups are accurately documented
- Cookbook covers common scenarios

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
