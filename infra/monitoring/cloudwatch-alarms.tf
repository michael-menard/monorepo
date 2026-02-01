# CloudWatch Alarms for Knowledge Base PostgreSQL Monitoring
# KNOW-016: PostgreSQL Monitoring Infrastructure

# ------------------------------------------------------------------------------
# Local Variables for Alarm Configuration
# ------------------------------------------------------------------------------

locals {
  alarm_actions = [aws_sns_topic.postgresql_alerts.arn]
  ok_actions    = [aws_sns_topic.postgresql_alerts.arn]

  # Common dimensions for RDS metrics
  rds_dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }
}

# ------------------------------------------------------------------------------
# Alarm 1: High Database Connections
# Triggers when connections exceed 80% of max_connections
# ------------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "high_connections" {
  alarm_name          = "${var.name_prefix}-high-connections-${var.environment}"
  alarm_description   = "Database connections exceeded ${var.alarm_connection_threshold}% of max_connections. Check for connection leaks or consider scaling."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  datapoints_to_alarm = var.alarm_datapoints_to_alarm
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = var.alarm_period_seconds
  statistic           = "Average"
  threshold           = var.alarm_connection_threshold
  treat_missing_data  = "notBreaching"

  dimensions = local.rds_dimensions

  alarm_actions = local.alarm_actions
  ok_actions    = local.ok_actions

  tags = {
    Name     = "${var.name_prefix}-high-connections-${var.environment}"
    Severity = "P1"
    Runbook  = "Check for connection leaks, review connection pool settings, consider scaling"
  }
}

# ------------------------------------------------------------------------------
# Alarm 2: High CPU Utilization
# Triggers when CPU exceeds 80% for sustained period
# ------------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${var.name_prefix}-high-cpu-${var.environment}"
  alarm_description   = "CPU utilization exceeded ${var.alarm_cpu_threshold}% for sustained period. Analyze slow queries and optimize indexes."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  datapoints_to_alarm = var.alarm_datapoints_to_alarm
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = var.alarm_period_seconds
  statistic           = "Average"
  threshold           = var.alarm_cpu_threshold
  treat_missing_data  = "notBreaching"

  dimensions = local.rds_dimensions

  alarm_actions = local.alarm_actions
  ok_actions    = local.ok_actions

  tags = {
    Name     = "${var.name_prefix}-high-cpu-${var.environment}"
    Severity = "P1"
    Runbook  = "Analyze slow queries with pg_stat_statements, check for missing indexes, review query plans"
  }
}

# ------------------------------------------------------------------------------
# Alarm 3: Low Freeable Memory
# Triggers when available memory drops below 10%
# ------------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "low_memory" {
  alarm_name          = "${var.name_prefix}-low-memory-${var.environment}"
  alarm_description   = "Freeable memory dropped below ${var.alarm_memory_threshold_percent}%. Check buffer pool settings and consider instance size increase."
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  datapoints_to_alarm = var.alarm_datapoints_to_alarm
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = var.alarm_period_seconds
  statistic           = "Average"
  # Note: FreeableMemory is in bytes. This threshold assumes ~10% of a 1GB instance.
  # For production, calculate based on actual instance size.
  threshold          = 100000000 # 100MB - adjust based on instance size
  treat_missing_data = "notBreaching"

  dimensions = local.rds_dimensions

  alarm_actions = local.alarm_actions
  ok_actions    = local.ok_actions

  tags = {
    Name     = "${var.name_prefix}-low-memory-${var.environment}"
    Severity = "P1"
    Runbook  = "Check shared_buffers and work_mem settings, consider larger instance size, investigate memory leaks"
  }
}

# ------------------------------------------------------------------------------
# Alarm 4: High Read Latency
# Triggers when read latency exceeds 100ms average
# ------------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "high_read_latency" {
  alarm_name          = "${var.name_prefix}-high-read-latency-${var.environment}"
  alarm_description   = "Read latency exceeded ${var.alarm_latency_threshold_ms}ms average. Check disk I/O, query performance, and network."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  datapoints_to_alarm = var.alarm_datapoints_to_alarm
  metric_name         = "ReadLatency"
  namespace           = "AWS/RDS"
  period              = var.alarm_period_seconds
  statistic           = "Average"
  # ReadLatency is in seconds, convert threshold from ms
  threshold          = var.alarm_latency_threshold_ms / 1000
  treat_missing_data = "notBreaching"

  dimensions = local.rds_dimensions

  alarm_actions = local.alarm_actions
  ok_actions    = local.ok_actions

  tags = {
    Name     = "${var.name_prefix}-high-read-latency-${var.environment}"
    Severity = "P1"
    Runbook  = "Check disk IOPS limits, analyze slow queries, verify network latency, consider storage upgrade"
  }
}

# ------------------------------------------------------------------------------
# Alarm 5: Low Disk Space
# Triggers when free storage drops below 10%
# ------------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "low_disk_space" {
  alarm_name          = "${var.name_prefix}-low-disk-space-${var.environment}"
  alarm_description   = "Free storage space dropped below ${var.alarm_disk_threshold_percent}%. Identify large tables, plan storage increase, clean up old data."
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  datapoints_to_alarm = var.alarm_datapoints_to_alarm
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = var.alarm_period_seconds
  statistic           = "Average"
  # FreeStorageSpace is in bytes. This threshold assumes 10% of 20GB.
  # For production, calculate based on actual allocated storage.
  threshold          = 2000000000 # 2GB - adjust based on allocated storage
  treat_missing_data = "notBreaching"

  dimensions = local.rds_dimensions

  alarm_actions = local.alarm_actions
  ok_actions    = local.ok_actions

  tags = {
    Name     = "${var.name_prefix}-low-disk-space-${var.environment}"
    Severity = "P0"
    Runbook  = "Identify large tables with pg_stat_user_tables, clean up old logs/data, increase allocated storage"
  }
}

# ------------------------------------------------------------------------------
# Alarm 6: No Data (Monitoring Health)
# Triggers if DatabaseConnections has no data points for 15+ minutes
# Indicates RDS stopped, metric collection broken, or CloudWatch agent failure
# ------------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "no_data" {
  alarm_name          = "${var.name_prefix}-no-data-${var.environment}"
  alarm_description   = "No DatabaseConnections data points for 15+ minutes. Verify RDS instance is running, check CloudWatch agent status, validate metric collection."
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  datapoints_to_alarm = 3
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300 # 5 minutes
  statistic           = "SampleCount"
  threshold           = 1
  treat_missing_data  = "breaching" # Key: treat missing data as alarm condition

  dimensions = local.rds_dimensions

  alarm_actions = local.alarm_actions
  ok_actions    = local.ok_actions

  tags = {
    Name     = "${var.name_prefix}-no-data-${var.environment}"
    Severity = "P0"
    Runbook  = "Verify RDS instance status in console, check CloudWatch agent logs, validate IAM permissions for metric publishing"
  }
}
