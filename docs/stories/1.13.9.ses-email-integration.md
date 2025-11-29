# Story 1.13.9: SES Email Integration

## Status

Approved

## Priority

Low (Production Readiness)

## Story

**As a** product owner,
**I want** Cognito to use Amazon SES for sending emails,
**so that** we can send branded emails from our domain with higher volume limits and better deliverability.

## Background

Currently, Cognito uses its default email service which has significant limitations:

- 50 emails per day limit
- Sender address: `no-reply@verificationemail.com`
- No custom branding
- Limited deliverability control

For production, we need SES integration to remove these limitations.

## Acceptance Criteria

1. ⬜ SES domain verified for production email sending
2. ⬜ SES moved out of sandbox mode (production access)
3. ⬜ SPF record configured for email authentication
4. ⬜ DKIM signing enabled for email deliverability
5. ⬜ DMARC policy configured
6. ⬜ Cognito User Pool configured to use SES
7. ⬜ Custom sender email address (e.g., `noreply@legomoc.com`)
8. ⬜ Reply-to address configured (e.g., `support@legomoc.com`)
9. ⬜ Email templates customized with branding
10. ⬜ Bounce and complaint handling configured
11. ⬜ Email sending tested in staging environment
12. ⬜ Documentation updated

## Tasks / Subtasks

- [ ] **Task 1: SES Domain Setup** (AC: 1, 3, 4, 5)
  - [ ] Add domain to SES
  - [ ] Verify domain ownership via DNS
  - [ ] Add SPF record to DNS
  - [ ] Enable DKIM and add CNAME records
  - [ ] Configure DMARC policy
  - [ ] Verify email identity for sender address

- [ ] **Task 2: SES Production Access** (AC: 2)
  - [ ] Review AWS SES sending limits
  - [ ] Submit production access request
  - [ ] Provide use case details to AWS
  - [ ] Wait for approval (24-48 hours)

- [ ] **Task 3: Cognito SES Integration** (AC: 6, 7, 8)
  - [ ] Update Cognito User Pool email configuration
  - [ ] Set EmailSendingAccount to DEVELOPER
  - [ ] Configure SourceArn for SES identity
  - [ ] Set custom From and Reply-To addresses
  - [ ] Deploy infrastructure changes

- [ ] **Task 4: Email Templates** (AC: 9)
  - [ ] Design branded email template
  - [ ] Create verification code email template
  - [ ] Create password reset email template
  - [ ] Create welcome email template (optional)
  - [ ] Test email rendering across clients

- [ ] **Task 5: Monitoring & Handling** (AC: 10)
  - [ ] Configure SNS topic for bounces
  - [ ] Configure SNS topic for complaints
  - [ ] Set up Lambda to handle bounce notifications
  - [ ] Set up CloudWatch alarms for bounce rate
  - [ ] Document suppression list management

- [ ] **Task 6: Testing & Documentation** (AC: 11, 12)
  - [ ] Test email sending in staging
  - [ ] Verify emails land in inbox (not spam)
  - [ ] Test with multiple email providers (Gmail, Outlook, etc.)
  - [ ] Document SES configuration
  - [ ] Document DNS requirements for ops team

## Dev Notes

### Current Cognito Configuration

```yaml
# Current (Default Cognito Email)
VerificationMessageTemplate:
  DefaultEmailOption: CONFIRM_WITH_CODE
  EmailMessage: 'Your LEGO MOC verification code is {####}.'
  EmailSubject: 'LEGO MOC - Verify your email'
```

### Updated Configuration for SES

**Serverless Framework (serverless.yml):**

```yaml
UserPoolEmailConfiguration:
  EmailSendingAccount: DEVELOPER
  From: 'LEGO MOC <noreply@legomoc.com>'
  ReplyToEmailAddress: support@legomoc.com
  SourceArn: !Sub 'arn:aws:ses:${AWS::Region}:${AWS::AccountId}:identity/legomoc.com'
```

**CDK (cognito.ts):**

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

### DNS Records Required

| Type  | Name                    | Value                                  |
| ----- | ----------------------- | -------------------------------------- |
| TXT   | \_amazonses.legomoc.com | (provided by SES)                      |
| CNAME | selector1.\_domainkey   | selector1.dkim.amazonses.com           |
| CNAME | selector2.\_domainkey   | selector2.dkim.amazonses.com           |
| CNAME | selector3.\_domainkey   | selector3.dkim.amazonses.com           |
| TXT   | legomoc.com             | v=spf1 include:amazonses.com ~all      |
| TXT   | \_dmarc.legomoc.com     | v=DMARC1; p=quarantine; rua=mailto:... |

### SES Production Access Request Template

When requesting production access, include:

1. **Use Case**: Transactional emails for user authentication (verification codes, password resets)
2. **Expected Volume**: ~X emails/day initially, scaling to Y
3. **Bounce Handling**: SNS notifications with Lambda processing
4. **Complaint Handling**: SNS notifications, immediate suppression
5. **Content Type**: Transactional only, no marketing

### Bounce/Complaint Handling Lambda

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
        // Add to suppression list or mark user email as invalid
        for (const recipient of notification.bounce?.bouncedRecipients || []) {
          await handlePermanentBounce(recipient.emailAddress)
        }
      }
    }

    if (notification.notificationType === 'Complaint') {
      // User marked email as spam - suppress immediately
      for (const recipient of notification.complaint?.complainedRecipients || []) {
        await handleComplaint(recipient.emailAddress)
      }
    }
  }
}
```

### Email Template Example

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify Your Email</title>
  </head>
  <body
    style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;"
  >
    <div
      style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
    >
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://legomoc.com/logo.png" alt="LEGO MOC" style="height: 40px;" />
      </div>

      <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Verify Your Email</h1>

      <p style="color: #666; font-size: 16px; line-height: 1.5;">
        Thanks for signing up! Use the code below to verify your email address:
      </p>

      <div
        style="background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;"
      >
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">
          {####}
        </span>
      </div>

      <p style="color: #999; font-size: 14px;">
        This code expires in 24 hours. If you didn't request this, you can safely ignore this email.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

      <p style="color: #999; font-size: 12px; text-align: center;">
        LEGO MOC &bull; Building creativity, one brick at a time
      </p>
    </div>
  </body>
</html>
```

### CloudWatch Alarms

```yaml
# Bounce rate alarm (SES suspends at 10%)
SESBounceRateAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: ses-bounce-rate-high
    MetricName: Reputation.BounceRate
    Namespace: AWS/SES
    Statistic: Average
    Period: 3600
    EvaluationPeriods: 1
    Threshold: 0.05 # 5% - warn before SES suspends at 10%
    ComparisonOperator: GreaterThanThreshold
    AlarmActions:
      - !Ref AlertSNSTopic

# Complaint rate alarm (SES suspends at 0.5%)
SESComplaintRateAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: ses-complaint-rate-high
    MetricName: Reputation.ComplaintRate
    Namespace: AWS/SES
    Statistic: Average
    Period: 3600
    EvaluationPeriods: 1
    Threshold: 0.001 # 0.1% - warn before SES suspends at 0.5%
    ComparisonOperator: GreaterThanThreshold
    AlarmActions:
      - !Ref AlertSNSTopic
```

## SES vs Cognito Default Comparison

| Feature         | Cognito Default                | SES Integration                 |
| --------------- | ------------------------------ | ------------------------------- |
| Daily Limit     | 50 emails                      | Unlimited (after prod access)   |
| Sender Address  | no-reply@verificationemail.com | Custom (noreply@yourdomain.com) |
| Custom Branding | Limited                        | Full HTML templates             |
| Deliverability  | Basic                          | SPF/DKIM/DMARC                  |
| Bounce Handling | None                           | SNS notifications               |
| Analytics       | None                           | CloudWatch metrics              |
| Cost            | Free                           | ~$0.10 per 1000 emails          |

## Dependencies

- Domain DNS access for verification records
- AWS account with SES access
- Story 1.13: Amplify Configuration (Complete)

## Risks

1. **SES Production Access Delay**: AWS review can take 24-48 hours
2. **DNS Propagation**: Record changes may take up to 48 hours
3. **Email Deliverability**: New domains may have lower reputation initially

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2025-11-28 | 0.1     | Initial draft | Claude Code |
