# SNS Topics for Knowledge Base PostgreSQL Monitoring
# KNOW-016: PostgreSQL Monitoring Infrastructure

# ------------------------------------------------------------------------------
# SNS Topic for PostgreSQL Alerts
# ------------------------------------------------------------------------------

resource "aws_sns_topic" "postgresql_alerts" {
  name = "${var.name_prefix}-alerts-${var.environment}"

  tags = {
    Name        = "${var.name_prefix}-alerts-${var.environment}"
    Description = "SNS topic for PostgreSQL monitoring alerts"
  }
}

# ------------------------------------------------------------------------------
# SNS Topic Policy - Allow CloudWatch to Publish
# ------------------------------------------------------------------------------

resource "aws_sns_topic_policy" "postgresql_alerts" {
  arn = aws_sns_topic.postgresql_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "CloudWatchAlarmPolicy"
    Statement = [
      {
        Sid       = "AllowCloudWatchAlarms"
        Effect    = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.postgresql_alerts.arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:cloudwatch:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:alarm:${var.name_prefix}-*"
          }
        }
      }
    ]
  })
}

# ------------------------------------------------------------------------------
# Email Subscription (Optional - requires manual confirmation)
# ------------------------------------------------------------------------------

resource "aws_sns_topic_subscription" "email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.postgresql_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email

  # Note: Email subscriptions require manual confirmation.
  # After terraform apply, check email and confirm subscription.
}
