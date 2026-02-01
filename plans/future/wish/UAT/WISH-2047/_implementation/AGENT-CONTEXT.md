# Agent Context - WISH-2047

## Story Metadata

```yaml
story_id: WISH-2047
feature_dir: plans/future/wish
mode: implement
base_path: plans/future/wish/in-progress/WISH-2047/
artifacts_path: plans/future/wish/in-progress/WISH-2047/_implementation/
story_file: plans/future/wish/in-progress/WISH-2047/WISH-2047.md
```

## Scope Flags

```yaml
backend_impacted: true
frontend_impacted: false
infra_impacted: true
```

## Key Files to Create/Modify

### New Files
- `apps/api/lego-api/core/utils/ip.ts` - IP extraction utility
- `apps/api/lego-api/core/utils/__tests__/ip.test.ts` - IP extraction tests
- `apps/api/lego-api/core/geolocation/geoip.ts` - Geolocation service
- `apps/api/lego-api/core/geolocation/types.ts` - Zod schemas
- `apps/api/lego-api/core/geolocation/__tests__/geoip.test.ts` - Geolocation tests
- `apps/api/lego-api/__http__/wishlist-ip-geolocation-logging.http` - Integration tests

### Modified Files
- `apps/api/lego-api/core/observability/logger.ts` - Add geolocation enrichment
- `apps/api/lego-api/middleware/auth.ts` - Extract IP from request context
- `apps/api/lego-api/middleware/rate-limit.ts` - Reuse IP extraction utility
- `docs/wishlist-authorization-policy.md` - Add IP/geolocation section

### Infrastructure
- `apps/api/platforms/aws/layers/` - Add GeoLite2 database to Lambda layer

## Acceptance Criteria Summary

| AC | Description | Type |
|----|-------------|------|
| AC1 | IP address extraction from request headers | Backend |
| AC2 | Geolocation lookup using MaxMind GeoLite2 | Backend |
| AC3 | Enriched log format for 403/404 events | Backend |
| AC4 | Privacy-conscious logging (403/404 only) | Backend |
| AC5 | CloudWatch Logs Insights query examples | Docs |
| AC6 | Lambda layer includes GeoLite2 database | Infra |
| AC7 | Geolocation lookup performance < 10ms | Backend |
| AC8 | Error handling for geolocation failures | Backend |
| AC9 | Integration with rate limiting | Backend |
| AC10 | Unit tests for IP extraction (6+ tests) | Testing |
| AC11 | Integration tests for enriched logs (4+ tests) | Testing |
| AC12 | Update security policy documentation | Docs |

## Dependencies

- Depends on: WISH-2008 (Authorization Layer Testing and Policy Documentation) - already completed
- No blocking dependencies for implementation
