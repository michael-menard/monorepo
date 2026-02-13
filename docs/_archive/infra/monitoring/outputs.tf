# Outputs for Knowledge Base PostgreSQL Monitoring
# KNOW-016: PostgreSQL Monitoring Infrastructure

output "sns_topic_arn" {
  description = "ARN of the SNS topic for PostgreSQL alerts"
  value       = aws_sns_topic.postgresql_alerts.arn
}

output "sns_topic_name" {
  description = "Name of the SNS topic for PostgreSQL alerts"
  value       = aws_sns_topic.postgresql_alerts.name
}

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.postgresql.dashboard_name
}

output "dashboard_url" {
  description = "URL to access the CloudWatch dashboard"
  value       = "https://${data.aws_region.current.name}.console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#dashboards:name=${aws_cloudwatch_dashboard.postgresql.dashboard_name}"
}

output "alarm_names" {
  description = "List of CloudWatch alarm names created"
  value = [
    aws_cloudwatch_metric_alarm.high_connections.alarm_name,
    aws_cloudwatch_metric_alarm.high_cpu.alarm_name,
    aws_cloudwatch_metric_alarm.low_memory.alarm_name,
    aws_cloudwatch_metric_alarm.high_read_latency.alarm_name,
    aws_cloudwatch_metric_alarm.low_disk_space.alarm_name,
    aws_cloudwatch_metric_alarm.no_data.alarm_name,
  ]
}

output "iam_policy_arn" {
  description = "ARN of the IAM policy for CloudWatch monitoring access"
  value       = aws_iam_policy.cloudwatch_monitoring.arn
}

output "environment" {
  description = "Deployment environment"
  value       = var.environment
}
