# Future Opportunities - WISH-2023

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Compression success rate tracking** | Medium - Would provide full picture of compression effectiveness beyond just failures | Medium - Requires tracking total compression attempts, doubling telemetry volume | Phase 5 observability story: Track both success and failure with sampling to control volume. Calculate success rate = (attempts - failures) / attempts |
| 2 | **Real-time alerting for compression failures** | Low - Current graceful fallback means failures don't break user experience | Low - CloudWatch alarms on CompressionFailureRate threshold | Phase 5 monitoring story: Set CloudWatch alarm for failure rate > 10% sustained over 15 minutes. SNS notification to ops |
| 3 | **Telemetry sampling for high-volume scenarios** | Low - Unlikely to have high compression failure volume | Medium - Requires sampling logic with reservoir sampling or probabilistic sampling | Future optimization if telemetry volume exceeds 1000 events/day. Implement 10% sampling with extrapolation in metrics |
| 4 | **Client-side telemetry batching** | Low - Single failure events are small (< 1KB), batching provides minimal benefit | Medium - Requires batching queue, flush logic, retry on batch failure | Future optimization if telemetry causes frontend performance impact. Batch up to 10 events or 5-second window |
| 5 | **User-Agent parsing library (ua-parser-js)** | Low - Lightweight regex parsing sufficient for MVP browser detection | Low - Add dependency + ~20KB bundle size | Future enhancement if browser detection accuracy becomes critical. Current regex covers 95% of traffic (Chrome, Safari, Firefox, Edge) |
| 6 | **Error message sanitization** | Low - Privacy concern: error messages might leak sensitive info | Low - Add regex-based sanitization or truncation | Future security review: Sanitize error messages to remove file paths, stack traces, or URLs before logging |
| 7 | **Compression timeout tracking** | Medium - Would help identify if timeout threshold (10s) is appropriate | Low - Add timer to compressImage() function | Future story after verifying WISH-2022 timeout implementation. Track compression duration and flag slow compressions (> 5s) for optimization |
| 8 | **Size bucket granularity** | Low - Current 4 buckets (< 1MB, 1-5MB, 5-10MB, > 10MB) may be too coarse | Low - Add more buckets or make configurable | Future analysis if size patterns require finer granularity. Consider logarithmic buckets: < 500KB, 500KB-1MB, 1-2MB, 2-5MB, 5-10MB, > 10MB |
| 9 | **Format-specific error tracking** | Low - Current error types are generic across all formats | Low - Add format-specific error codes (e.g., HEIC unsupported) | Future enhancement when WISH-2045 (HEIC support) is implemented. Track format-specific errors for targeted fixes |
| 10 | **CloudWatch Logs retention policy** | Low - Default retention is indefinite, incurs storage costs over time | Low - Set retention policy via IaC (7 days or 30 days) | Future cost optimization: Set CloudWatch Logs retention to 30 days for compression failure logs. Longer retention unnecessary for failure pattern analysis |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **CloudWatch Dashboard for compression metrics** | Medium - Visual dashboard would improve observability for ops | Medium - Create CloudWatch dashboard with widgets for failure rate, format distribution, browser distribution, error type trends | Phase 5 observability: Pre-built CloudWatch dashboard with 4 widgets: (1) Failure count timeline, (2) Failure rate by format, (3) Failure rate by browser, (4) Error type distribution. Export as CloudFormation template |
| 2 | **Automatic compression setting adjustments based on failure rate** | High - Could auto-optimize compression quality/timeout based on failure patterns | High - Requires feedback loop, A/B testing, machine learning for optimal settings | Future intelligent compression story: If browser/format shows > 20% failure rate, automatically reduce quality setting or skip compression for that combination |
| 3 | **Telemetry-driven compression quality presets** | Medium - Inform WISH-2046 (compression quality presets) with real data | Medium - Analyze telemetry to identify optimal quality settings per browser/format | Phase 5 data analysis: Use 30-day telemetry data to recommend compression presets. Example: Safari + HEIC → skip compression (high failure rate) |
| 4 | **A/B testing for compression settings** | High - Would enable data-driven optimization of compression config | High - Requires A/B test framework, variant assignment, statistical analysis | Future experimentation story: Test compression quality 0.8 vs 0.9 to measure failure rate vs file size trade-off. Requires experimentation platform |
| 5 | **Compression performance metrics (latency, throughput)** | Medium - Would complement failure tracking with performance data | Medium - Add timing instrumentation to compressImage(), track compression duration | Phase 4 UX Polish follow-up: Track compression duration and publish to CloudWatch. Alert if P95 compression time > 5 seconds |
| 6 | **Compression quality metrics (SSIM, PSNR)** | Low - Image quality metrics would validate compression doesn't degrade quality too much | High - Requires image analysis libraries (CPU/GPU intensive), not suitable for client-side | Phase 5 quality assurance: Server-side batch job to sample compressed images and calculate quality metrics. Ensure SSIM > 0.95 (visually lossless) |
| 7 | **Historical trend analysis dashboard** | Medium - Would identify regressions or improving trends over time | Medium - Custom dashboard or CloudWatch Logs Insights saved queries with scheduled runs | Phase 5 monitoring: CloudWatch Logs Insights scheduled queries (daily/weekly) to generate trend reports. Email summary of failure rate trends to ops |
| 8 | **Integration with error tracking service (Sentry)** | Medium - Centralize compression errors with other frontend errors | Low - Add Sentry SDK and send compression failures as Sentry events | Future observability integration: Send compression failures to Sentry with breadcrumbs (file size, format, browser). Enables deduplication and user impact analysis |
| 9 | **Compression failure user feedback mechanism** | Low - Allow users to report compression issues directly | Medium - Add "Report issue" button in compression failure toast, collect user description + telemetry | Future UX enhancement: If compression fails, show "Help us improve" button. User can optionally describe issue (e.g., "took too long", "wrong format"). Correlate with telemetry |
| 10 | **Predictive compression failure prevention** | High - Use ML model to predict failure before attempting compression | High - Requires training dataset, ML model deployment, inference endpoint | Future AI-driven story: Train classifier on telemetry data (features: file size, format, browser → label: success/failure). Skip compression if predicted failure > 80%. Requires significant ML infrastructure |

## Categories

### Edge Cases
- Telemetry endpoint partial CloudWatch publish failure (logs succeed, metrics fail or vice versa)
- Browser sends malformed User-Agent string (empty or non-standard format)
- Compression error message contains Unicode or very long strings (> 1000 characters)
- Multiple simultaneous compression failures (race condition in telemetry batching)
- Network failure during telemetry request (offline mode, no retry logic in MVP)

### UX Polish
- Show compression failure telemetry opt-out in settings (privacy-conscious users)
- Display "Help us improve" link in compression failure toast notification
- Provide user-friendly explanation of why compression failed (not just error message)
- Add visual indicator when telemetry is being sent (subtle privacy transparency)

### Performance
- Telemetry request should not delay upload flow (verify fire-and-forget is truly non-blocking)
- Compress telemetry payload itself if it exceeds 1KB (unlikely but possible with long error messages)
- Use HTTP/2 or HTTP/3 for telemetry endpoint to reduce latency
- Consider IndexedDB queue for offline telemetry buffering (send when online)

### Observability
- Add trace ID correlation between frontend compression attempt and backend telemetry event
- Track telemetry endpoint latency and success rate (meta-monitoring: monitoring the monitoring)
- Add CloudWatch Logs Insights query to detect anomalous error message patterns (new error types)
- Export compression failure metrics to third-party analytics (Datadog, New Relic, Grafana Cloud)

### Integrations
- Integrate with WISH-2045 (HEIC support): Track HEIC-specific errors
- Integrate with WISH-2046 (compression presets): Track failure rate per quality preset
- Integrate with WISH-2048 (WebP conversion): Track WebP conversion errors
- Integrate with WISH-2049 (background compression): Track background compression failures separately from foreground
- Integrate with WISH-2050 (compression preview): Track user acceptance of compression (opt-out rate)

### Security & Privacy
- Add PII detection in error messages (redact file paths, usernames, email addresses)
- Implement rate limiting on telemetry endpoint (per IP address: max 100 requests/minute)
- Add CAPTCHA or bot detection if telemetry endpoint is abused for spam
- Encrypt telemetry payload in transit (HTTPS only, strict transport security)
- Add consent banner for telemetry collection (GDPR/CCPA compliance)
- Provide user data deletion API for telemetry (right to be forgotten - delete by session ID or IP range)
