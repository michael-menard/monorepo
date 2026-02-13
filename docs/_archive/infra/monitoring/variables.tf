# Variables for Knowledge Base PostgreSQL Monitoring
# KNOW-016: PostgreSQL Monitoring Infrastructure

# ------------------------------------------------------------------------------
# Required Variables
# ------------------------------------------------------------------------------

variable "environment" {
  description = "Deployment environment (staging or production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be 'staging' or 'production'."
  }
}

variable "rds_instance_id" {
  description = "RDS instance identifier for metric queries"
  type        = string
}

# ------------------------------------------------------------------------------
# Optional Variables with Defaults
# ------------------------------------------------------------------------------

variable "aws_region" {
  description = "AWS region for CloudWatch resources"
  type        = string
  default     = "us-west-2"
}

variable "alert_email" {
  description = "Email address for alert notifications (must be confirmed manually)"
  type        = string
  default     = ""
}

# ------------------------------------------------------------------------------
# Alarm Threshold Variables (Environment-specific)
# ------------------------------------------------------------------------------

variable "alarm_connection_threshold" {
  description = "Threshold for high connections alarm (percentage of max_connections)"
  type        = number
  default     = 80
}

variable "alarm_cpu_threshold" {
  description = "Threshold for high CPU alarm (percentage)"
  type        = number
  default     = 80
}

variable "alarm_memory_threshold_percent" {
  description = "Threshold for low memory alarm (percentage of total memory remaining)"
  type        = number
  default     = 10
}

variable "alarm_latency_threshold_ms" {
  description = "Threshold for high latency alarm (milliseconds)"
  type        = number
  default     = 100
}

variable "alarm_disk_threshold_percent" {
  description = "Threshold for low disk space alarm (percentage of total disk remaining)"
  type        = number
  default     = 10
}

variable "alarm_evaluation_periods" {
  description = "Number of periods to evaluate for alarms"
  type        = number
  default     = 3
}

variable "alarm_datapoints_to_alarm" {
  description = "Number of datapoints that must breach threshold to trigger alarm"
  type        = number
  default     = 2
}

variable "alarm_period_seconds" {
  description = "Period in seconds for alarm evaluation"
  type        = number
  default     = 300 # 5 minutes
}

# ------------------------------------------------------------------------------
# Dashboard Variables
# ------------------------------------------------------------------------------

variable "dashboard_refresh_interval" {
  description = "Dashboard auto-refresh interval in seconds"
  type        = number
  default     = 300 # 5 minutes
}

# ------------------------------------------------------------------------------
# Resource Naming
# ------------------------------------------------------------------------------

variable "name_prefix" {
  description = "Prefix for all resource names"
  type        = string
  default     = "kb-postgres"
}
