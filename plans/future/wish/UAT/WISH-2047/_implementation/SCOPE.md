# Scope - WISH-2047

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | true | IP extraction utility, geolocation service with MaxMind GeoLite2, logger enrichment for 403/404 events |
| frontend | false | Backend-only observability enhancement - no UI changes |
| infra | true | Lambda layer needs GeoLite2 database file (~50MB), environment variable GEOIP_DATABASE_PATH |

## Scope Summary

This story enriches authorization failure audit logs (403/404 events) with IP address and geolocation data (country, region, city) using MaxMind GeoLite2 database. Implementation includes creating a shared IP extraction utility, a geolocation lookup service with in-memory caching, and enriching the existing logger for unauthorized access events while maintaining privacy by NOT logging IP for successful requests (200/201).

## Key Implementation Areas

1. **IP Extraction Utility** (`apps/api/lego-api/core/utils/ip.ts`)
   - Extract client IP from X-Forwarded-For, X-Real-IP, or socket
   - Handle comma-separated IP lists
   - IPv4 and IPv6 support

2. **Geolocation Service** (`apps/api/lego-api/core/geolocation/`)
   - MaxMind GeoLite2 integration via @maxmind/geoip2-node
   - In-memory database caching (singleton pattern)
   - Performance target: < 10ms lookup

3. **Logger Enrichment** (`apps/api/lego-api/core/observability/`)
   - Enrich 403/404 logs with IP + geolocation fields
   - Graceful fallback if geolocation lookup fails

4. **Lambda Layer** (`apps/api/platforms/aws/layers/`)
   - Include GeoLite2 City database in layer
   - Environment variable configuration

## Dependencies

- @maxmind/geoip2-node - MaxMind GeoIP2 Node.js SDK
- MaxMind GeoLite2 City database (.mmdb file)
