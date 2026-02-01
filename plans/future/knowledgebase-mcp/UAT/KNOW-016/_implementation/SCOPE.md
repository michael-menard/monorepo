# Scope - KNOW-016

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | false | No application code changes; infrastructure-only story |
| frontend | false | No UI components; monitoring via AWS CloudWatch Console |
| infra | true | CloudWatch dashboards, alarms, SNS topics, IAM policies, Terraform IaC |

## Scope Summary

This story implements PostgreSQL monitoring infrastructure using AWS CloudWatch for the Knowledge Base MCP server. It creates dashboards with key metrics visualization, configures alarms for critical thresholds (connections, CPU, memory, latency, disk space), sets up SNS topics for alert notifications, and provides comprehensive runbook documentation. All infrastructure is defined as Terraform code in `infra/monitoring/`. Documentation updates go to `apps/api/knowledge-base/README.md`.
