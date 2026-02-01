# CloudWatch Dashboard for Knowledge Base PostgreSQL Monitoring
# KNOW-016: PostgreSQL Monitoring Infrastructure

# ------------------------------------------------------------------------------
# CloudWatch Dashboard
# ------------------------------------------------------------------------------

resource "aws_cloudwatch_dashboard" "postgresql" {
  dashboard_name = "${var.name_prefix}-dashboard-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      # Row 1: Connections and CPU
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Database Connections"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", var.rds_instance_id, {
              stat   = "Average"
              period = 300
              label  = "Average Connections"
            }],
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", var.rds_instance_id, {
              stat   = "Maximum"
              period = 300
              label  = "Max Connections"
            }]
          ]
          annotations = {
            horizontal = [
              {
                label = "Alarm Threshold"
                value = var.alarm_connection_threshold
                color = "#ff0000"
              }
            ]
          }
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "CPU Utilization (%)"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_instance_id, {
              stat   = "Average"
              period = 300
              label  = "CPU %"
            }]
          ]
          annotations = {
            horizontal = [
              {
                label = "Alarm Threshold"
                value = var.alarm_cpu_threshold
                color = "#ff0000"
              }
            ]
          }
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },

      # Row 2: Memory and Disk
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "Freeable Memory (GB)"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/RDS", "FreeableMemory", "DBInstanceIdentifier", var.rds_instance_id, {
              stat   = "Average"
              period = 300
              label  = "Freeable Memory"
            }]
          ]
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "Free Storage Space (GB)"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", var.rds_instance_id, {
              stat   = "Average"
              period = 300
              label  = "Free Storage"
            }]
          ]
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },

      # Row 3: Read and Write Latency
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "Read Latency (ms)"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/RDS", "ReadLatency", "DBInstanceIdentifier", var.rds_instance_id, {
              stat   = "Average"
              period = 300
              label  = "Avg Read Latency"
            }],
            ["AWS/RDS", "ReadLatency", "DBInstanceIdentifier", var.rds_instance_id, {
              stat   = "Maximum"
              period = 300
              label  = "Max Read Latency"
            }]
          ]
          annotations = {
            horizontal = [
              {
                label = "Alarm Threshold"
                value = var.alarm_latency_threshold_ms / 1000
                color = "#ff0000"
              }
            ]
          }
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "Write Latency (ms)"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/RDS", "WriteLatency", "DBInstanceIdentifier", var.rds_instance_id, {
              stat   = "Average"
              period = 300
              label  = "Avg Write Latency"
            }],
            ["AWS/RDS", "WriteLatency", "DBInstanceIdentifier", var.rds_instance_id, {
              stat   = "Maximum"
              period = 300
              label  = "Max Write Latency"
            }]
          ]
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },

      # Row 4: Alarm Status Overview
      {
        type   = "alarm"
        x      = 0
        y      = 18
        width  = 24
        height = 3
        properties = {
          title = "Alarm Status"
          alarms = [
            "arn:aws:cloudwatch:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:alarm:${var.name_prefix}-high-connections-${var.environment}",
            "arn:aws:cloudwatch:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:alarm:${var.name_prefix}-high-cpu-${var.environment}",
            "arn:aws:cloudwatch:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:alarm:${var.name_prefix}-low-memory-${var.environment}",
            "arn:aws:cloudwatch:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:alarm:${var.name_prefix}-high-read-latency-${var.environment}",
            "arn:aws:cloudwatch:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:alarm:${var.name_prefix}-low-disk-space-${var.environment}",
            "arn:aws:cloudwatch:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:alarm:${var.name_prefix}-no-data-${var.environment}"
          ]
        }
      }
    ]
  })
}
