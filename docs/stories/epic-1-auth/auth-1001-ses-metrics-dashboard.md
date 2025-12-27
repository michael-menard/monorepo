# Story 1.13.10: SES Metrics & Monitoring Dashboard

## Status

Approved

## Priority

Low (Production Readiness)

## Story

**As a** product owner / operations engineer,
**I want** a dashboard to monitor email delivery metrics,
**so that** I can track bounce rates, delivery success, and maintain good sender reputation.

## Background

Amazon SES provides detailed metrics about email delivery. Monitoring these metrics is critical because:

- SES suspends accounts at 10% bounce rate or 0.5% complaint rate
- Poor deliverability impacts user experience (missed verification codes)
- Early detection of issues prevents account suspension

## Acceptance Criteria

1. ⬜ CloudWatch dashboard for SES metrics
2. ⬜ Bounce rate monitoring with alerting
3. ⬜ Complaint rate monitoring with alerting
4. ⬜ Delivery success rate tracking
5. ⬜ Send volume metrics (daily/weekly/monthly)
6. ⬜ Rejection rate monitoring
7. ⬜ Email type breakdown (verification vs password reset)
8. ⬜ SNS notifications for critical thresholds
9. ⬜ Slack/PagerDuty integration for alerts
10. ⬜ Weekly email health report
11. ⬜ Historical trend analysis
12. ⬜ Documentation for interpreting metrics

## Tasks / Subtasks

- [ ] **Task 1: Enable SES Metrics** (AC: 1)
  - [ ] Enable reputation metrics in SES
  - [ ] Configure CloudWatch log group for SES events
  - [ ] Set up event destinations for tracking

- [ ] **Task 2: CloudWatch Dashboard** (AC: 1, 4, 5, 11)
  - [ ] Create SES metrics dashboard
  - [ ] Add delivery rate widget
  - [ ] Add bounce rate widget
  - [ ] Add complaint rate widget
  - [ ] Add send volume graph
  - [ ] Add rejection rate widget
  - [ ] Configure time range selectors

- [ ] **Task 3: Alerting Setup** (AC: 2, 3, 6, 8)
  - [ ] Create SNS topic for SES alerts
  - [ ] Configure bounce rate alarm (warn at 5%, critical at 8%)
  - [ ] Configure complaint rate alarm (warn at 0.1%, critical at 0.3%)
  - [ ] Configure rejection rate alarm
  - [ ] Configure daily send quota alarm
  - [ ] Test alarm notifications

- [ ] **Task 4: Alert Integrations** (AC: 9)
  - [ ] Set up Slack webhook for alerts
  - [ ] Configure PagerDuty integration (optional)
  - [ ] Create escalation policy
  - [ ] Test end-to-end alerting

- [ ] **Task 5: Email Type Tracking** (AC: 7)
  - [ ] Add custom headers to identify email types
  - [ ] Configure CloudWatch Logs Insights queries
  - [ ] Create per-type delivery metrics
  - [ ] Add to dashboard

- [ ] **Task 6: Reporting** (AC: 10, 12)
  - [ ] Create weekly health report Lambda
  - [ ] Schedule CloudWatch Events rule
  - [ ] Send report via email/Slack
  - [ ] Document metric interpretation
  - [ ] Create runbook for common issues

## Dev Notes

### Key SES Metrics

| Metric                   | Description                       | Threshold                |
| ------------------------ | --------------------------------- | ------------------------ |
| Reputation.BounceRate    | Hard bounces / total sends        | < 5% (suspend at 10%)    |
| Reputation.ComplaintRate | Spam complaints / total sends     | < 0.1% (suspend at 0.5%) |
| Send                     | Number of send attempts           | Monitor for anomalies    |
| Delivery                 | Successfully delivered            | Target > 95%             |
| Bounce                   | Total bounces (hard + soft)       | Monitor trend            |
| Complaint                | Spam complaints                   | Any is concerning        |
| Reject                   | Rejected by SES                   | Should be 0              |
| Open                     | Emails opened (requires tracking) | Optional                 |
| Click                    | Links clicked (requires tracking) | Optional                 |

### CloudWatch Dashboard Definition

```yaml
# infrastructure/cloudwatch/ses-dashboard.yml
Resources:
  SESDashboard:
    Type: AWS::CloudWatch::Dashboard
    Properties:
      DashboardName: ses-email-metrics
      DashboardBody: !Sub |
        {
          "widgets": [
            {
              "type": "metric",
              "x": 0,
              "y": 0,
              "width": 6,
              "height": 6,
              "properties": {
                "title": "Bounce Rate",
                "metrics": [
                  ["AWS/SES", "Reputation.BounceRate", { "stat": "Average", "period": 3600 }]
                ],
                "view": "gauge",
                "yAxis": { "left": { "min": 0, "max": 0.1 } },
                "annotations": {
                  "horizontal": [
                    { "value": 0.05, "color": "#ff7f0e", "label": "Warning" },
                    { "value": 0.10, "color": "#d62728", "label": "Critical" }
                  ]
                },
                "region": "${AWS::Region}"
              }
            },
            {
              "type": "metric",
              "x": 6,
              "y": 0,
              "width": 6,
              "height": 6,
              "properties": {
                "title": "Complaint Rate",
                "metrics": [
                  ["AWS/SES", "Reputation.ComplaintRate", { "stat": "Average", "period": 3600 }]
                ],
                "view": "gauge",
                "yAxis": { "left": { "min": 0, "max": 0.005 } },
                "annotations": {
                  "horizontal": [
                    { "value": 0.001, "color": "#ff7f0e", "label": "Warning" },
                    { "value": 0.005, "color": "#d62728", "label": "Critical" }
                  ]
                },
                "region": "${AWS::Region}"
              }
            },
            {
              "type": "metric",
              "x": 12,
              "y": 0,
              "width": 6,
              "height": 6,
              "properties": {
                "title": "Delivery Rate",
                "metrics": [
                  [{ "expression": "(m1/m2)*100", "label": "Delivery %", "id": "e1" }],
                  ["AWS/SES", "Delivery", { "id": "m1", "visible": false }],
                  ["AWS/SES", "Send", { "id": "m2", "visible": false }]
                ],
                "view": "gauge",
                "yAxis": { "left": { "min": 90, "max": 100 } },
                "region": "${AWS::Region}"
              }
            },
            {
              "type": "metric",
              "x": 18,
              "y": 0,
              "width": 6,
              "height": 6,
              "properties": {
                "title": "Daily Send Volume",
                "metrics": [
                  ["AWS/SES", "Send", { "stat": "Sum", "period": 86400 }]
                ],
                "view": "singleValue",
                "region": "${AWS::Region}"
              }
            },
            {
              "type": "metric",
              "x": 0,
              "y": 6,
              "width": 12,
              "height": 6,
              "properties": {
                "title": "Email Volume (7 days)",
                "metrics": [
                  ["AWS/SES", "Send", { "stat": "Sum", "period": 3600, "label": "Sent" }],
                  ["AWS/SES", "Delivery", { "stat": "Sum", "period": 3600, "label": "Delivered" }],
                  ["AWS/SES", "Bounce", { "stat": "Sum", "period": 3600, "label": "Bounced" }],
                  ["AWS/SES", "Complaint", { "stat": "Sum", "period": 3600, "label": "Complaints" }]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "${AWS::Region}",
                "period": 3600
              }
            },
            {
              "type": "metric",
              "x": 12,
              "y": 6,
              "width": 12,
              "height": 6,
              "properties": {
                "title": "Bounce & Complaint Rates (7 days)",
                "metrics": [
                  ["AWS/SES", "Reputation.BounceRate", { "stat": "Average", "period": 3600, "label": "Bounce Rate" }],
                  ["AWS/SES", "Reputation.ComplaintRate", { "stat": "Average", "period": 3600, "label": "Complaint Rate", "yAxis": "right" }]
                ],
                "view": "timeSeries",
                "region": "${AWS::Region}",
                "yAxis": {
                  "left": { "min": 0, "max": 0.1, "label": "Bounce %" },
                  "right": { "min": 0, "max": 0.01, "label": "Complaint %" }
                },
                "annotations": {
                  "horizontal": [
                    { "value": 0.05, "color": "#ff7f0e", "label": "Bounce Warning" },
                    { "value": 0.10, "color": "#d62728", "label": "Bounce Critical" }
                  ]
                }
              }
            },
            {
              "type": "metric",
              "x": 0,
              "y": 12,
              "width": 8,
              "height": 4,
              "properties": {
                "title": "Rejections",
                "metrics": [
                  ["AWS/SES", "Reject", { "stat": "Sum", "period": 86400 }]
                ],
                "view": "singleValue",
                "region": "${AWS::Region}"
              }
            },
            {
              "type": "metric",
              "x": 8,
              "y": 12,
              "width": 8,
              "height": 4,
              "properties": {
                "title": "Total Bounces (24h)",
                "metrics": [
                  ["AWS/SES", "Bounce", { "stat": "Sum", "period": 86400 }]
                ],
                "view": "singleValue",
                "region": "${AWS::Region}"
              }
            },
            {
              "type": "metric",
              "x": 16,
              "y": 12,
              "width": 8,
              "height": 4,
              "properties": {
                "title": "Total Complaints (24h)",
                "metrics": [
                  ["AWS/SES", "Complaint", { "stat": "Sum", "period": 86400 }]
                ],
                "view": "singleValue",
                "region": "${AWS::Region}"
              }
            }
          ]
        }
```

### CloudWatch Alarms

```typescript
// infrastructure/monitoring/ses-alarms.ts
import * as cdk from 'aws-cdk-lib'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions'

export function createSESAlarms(stack: cdk.Stack, alertTopic: sns.Topic) {
  // Bounce Rate Warning (5%)
  const bounceWarning = new cloudwatch.Alarm(stack, 'SESBounceWarning', {
    alarmName: 'ses-bounce-rate-warning',
    alarmDescription: 'SES bounce rate above 5% - investigate immediately',
    metric: new cloudwatch.Metric({
      namespace: 'AWS/SES',
      metricName: 'Reputation.BounceRate',
      statistic: 'Average',
      period: cdk.Duration.hours(1),
    }),
    threshold: 0.05,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  })
  bounceWarning.addAlarmAction(new actions.SnsAction(alertTopic))

  // Bounce Rate Critical (8%)
  const bounceCritical = new cloudwatch.Alarm(stack, 'SESBounceCritical', {
    alarmName: 'ses-bounce-rate-critical',
    alarmDescription: 'SES bounce rate above 8% - URGENT: account suspension imminent at 10%',
    metric: new cloudwatch.Metric({
      namespace: 'AWS/SES',
      metricName: 'Reputation.BounceRate',
      statistic: 'Average',
      period: cdk.Duration.minutes(15),
    }),
    threshold: 0.08,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  })
  bounceCritical.addAlarmAction(new actions.SnsAction(alertTopic))

  // Complaint Rate Warning (0.1%)
  const complaintWarning = new cloudwatch.Alarm(stack, 'SESComplaintWarning', {
    alarmName: 'ses-complaint-rate-warning',
    alarmDescription: 'SES complaint rate above 0.1% - review email content',
    metric: new cloudwatch.Metric({
      namespace: 'AWS/SES',
      metricName: 'Reputation.ComplaintRate',
      statistic: 'Average',
      period: cdk.Duration.hours(1),
    }),
    threshold: 0.001,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  })
  complaintWarning.addAlarmAction(new actions.SnsAction(alertTopic))

  // Complaint Rate Critical (0.3%)
  const complaintCritical = new cloudwatch.Alarm(stack, 'SESComplaintCritical', {
    alarmName: 'ses-complaint-rate-critical',
    alarmDescription: 'SES complaint rate above 0.3% - URGENT: account suspension imminent at 0.5%',
    metric: new cloudwatch.Metric({
      namespace: 'AWS/SES',
      metricName: 'Reputation.ComplaintRate',
      statistic: 'Average',
      period: cdk.Duration.minutes(15),
    }),
    threshold: 0.003,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  })
  complaintCritical.addAlarmAction(new actions.SnsAction(alertTopic))

  // Any Rejections
  const rejections = new cloudwatch.Alarm(stack, 'SESRejections', {
    alarmName: 'ses-rejections',
    alarmDescription: 'SES rejected emails - check for malformed requests',
    metric: new cloudwatch.Metric({
      namespace: 'AWS/SES',
      metricName: 'Reject',
      statistic: 'Sum',
      period: cdk.Duration.hours(1),
    }),
    threshold: 1,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  })
  rejections.addAlarmAction(new actions.SnsAction(alertTopic))

  return { bounceWarning, bounceCritical, complaintWarning, complaintCritical, rejections }
}
```

### Slack Notification Lambda

```typescript
// infrastructure/functions/ses-slack-notifier.ts
import { SNSEvent } from 'aws-lambda'

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL!

interface CloudWatchAlarm {
  AlarmName: string
  AlarmDescription: string
  NewStateValue: 'ALARM' | 'OK' | 'INSUFFICIENT_DATA'
  NewStateReason: string
  StateChangeTime: string
  Trigger: {
    MetricName: string
    Threshold: number
  }
}

export async function handler(event: SNSEvent) {
  for (const record of event.Records) {
    const alarm: CloudWatchAlarm = JSON.parse(record.Sns.Message)

    const color = alarm.NewStateValue === 'ALARM' ? '#d62728' : '#2ca02c'
    const emoji = alarm.NewStateValue === 'ALARM' ? ':rotating_light:' : ':white_check_mark:'

    const slackMessage = {
      attachments: [
        {
          color,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${emoji} SES Alert: ${alarm.AlarmName}`,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Status:*\n${alarm.NewStateValue}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Metric:*\n${alarm.Trigger.MetricName}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Threshold:*\n${(alarm.Trigger.Threshold * 100).toFixed(2)}%`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Time:*\n${alarm.StateChangeTime}`,
                },
              ],
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Description:*\n${alarm.AlarmDescription}`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Reason:*\n${alarm.NewStateReason}`,
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'View Dashboard' },
                  url: `https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=ses-email-metrics`,
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'SES Console' },
                  url: 'https://console.aws.amazon.com/ses/home',
                },
              ],
            },
          ],
        },
      ],
    }

    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    })
  }
}
```

### Weekly Health Report Lambda

```typescript
// infrastructure/functions/ses-weekly-report.ts
import { CloudWatch, SES } from 'aws-sdk'

const cloudwatch = new CloudWatch()
const ses = new SES()

export async function handler() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Get metrics for the past week
  const metrics = await cloudwatch
    .getMetricStatistics({
      Namespace: 'AWS/SES',
      MetricName: 'Send',
      StartTime: weekAgo,
      EndTime: now,
      Period: 604800, // 1 week
      Statistics: ['Sum'],
    })
    .promise()

  const bounceRate = await cloudwatch
    .getMetricStatistics({
      Namespace: 'AWS/SES',
      MetricName: 'Reputation.BounceRate',
      StartTime: weekAgo,
      EndTime: now,
      Period: 604800,
      Statistics: ['Average'],
    })
    .promise()

  const complaintRate = await cloudwatch
    .getMetricStatistics({
      Namespace: 'AWS/SES',
      MetricName: 'Reputation.ComplaintRate',
      StartTime: weekAgo,
      EndTime: now,
      Period: 604800,
      Statistics: ['Average'],
    })
    .promise()

  const totalSent = metrics.Datapoints?.[0]?.Sum || 0
  const avgBounce = bounceRate.Datapoints?.[0]?.Average || 0
  const avgComplaint = complaintRate.Datapoints?.[0]?.Average || 0

  // Get account sending quota
  const quota = await ses.getSendQuota().promise()

  const report = {
    period: `${weekAgo.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`,
    emailsSent: totalSent,
    bounceRate: `${(avgBounce * 100).toFixed(3)}%`,
    complaintRate: `${(avgComplaint * 100).toFixed(4)}%`,
    sendingQuota: quota.Max24HourSend,
    sentLast24h: quota.SentLast24Hours,
    quotaUsed: `${((quota.SentLast24Hours! / quota.Max24HourSend!) * 100).toFixed(1)}%`,
    health: avgBounce < 0.05 && avgComplaint < 0.001 ? 'HEALTHY' : 'ATTENTION NEEDED',
  }

  // Send report (to Slack, email, or store in S3)
  console.log('Weekly SES Report:', JSON.stringify(report, null, 2))

  return report
}
```

### Email Type Tracking

To track different email types, add custom headers:

```typescript
// When sending verification email
const params = {
  Source: 'noreply@legomoc.com',
  Destination: { ToAddresses: [email] },
  Message: {
    /* ... */
  },
  Tags: [
    { Name: 'email_type', Value: 'verification' },
    { Name: 'environment', Value: process.env.STAGE },
  ],
}
```

Then query with CloudWatch Logs Insights:

```sql
fields @timestamp, @message
| filter email_type = 'verification'
| stats count(*) as total by bin(1d)
```

### Runbook: High Bounce Rate

1. **Immediate Actions**
   - Check for bulk signup attacks (bot registrations)
   - Review recent code changes to email sending
   - Check if sending to purchased/old email lists

2. **Investigation**
   - Query CloudWatch Logs for bounced addresses
   - Check bounce types (hard vs soft)
   - Identify patterns (domain, time, email type)

3. **Remediation**
   - Add email validation on signup
   - Implement double opt-in
   - Clean email list (remove hard bounces)
   - Add CAPTCHA if bot attack

4. **Prevention**
   - Regular list hygiene
   - Validate email format and MX records
   - Monitor trends weekly

## Dependencies

- Story 1.13.9: SES Email Integration
- AWS CloudWatch access
- SNS topic for alerts
- Slack webhook (optional)

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2025-11-28 | 0.1     | Initial draft | Claude Code |
