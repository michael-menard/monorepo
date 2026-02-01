# Agent Context - KNOW-016: PostgreSQL Monitoring

## Story Information

```yaml
story_id: KNOW-016
title: PostgreSQL Monitoring
feature_dir: plans/future/knowledgebase-mcp
workflow: qa-verify-story
phase: QA Verification
status: in-qa
base_path: plans/future/knowledgebase-mcp/UAT/KNOW-016/
artifacts_path: plans/future/knowledgebase-mcp/UAT/KNOW-016/_implementation/
pm_path: plans/future/knowledgebase-mcp/UAT/KNOW-016/_pm/
created_at: 2026-01-31T19:45:00Z
moved_from: plans/future/knowledgebase-mcp/ready-for-qa/KNOW-016/
```

## Key Files

| File | Purpose |
|------|---------|
| KNOW-016.md | Story definition with 13 acceptance criteria |
| ELAB-KNOW-016.md | Elaboration report with user decisions |
| _implementation/SCOPE.md | Scope flags (infra-only) |
| _implementation/ANALYSIS.md | Initial analysis with audit results |

## Implementation Targets

| Location | Content |
|----------|---------|
| infra/monitoring/ | Terraform files for CloudWatch, SNS, IAM |
| apps/api/knowledge-base/README.md | Monitoring documentation and runbooks |

## Acceptance Criteria Summary

1. AC1: CloudWatch Dashboard Created (6 metric widgets)
2. AC2: Key Metrics Collected (AWS/RDS namespace)
3. AC3: CloudWatch Alarms Configured (6 alarms including disk space and no-data)
4. AC4: SNS Topic and Subscriptions
5. AC5: Alert Testing
6. AC6: Infrastructure-as-Code (Terraform)
7. AC7: Threshold Documentation
8. AC8: Runbook Documentation with escalation policy
9. AC9: IAM Permissions Documented
10. AC10: Staging Environment Validation
11. AC11: Cost Estimation
12. AC12: Error Handling
13. AC13: Multi-Environment Support

## Key Decisions

- IaC Tooling: Terraform (consistent with infrastructure patterns)
- Metric Source: AWS/RDS namespace (standard RDS metrics)
- Alert Thresholds: 80% connections, 80% CPU, <10% memory, >100ms latency, <10% disk
- SNS Topics: Separate topics per environment (staging/production)
