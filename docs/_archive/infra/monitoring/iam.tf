# IAM Policies for Knowledge Base PostgreSQL Monitoring
# KNOW-016: PostgreSQL Monitoring Infrastructure

# ------------------------------------------------------------------------------
# IAM Policy for CloudWatch Monitoring Access
# This policy grants permissions needed to deploy and manage monitoring resources
# ------------------------------------------------------------------------------

resource "aws_iam_policy" "cloudwatch_monitoring" {
  name        = "${var.name_prefix}-monitoring-policy-${var.environment}"
  path        = "/"
  description = "IAM policy for CloudWatch monitoring of PostgreSQL RDS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # CloudWatch Dashboard permissions
      {
        Sid    = "CloudWatchDashboards"
        Effect = "Allow"
        Action = [
          "cloudwatch:PutDashboard",
          "cloudwatch:GetDashboard",
          "cloudwatch:DeleteDashboards",
          "cloudwatch:ListDashboards"
        ]
        Resource = "arn:aws:cloudwatch::${data.aws_caller_identity.current.account_id}:dashboard/${var.name_prefix}-*"
      },

      # CloudWatch Alarms permissions
      {
        Sid    = "CloudWatchAlarms"
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricAlarm",
          "cloudwatch:DescribeAlarms",
          "cloudwatch:DeleteAlarms",
          "cloudwatch:DescribeAlarmHistory",
          "cloudwatch:SetAlarmState"
        ]
        Resource = "arn:aws:cloudwatch:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:alarm:${var.name_prefix}-*"
      },

      # CloudWatch Metrics permissions (read-only for viewing)
      {
        Sid    = "CloudWatchMetrics"
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricData",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics"
        ]
        Resource = "*"
      },

      # SNS permissions for alert topics
      {
        Sid    = "SNSTopics"
        Effect = "Allow"
        Action = [
          "sns:CreateTopic",
          "sns:DeleteTopic",
          "sns:GetTopicAttributes",
          "sns:SetTopicAttributes",
          "sns:Subscribe",
          "sns:Unsubscribe",
          "sns:Publish",
          "sns:ListSubscriptionsByTopic"
        ]
        Resource = "arn:aws:sns:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${var.name_prefix}-*"
      },

      # RDS describe permissions (for metric verification)
      {
        Sid    = "RDSDescribe"
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances"
        ]
        Resource = "arn:aws:rds:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:db:${var.rds_instance_id}"
      }
    ]
  })

  tags = {
    Name        = "${var.name_prefix}-monitoring-policy-${var.environment}"
    Description = "Permissions for CloudWatch monitoring deployment and management"
  }
}

# ------------------------------------------------------------------------------
# IAM Policy Document (for documentation purposes)
# This is the policy JSON that should be documented in the README
# ------------------------------------------------------------------------------

output "iam_policy_json" {
  description = "IAM policy JSON for CloudWatch monitoring access"
  value = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudWatchDashboards"
        Effect = "Allow"
        Action = [
          "cloudwatch:PutDashboard",
          "cloudwatch:GetDashboard",
          "cloudwatch:DeleteDashboards",
          "cloudwatch:ListDashboards"
        ]
        Resource = "arn:aws:cloudwatch::*:dashboard/kb-postgres-*"
      },
      {
        Sid    = "CloudWatchAlarms"
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricAlarm",
          "cloudwatch:DescribeAlarms",
          "cloudwatch:DeleteAlarms",
          "cloudwatch:DescribeAlarmHistory",
          "cloudwatch:SetAlarmState"
        ]
        Resource = "arn:aws:cloudwatch:*:*:alarm:kb-postgres-*"
      },
      {
        Sid    = "CloudWatchMetrics"
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricData",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics"
        ]
        Resource = "*"
      },
      {
        Sid    = "SNSTopics"
        Effect = "Allow"
        Action = [
          "sns:CreateTopic",
          "sns:DeleteTopic",
          "sns:GetTopicAttributes",
          "sns:SetTopicAttributes",
          "sns:Subscribe",
          "sns:Unsubscribe",
          "sns:Publish",
          "sns:ListSubscriptionsByTopic"
        ]
        Resource = "arn:aws:sns:*:*:kb-postgres-*"
      },
      {
        Sid    = "RDSDescribe"
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances"
        ]
        Resource = "*"
      }
    ]
  })
}
