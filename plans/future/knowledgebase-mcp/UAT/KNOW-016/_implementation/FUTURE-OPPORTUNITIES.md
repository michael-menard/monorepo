# Future Opportunities - KNOW-016

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Connection pool metrics not explicitly addressed | Medium | Low | Verify RDS Enhanced Monitoring exposes connection pool metrics; if not available, document workaround (query PostgreSQL directly via pg_stat_activity) |
| 2 | Alert fatigue mitigation strategy (QA Gap #2) | Medium | Low | Document alert tuning SLA: investigate if >5 false positives/week, adjust thresholds within 48 hours. Add to runbook. |
| 3 | Runbook escalation procedures vague (QA Gap #5) | Medium | Low | Define escalation tiers and response time SLAs (P0: 15 min, P1: 1 hour, P2: next business day). Add to AC8 runbook. |
| 4 | Dashboard refresh rate hardcoded (QA Gap #8) | Low | Low | 5-minute auto-refresh is operational default; document how to customize in CloudWatch console for different use cases. |
| 5 | No monitoring for monitoring infrastructure (QA Gap #1) | Low | High | Dead man's switch monitoring (CloudWatch alarm that triggers if no alarms have triggered recently) - valuable but adds complexity; defer to future. |
| 6 | Alarm action groups not mentioned (QA Gap #7) | Low | Medium | Severity-based SNS topics (critical vs warning) - current design uses single SNS topic per environment; multi-topic routing deferred to future enhancement. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Anomaly detection for baseline-free alerting (QA Enhancement #2) | High | Medium | Implement CloudWatch anomaly detection after 2-4 week baseline period; eliminates need for manual threshold tuning. Creates KNOW-016-follow-up story. |
| 2 | Composite alarms for reduced noise (QA Enhancement #3) | Medium | Low | Implement composite alarms for database health state (critical = multiple conditions met simultaneously, e.g., high CPU AND low memory). Reduces alert fatigue. |
| 3 | Dashboard templates for reusability (QA Enhancement #5) | Medium | Low | Extract dashboard JSON into reusable template with parameterized variables (RDS instance ID, environment name). Enables quick deployment to new environments. |
| 4 | Cost attribution tags (QA Enhancement #7) | Medium | Low | Add resource tags to IaC for cost tracking (project: "knowledgebase-mcp", environment: "staging/production"). Enables AWS Cost Explorer filtering. |
| 5 | Dashboard export for incident reports (QA Enhancement #8) | Medium | Low | Document how to export dashboard graphs (screenshots, CSV data, CloudWatch API queries) for incident postmortems and retrospectives. |
| 6 | Auto-remediation for common issues (QA Enhancement #6) | High | High | Document as future enhancement; extremely high effort (Lambda functions, Step Functions, EventBridge integration). Defer to post-MVP after operational experience gathered. |
| 7 | CloudWatch Insights for log analysis (QA Enhancement #1) | Medium | Medium | Not using CloudWatch Logs for MVP; defer to follow-up story. Would require app instrumentation and log shipping. |
| 8 | Slack integration for faster response (QA Enhancement #4) | Medium | Low | Email notifications sufficient for MVP; defer Slack webhook integration to post-MVP based on team preference. |

## Categories

- **Edge Cases**: Alert fatigue (#2), dashboard refresh rate (#4), connection pool metrics (#1)
- **UX Polish**: Dashboard templates (#3), export for reports (#5)
- **Performance**: Not applicable (infrastructure monitoring story)
- **Observability**: Monitoring for monitoring (#5), anomaly detection (#1), composite alarms (#2), CloudWatch Insights (#7)
- **Integrations**: Slack integration (#8), auto-remediation (#6)
- **Operational Excellence**: Escalation procedures (#3), cost attribution (#4), severity-based routing (#6)

## Recommended Follow-up Stories

### KNOW-016-A: Advanced Alerting (Post-MVP)
**Effort**: 2 story points
**Scope**:
- Composite alarms for multi-condition health checks
- Anomaly detection baselines (after 2-4 weeks of data)
- Severity-based SNS topic routing (critical vs warning)
- Alert tuning runbook with SLAs

**Value**: Reduces alert fatigue, improves signal-to-noise ratio

### KNOW-016-B: Operational Tooling (Post-MVP)
**Effort**: 2 story points
**Scope**:
- Dashboard templates with parameterized variables
- Cost attribution tags for all CloudWatch resources
- Incident report export procedures
- Escalation tier definitions and response time SLAs

**Value**: Improves operational efficiency, cost visibility, incident response

### KNOW-016-C: Extended Monitoring (Future)
**Effort**: 5 story points
**Scope**:
- CloudWatch Logs integration (application logs + database logs)
- CloudWatch Insights queries for log analysis
- Slack webhook integration for notifications
- Dead man's switch monitoring (monitoring for monitoring)

**Value**: Comprehensive observability, faster incident response

**Note**: KNOW-016-C depends on application instrumentation (separate story for adding structured logging to KB MCP server).

## Implementation Notes for PM

When integrating QA Discovery gaps into main story:
1. **Add to AC1 (Dashboard)**: FreeStorageSpace metric widget
2. **Add to AC3 (Alarms)**:
   - Alarm for FreeStorageSpace <10% free (5-minute evaluation)
   - Alarm for "no data" on DatabaseConnections metric (15+ minutes)
3. **Add to AC7 (Thresholds)**: Document FreeStorageSpace threshold
4. **Add to AC8 (Runbooks)**:
   - Runbook for disk space alerts (investigate large tables, plan storage increase)
   - Runbook for "no metrics" scenario (check RDS instance running, CloudWatch permissions)
   - Escalation procedures with response time SLAs
5. **Clarify in AC2 or README**: Connection pool metrics availability (Enhanced Monitoring required)

These additions keep story size reasonable (adds ~2 ACs worth of scope = still 3 story points).
