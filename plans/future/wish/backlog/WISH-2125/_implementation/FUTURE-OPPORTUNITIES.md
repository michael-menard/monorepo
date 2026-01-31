# Future Opportunities - WISH-2125

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **IP anonymization/hashing for GDPR compliance**: Storing full IP addresses in logs may violate GDPR/privacy regulations in some jurisdictions. Consider hashing or partial anonymization (e.g., 203.0.113.0/24 instead of 203.0.113.45). | Medium | Low | Add IP hashing utility with configurable anonymization levels. Document data retention policy. Phase 6+ privacy enhancement. |
| 2 | **Geolocation accuracy metrics tracking**: No way to measure MaxMind accuracy over time or detect when database becomes stale. | Low | Low | Add CloudWatch custom metrics for geolocation lookup failures, null results rate, database age. Track accuracy degradation over time. |
| 3 | **Missing integration with rate limiting (AC 9 incomplete)**: AC 9 says "IP extraction utility reused in rate limiting middleware" but doesn't specify implementation details. Rate limiting middleware may not exist yet or may need modification. | Medium | Medium | Verify rate limiting middleware exists (WISH-2008 AC 24), ensure it imports shared IP extraction utility. Add integration test covering both auth logging and rate limiting using same IP source. |
| 4 | **CloudWatch Logs Insights query examples not production-tested**: AC 5 requires 4+ query examples but doesn't specify they must be tested against real log data. Queries may fail on actual CloudWatch data structure. | Medium | Low | Add validation step: run all query examples against test CloudWatch logs with sample IP/geolocation data before marking AC 5 complete. |
| 5 | **No alerting for geolocation lookup failures**: If MaxMind database corrupted or Lambda layer missing, lookups fail silently (graceful degradation to null). No alerts for degraded observability. | Low | Low | Add CloudWatch alarm for spike in null geolocation results (>20% of authorization failures). Phase 5+ monitoring enhancement. |
| 6 | **IPv6 support not explicitly tested**: AC 1 mentions "IPv6 address extraction" but no specific IPv6 test scenarios in AC 12. MaxMind lookup may behave differently for IPv6. | Low | Low | Add explicit IPv6 test cases: extraction from X-Forwarded-For, geolocation lookup accuracy for IPv6 addresses. |
| 7 | **Lambda cold start database loading not benchmarked**: AC 7 specifies "<10ms with caching" but only for warm starts. Cold start database loading time not specified or tested. May cause Lambda timeout spikes. | Medium | Low | Benchmark cold start database load time, add CloudWatch metric for cold vs warm start latency. Document acceptable cold start latency (likely 100-200ms for 50MB database). |
| 8 | **Database update automation missing**: AC 6 mentions "monthly updates via cron or manual process" but doesn't specify implementation. Manual updates likely to be forgotten, leading to stale geolocation data. | Medium | Medium | Defer to follow-up story (already listed in WISH-2125 Follow-up Stories: "Automated MaxMind Database Update Cron Job"). Phase 6+. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **VPN/Proxy detection**: MaxMind offers VPN detection database (commercial). Could flag access from VPNs/proxies for higher-confidence anomaly detection. | Medium | High | Phase 6 follow-up story (already listed: WISH-XXXX VPN/Anonymization Service Detection). Requires commercial MaxMind subscription (~$200-500/month). |
| 2 | **Historical geolocation backfill**: Existing authorization failure logs from WISH-2008 lack IP/geolocation data. Historical analysis limited to post-WISH-2125 logs. | Low | Medium | Add one-time backfill script to parse existing CloudWatch logs, extract IPs from request context (if available), perform retroactive geolocation lookup. Low priority - forward-looking MVP is sufficient. |
| 3 | **User-facing geolocation features**: Story is backend-only (observability). Could expose "Recent Access Locations" on user account security page for transparency. | Medium | High | Phase 6 follow-up story (already listed: WISH-XXXX User Account Security Page - Recent Access Locations). Requires frontend UI + privacy policy updates. |
| 4 | **Geolocation-based session timeout**: High-security enhancement - auto-logout if user accesses from different country within short timeframe. | High | High | Phase 6+ security feature. Requires UX design for handling legitimate travel scenarios (false positives). Consider feature flag for opt-in. |
| 5 | **Admin security dashboard**: Visualize geographic access patterns, top offending IPs, country-level heatmap. Requires frontend dashboard + data aggregation. | High | High | Phase 6 follow-up story (already listed: WISH-XXXX Admin Security Dashboard with Geographic Access Patterns). Depends on WISH-2125 logging foundation. |
| 6 | **Custom threat intelligence feeds integration**: Integrate IP reputation feeds (e.g., AbuseIPDB, IPQualityScore) to auto-flag known malicious IPs. | Medium | High | Phase 6 follow-up story (already listed: WISH-XXXX Custom Threat Intelligence Feeds Integration). Requires API subscriptions + adapter pattern. |
| 7 | **CloudWatch alarms for geographic anomalies**: Auto-alerts for suspicious patterns (e.g., >100 unauthorized access attempts from single country in 1 hour). | Medium | Medium | Phase 6 follow-up story (already listed: WISH-XXXX CloudWatch Alarms for Geographic Anomalies). Requires CloudWatch Insights scheduled queries + SNS topics. |
| 8 | **IP extraction standardization across all domains**: Currently only applied to wishlist endpoints. Gallery, sets, instructions, etc. could benefit from same IP/geolocation logging on authorization failures. | Medium | Low | After WISH-2125 proves value, extend IP extraction utility to all domains with authorization middleware. Add to shared middleware package. Phase 5+. |
| 9 | **Geolocation caching layer**: Reduce MaxMind database lookups by caching IP→geolocation mappings in Redis (TTL 24 hours). IP addresses don't move frequently. | Low | Medium | Performance optimization for high-traffic scenarios. Likely premature for MVP - MaxMind in-memory database is already fast (<10ms). Consider if p95 latency exceeds 10ms in production. |
| 10 | **Structured log field standardization**: Story adds IP/geolocation fields to authorization logs but doesn't define schema for other log types (errors, performance, etc.). Consider centralizing structured log schema. | Low | Medium | Add to @repo/logger package: standardized log field schemas (AuthLogFields, PerformanceLogFields, ErrorLogFields) with Zod validation. Improves CloudWatch Logs Insights query consistency. |

## Categories

- **Edge Cases**: IPv6 support (#6), geolocation accuracy edge cases
- **UX Polish**: User-facing geolocation features (#3), transparency features
- **Performance**: Geolocation caching (#9), cold start optimization (#7)
- **Observability**: Accuracy metrics (#2), alerting for failures (#5), CloudWatch alarms (#7)
- **Integrations**: VPN detection (#1), threat intelligence feeds (#6), multi-domain IP extraction (#8)
- **Privacy & Compliance**: IP anonymization (#1), data retention policy, GDPR compliance
- **Automation**: Database update automation (#8 - already in follow-up stories)
- **Admin Tooling**: Security dashboard (#5 - already in follow-up stories)
