# Epic 1: Authentication - SES Email Integration

## Overview

This epic implements production-ready email infrastructure for authentication flows. It replaces Cognito's default email service with Amazon SES, enabling custom branding, higher volume limits, better deliverability, and comprehensive monitoring.

## Priority

Low (Production Readiness) - Required before production launch but not blocking active development.

## Tech Stack

- **Email Service**: Amazon SES
- **Authentication**: AWS Cognito (existing)
- **Monitoring**: CloudWatch Dashboards & Alarms
- **Alerting**: SNS, Slack/PagerDuty integration
- **Infrastructure**: CDK/Serverless Framework

## Stories

| ID | Title | Description | Dependencies |
|----|-------|-------------|--------------|
| AUTH-1000 | SES Email Integration | Configure SES for Cognito email sending with custom domain | None |
| AUTH-1001 | SES Metrics & Monitoring Dashboard | CloudWatch dashboard and alerting for email delivery metrics | AUTH-1000 |

## Implementation Order

```
Phase 1: SES Setup & Integration
└── AUTH-1000: SES Email Integration

Phase 2: Monitoring & Alerting
└── AUTH-1001: SES Metrics & Monitoring Dashboard
```

---

## AUTH-1000: SES Email Integration

### User Story
**As a** product owner, **I want** Cognito to use Amazon SES for sending emails, **so that** we can send branded emails from our domain with higher volume limits and better deliverability.

### Background

Currently, Cognito uses its default email service which has significant limitations:
- 50 emails per day limit
- Sender address: `no-reply@verificationemail.com`
- No custom branding
- Limited deliverability control

### Acceptance Criteria
1. SES domain verified for production email sending
2. SES moved out of sandbox mode (production access)
3. SPF record configured for email authentication
4. DKIM signing enabled for email deliverability
5. DMARC policy configured
6. Cognito User Pool configured to use SES
7. Custom sender email address (e.g., `noreply@legomoc.com`)
8. Reply-to address configured (e.g., `support@legomoc.com`)
9. Email templates customized with branding
10. Bounce and complaint handling configured
11. Email sending tested in staging environment
12. Documentation updated

### Tasks

#### Task 1: SES Domain Setup (AC: 1, 3, 4, 5)
- Add domain to SES
- Verify domain ownership via DNS
- Add SPF record to DNS
- Enable DKIM and add CNAME records
- Configure DMARC policy
- Verify email identity for sender address

#### Task 2: SES Production Access (AC: 2)
- Review AWS SES sending limits
- Submit production access request
- Provide use case details to AWS
- Wait for approval (24-48 hours)

#### Task 3: Cognito SES Integration (AC: 6, 7, 8)
- Update Cognito User Pool email configuration
- Set EmailSendingAccount to DEVELOPER
- Configure SourceArn for SES identity
- Set custom From and Reply-To addresses
- Deploy infrastructure changes

#### Task 4: Email Templates (AC: 9)
- Design branded email template
- Create verification code email template
- Create password reset email template
- Create welcome email template (optional)
- Test email rendering across clients

#### Task 5: Monitoring & Handling (AC: 10)
- Configure SNS topic for bounces
- Configure SNS topic for complaints
- Set up Lambda to handle bounce notifications
- Set up CloudWatch alarms for bounce rate
- Document suppression list management

#### Task 6: Testing & Documentation (AC: 11, 12)
- Test email sending in staging
- Verify emails land in inbox (not spam)
- Test with multiple email providers (Gmail, Outlook, etc.)
- Document SES configuration
- Document DNS requirements for ops team

### DNS Records Required

| Type  | Name                    | Value                                  |
|-------|-------------------------|----------------------------------------|
| TXT   | _amazonses.legomoc.com  | (provided by SES)                      |
| CNAME | selector1._domainkey    | selector1.dkim.amazonses.com           |
| CNAME | selector2._domainkey    | selector2.dkim.amazonses.com           |
| CNAME | selector3._domainkey    | selector3.dkim.amazonses.com           |
| TXT   | legomoc.com             | v=spf1 include:amazonses.com ~all      |
| TXT   | _dmarc.legomoc.com      | v=DMARC1; p=quarantine; rua=mailto:... |

### Cognito Configuration

**CDK Implementation:**
```typescript
import * as cognito from 'aws-cdk-lib/aws-cognito'

const userPool = new cognito.UserPool(this, 'UserPool', {
  // ... existing config
  email: cognito.UserPoolEmail.withSES({
    fromEmail: 'noreply@legomoc.com',
    fromName: 'LEGO MOC',
    replyTo: 'support@legomoc.com',
    sesRegion: 'us-east-1',
    sesVerifiedDomain: 'legomoc.com',
  }),
})
```

**Serverless Framework:**
```yaml
UserPoolEmailConfiguration:
  EmailSendingAccount: DEVELOPER
  From: 'LEGO MOC <noreply@legomoc.com>'
  ReplyToEmailAddress: support@legomoc.com
  SourceArn: !Sub 'arn:aws:ses:${AWS::Region}:${AWS::AccountId}:identity/legomoc.com'
```

### Bounce/Complaint Handler

```typescript
// infrastructure/functions/ses-notification-handler.ts
import { SNSEvent } from 'aws-lambda'

interface SESNotification {
  notificationType: 'Bounce' | 'Complaint'
  bounce?: {
    bounceType: string
    bouncedRecipients: Array<{ emailAddress: string }>
  }
  complaint?: {
    complainedRecipients: Array<{ emailAddress: string }>
  }
}

export async function handler(event: SNSEvent) {
  for (const record of event.Records) {
    const notification: SESNotification = JSON.parse(record.Sns.Message)

    if (notification.notificationType === 'Bounce') {
      const bounceType = notification.bounce?.bounceType
      if (bounceType === 'Permanent') {
        for (const recipient of notification.bounce?.bouncedRecipients || []) {
          await handlePermanentBounce(recipient.emailAddress)
        }
      }
    }

    if (notification.notificationType === 'Complaint') {
      for (const recipient of notification.complaint?.complainedRecipients || []) {
        await handleComplaint(recipient.emailAddress)
      }
    }
  }
}
```

### SES vs Cognito Default Comparison

| Feature         | Cognito Default                | SES Integration                 |
|-----------------|--------------------------------|---------------------------------|
| Daily Limit     | 50 emails                      | Unlimited (after prod access)   |
| Sender Address  | no-reply@verificationemail.com | Custom (noreply@yourdomain.com) |
| Custom Branding | Limited                        | Full HTML templates             |
| Deliverability  | Basic                          | SPF/DKIM/DMARC                  |
| Bounce Handling | None                           | SNS notifications               |
| Analytics       | None                           | CloudWatch metrics              |
| Cost            | Free                           | ~$0.10 per 1000 emails          |

### Risks
1. **SES Production Access Delay**: AWS review can take 24-48 hours
2. **DNS Propagation**: Record changes may take up to 48 hours
3. **Email Deliverability**: New domains may have lower reputation initially

---

## AUTH-1001: SES Metrics & Monitoring Dashboard

### User Story
**As a** product owner / operations engineer, **I want** a dashboard to monitor email delivery metrics, **so that** I can track bounce rates, delivery success, and maintain good sender reputation.

### Background

Amazon SES provides detailed metrics about email delivery. Monitoring these metrics is critical because:
- SES suspends accounts at 10% bounce rate or 0.5% complaint rate
- Poor deliverability impacts user experience (missed verification codes)
- Early detection of issues prevents account suspension

### Acceptance Criteria
1. CloudWatch dashboard for SES metrics
2. Bounce rate monitoring with alerting
3. Complaint rate monitoring with alerting
4. Delivery success rate tracking
5. Send volume metrics (daily/weekly/monthly)
6. Rejection rate monitoring
7. Email type breakdown (verification vs password reset)
8. SNS notifications for critical thresholds
9. Slack/PagerDuty integration for alerts
10. Weekly email health report
11. Historical trend analysis
12. Documentation for interpreting metrics

### Tasks

#### Task 1: Enable SES Metrics (AC: 1)
- Enable reputation metrics in SES
- Configure CloudWatch log group for SES events
- Set up event destinations for tracking

#### Task 2: CloudWatch Dashboard (AC: 1, 4, 5, 11)
- Create SES metrics dashboard
- Add delivery rate widget
- Add bounce rate widget
- Add complaint rate widget
- Add send volume graph
- Add rejection rate widget
- Configure time range selectors

#### Task 3: Alerting Setup (AC: 2, 3, 6, 8)
- Create SNS topic for SES alerts
- Configure bounce rate alarm (warn at 5%, critical at 8%)
- Configure complaint rate alarm (warn at 0.1%, critical at 0.3%)
- Configure rejection rate alarm
- Configure daily send quota alarm
- Test alarm notifications

#### Task 4: Alert Integrations (AC: 9)
- Set up Slack webhook for alerts
- Configure PagerDuty integration (optional)
- Create escalation policy
- Test end-to-end alerting

#### Task 5: Email Type Tracking (AC: 7)
- Add custom headers to identify email types
- Configure CloudWatch Logs Insights queries
- Create per-type delivery metrics
- Add to dashboard

#### Task 6: Reporting (AC: 10, 12)
- Create weekly health report Lambda
- Schedule CloudWatch Events rule
- Send report via email/Slack
- Document metric interpretation
- Create runbook for common issues

### Key SES Metrics

| Metric                   | Description                       | Threshold                |
|--------------------------|-----------------------------------|--------------------------|
| Reputation.BounceRate    | Hard bounces / total sends        | < 5% (suspend at 10%)    |
| Reputation.ComplaintRate | Spam complaints / total sends     | < 0.1% (suspend at 0.5%) |
| Send                     | Number of send attempts           | Monitor for anomalies    |
| Delivery                 | Successfully delivered            | Target > 95%             |
| Bounce                   | Total bounces (hard + soft)       | Monitor trend            |
| Complaint                | Spam complaints                   | Any is concerning        |
| Reject                   | Rejected by SES                   | Should be 0              |
| Open                     | Emails opened (requires tracking) | Optional                 |
| Click                    | Links clicked (requires tracking) | Optional                 |

### CloudWatch Alarms

```typescript
// infrastructure/monitoring/ses-alarms.ts
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
      attachments: [{
        color,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `${emoji} SES Alert: ${alarm.AlarmName}` },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Status:*\n${alarm.NewStateValue}` },
              { type: 'mrkdwn', text: `*Metric:*\n${alarm.Trigger.MetricName}` },
              { type: 'mrkdwn', text: `*Threshold:*\n${(alarm.Trigger.Threshold * 100).toFixed(2)}%` },
              { type: 'mrkdwn', text: `*Time:*\n${alarm.StateChangeTime}` },
            ],
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*Description:*\n${alarm.AlarmDescription}` },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'View Dashboard' },
                url: 'https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=ses-email-metrics',
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: 'SES Console' },
                url: 'https://console.aws.amazon.com/ses/home',
              },
            ],
          },
        ],
      }],
    }

    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    })
  }
}
```

### Weekly Health Report

```typescript
// infrastructure/functions/ses-weekly-report.ts
import { CloudWatch, SES } from 'aws-sdk'

const cloudwatch = new CloudWatch()
const ses = new SES()

export async function handler() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const metrics = await cloudwatch.getMetricStatistics({
    Namespace: 'AWS/SES',
    MetricName: 'Send',
    StartTime: weekAgo,
    EndTime: now,
    Period: 604800,
    Statistics: ['Sum'],
  }).promise()

  const bounceRate = await cloudwatch.getMetricStatistics({
    Namespace: 'AWS/SES',
    MetricName: 'Reputation.BounceRate',
    StartTime: weekAgo,
    EndTime: now,
    Period: 604800,
    Statistics: ['Average'],
  }).promise()

  const complaintRate = await cloudwatch.getMetricStatistics({
    Namespace: 'AWS/SES',
    MetricName: 'Reputation.ComplaintRate',
    StartTime: weekAgo,
    EndTime: now,
    Period: 604800,
    Statistics: ['Average'],
  }).promise()

  const totalSent = metrics.Datapoints?.[0]?.Sum || 0
  const avgBounce = bounceRate.Datapoints?.[0]?.Average || 0
  const avgComplaint = complaintRate.Datapoints?.[0]?.Average || 0
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

  return report
}
```

---

## Runbook: High Bounce Rate

### Immediate Actions
1. Check for bulk signup attacks (bot registrations)
2. Review recent code changes to email sending
3. Check if sending to purchased/old email lists

### Investigation
1. Query CloudWatch Logs for bounced addresses
2. Check bounce types (hard vs soft)
3. Identify patterns (domain, time, email type)

### Remediation
1. Add email validation on signup
2. Implement double opt-in
3. Clean email list (remove hard bounces)
4. Add CAPTCHA if bot attack

### Prevention
1. Regular list hygiene
2. Validate email format and MX records
3. Monitor trends weekly

---

## SES Production Access Request Template

When requesting production access, include:

1. **Use Case**: Transactional emails for user authentication (verification codes, password resets)
2. **Expected Volume**: ~X emails/day initially, scaling to Y
3. **Bounce Handling**: SNS notifications with Lambda processing
4. **Complaint Handling**: SNS notifications, immediate suppression
5. **Content Type**: Transactional only, no marketing

---

## Email Template Example

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://legomoc.com/logo.png" alt="LEGO MOC" style="height: 40px;">
    </div>

    <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Verify Your Email</h1>

    <p style="color: #666; font-size: 16px; line-height: 1.5;">
      Thanks for signing up! Use the code below to verify your email address:
    </p>

    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">
        {####}
      </span>
    </div>

    <p style="color: #999; font-size: 14px;">
      This code expires in 24 hours. If you didn't request this, you can safely ignore this email.
    </p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

    <p style="color: #999; font-size: 12px; text-align: center;">
      LEGO MOC - Building creativity, one brick at a time
    </p>
  </div>
</body>
</html>
```

---

## Dependencies

- Domain DNS access for verification records
- AWS account with SES access
- Cognito User Pool (existing)
- CloudWatch access
- SNS topics for alerts
- Slack webhook (optional)

---

## Change Log

| Date       | Version | Description                     | Author      |
|------------|---------|--------------------------------|-------------|
| 2025-11-28 | 0.1     | Initial story drafts           | Claude Code |
| 2026-01-24 | 0.2     | Consolidated into epic plan    | Claude      |
