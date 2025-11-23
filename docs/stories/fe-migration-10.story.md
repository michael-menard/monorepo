# Story 1.10: CloudWatch Monitoring Dashboard Creation

**Epic:** Epic 1: Frontend Serverless Migration

**Story ID:** 1.10

**Priority:** High

**Estimated Effort:** 5 story points

---

## User Story

**As a** DevOps engineer,
**I want** CloudWatch dashboards tracking frontend → Lambda metrics,
**so that** rollout health can be monitored in real-time with clear go/no-go criteria.

---

## Acceptance Criteria

**AC1**: CloudWatch dashboard created: "Frontend-Serverless-Migration" with widgets for:

- Lambda invocation count (by function)
- Lambda error rate (4xx, 5xx)
- Lambda duration (P50, P95, P99)
- API Gateway request count
- Redis cache hit/miss rate
- PostgreSQL query latency

**AC2**: Alarms configured:

- Error rate >2% sustained for 5 minutes → PagerDuty/Slack alert
- P95 latency >600ms (NA) or >900ms (EU) sustained for 5 minutes → alert
- Lambda concurrent execution >80% of account limit → alert

**AC3**: Comparison widgets show Express vs Serverless metrics side-by-side during dual operation

**AC4**: Geographic latency tracking: Separate metrics for NA vs EU users (CloudWatch Insights queries)

**AC5**: Dashboard JSON exported to infrastructure repo for version control and disaster recovery

---

## Integration Verification

**IV1**: Dashboard accessible to DevOps and engineering team (IAM permissions configured)

**IV2**: Metrics populate correctly during staging testing (Lambda invocations, errors visible)

**IV3**: Alarms trigger correctly when thresholds breached (test by inducing errors in staging)

---

## Technical Implementation Notes

```typescript
// infrastructure/cloudwatch/migration-dashboard.ts
import { aws_cloudwatch as cloudwatch } from 'aws-cdk-lib'

export function createMigrationDashboard(stack: Stack) {
  const dashboard = new cloudwatch.Dashboard(stack, 'MigrationDashboard', {
    dashboardName: 'Frontend-Serverless-Migration',
  })

  dashboard.addWidgets(
    new cloudwatch.GraphWidget({
      title: 'Lambda Invocations',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Invocations',
          dimensionsMap: { FunctionName: 'moc-handler' },
          statistic: 'Sum',
        }),
      ],
    }),
    new cloudwatch.GraphWidget({
      title: 'Error Rate (%)',
      left: [
        new cloudwatch.MathExpression({
          expression: '(errors/invocations)*100',
          usingMetrics: {
            errors: new cloudwatch.Metric({
              namespace: 'AWS/Lambda',
              metricName: 'Errors',
              statistic: 'Sum',
            }),
            invocations: new cloudwatch.Metric({
              namespace: 'AWS/Lambda',
              metricName: 'Invocations',
              statistic: 'Sum',
            }),
          },
        }),
      ],
    }),
  )

  // Alarms
  new cloudwatch.Alarm(stack, 'HighErrorRate', {
    metric: new cloudwatch.MathExpression({
      expression: '(errors/invocations)*100',
      // ... metrics
    }),
    threshold: 2,
    evaluationPeriods: 5,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    alarmActions: [
      /* SNS topic */
    ],
  })
}
```

---

## Definition of Done

- [ ] CloudWatch dashboard created with all required widgets
- [ ] Alarms configured for error rate, latency, concurrency
- [ ] Comparison widgets for Express vs Serverless
- [ ] Geographic latency tracking implemented
- [ ] Dashboard JSON exported to repo
- [ ] IAM permissions configured
- [ ] All Integration Verification criteria passed
- [ ] Code reviewed and approved

---

**Story Created:** 2025-11-23
