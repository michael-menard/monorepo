# Terraform Configuration for ElastiCache Cost Monitoring (WISH-2124 AC 12)
#
# Creates CloudWatch billing alarm to monitor ElastiCache costs
# Threshold: $50/month to catch unexpected cost increases

terraform {
  required_version = ">= 1.6"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────
# Variables
# ─────────────────────────────────────────────────────────────────────────

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "monthly_cost_threshold" {
  description = "Monthly cost threshold in USD before alarm triggers"
  type        = number
  default     = 50
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for alarm notifications (optional)"
  type        = string
  default     = ""
}

# ─────────────────────────────────────────────────────────────────────────
# CloudWatch Billing Alarm
# ─────────────────────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "elasticache_monthly_cost" {
  alarm_name          = "${var.environment}-lego-api-elasticache-cost-alarm"
  alarm_description   = "ElastiCache monthly cost exceeds $${var.monthly_cost_threshold} threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600  # 6 hours (billing updates every 6 hours)
  statistic           = "Maximum"
  threshold           = var.monthly_cost_threshold
  treat_missing_data  = "notBreaching"

  dimensions = {
    ServiceName = "AmazonElastiCache"
    Currency    = "USD"
  }

  # Optional: Send notification to SNS topic
  alarm_actions = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []

  tags = {
    Name        = "${var.environment}-lego-api-elasticache-cost-alarm"
    Environment = var.environment
    Service     = "ElastiCache"
    Feature     = "FeatureFlags"
    Story       = "WISH-2124"
    ManagedBy   = "Terraform"
  }
}

# ─────────────────────────────────────────────────────────────────────────
# Additional Cost Monitoring - Data Transfer
# ─────────────────────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "elasticache_data_transfer_cost" {
  alarm_name          = "${var.environment}-lego-api-elasticache-data-transfer-alarm"
  alarm_description   = "ElastiCache data transfer costs are unusually high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600  # 6 hours
  statistic           = "Maximum"
  threshold           = 10  # $10/month for data transfer
  treat_missing_data  = "notBreaching"

  dimensions = {
    ServiceName = "AWSDataTransfer"
    Currency    = "USD"
  }

  alarm_actions = var.sns_topic_arn != "" ? [var.sns_topic_arn] : []

  tags = {
    Name        = "${var.environment}-lego-api-data-transfer-alarm"
    Environment = var.environment
    Service     = "DataTransfer"
    Feature     = "FeatureFlags"
    Story       = "WISH-2124"
    ManagedBy   = "Terraform"
  }
}

# ─────────────────────────────────────────────────────────────────────────
# Outputs
# ─────────────────────────────────────────────────────────────────────────

output "elasticache_cost_alarm_arn" {
  description = "ARN of ElastiCache cost alarm"
  value       = aws_cloudwatch_metric_alarm.elasticache_monthly_cost.arn
}

output "data_transfer_cost_alarm_arn" {
  description = "ARN of data transfer cost alarm"
  value       = aws_cloudwatch_metric_alarm.elasticache_data_transfer_cost.arn
}

output "alarm_details" {
  description = "Cost alarm configuration details"
  value = {
    elasticache_threshold    = var.monthly_cost_threshold
    data_transfer_threshold  = 10
    evaluation_period_hours  = 6
    notification_enabled     = var.sns_topic_arn != ""
  }
}
