# Wishlist Authorization Security

## Overview

This document describes the security logging and monitoring for the Wishlist API endpoints, including IP address and geolocation enrichment for authorization failure events.

## Related Stories

- **WISH-2008**: Authorization Layer Testing and Policy Documentation
- **WISH-2047**: IP/Geolocation Logging for Authorization Events

## Authorization Failure Logging

### Log Structure

When an authorization failure (403 Forbidden or 404 Not Found) occurs on wishlist endpoints, a structured log entry is created with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | The authenticated user's ID |
| `itemId` | string | The wishlist item ID being accessed |
| `endpoint` | string | The API endpoint path |
| `method` | string | HTTP method (GET, PUT, DELETE, POST) |
| `statusCode` | number | HTTP status code (403 or 404) |
| `errorCode` | string | Application error code |
| `timestamp` | string | ISO 8601 timestamp |
| `ip` | string | Client IP address (WISH-2047) |
| `country` | string | ISO 3166-1 country code (WISH-2047) |
| `countryName` | string | Country name (WISH-2047) |
| `region` | string | State/province/region (WISH-2047) |
| `city` | string | City name (WISH-2047) |
| `latitude` | number | Geographic latitude (WISH-2047) |
| `longitude` | number | Geographic longitude (WISH-2047) |

### Example Log Entry

```json
{
  "level": "warn",
  "message": "Unauthorized wishlist access attempt",
  "userId": "user-123",
  "itemId": "item-456",
  "endpoint": "/wishlist/:id",
  "method": "GET",
  "statusCode": 404,
  "errorCode": "NOT_FOUND",
  "timestamp": "2026-01-31T12:34:56.789Z",
  "ip": "203.0.113.195",
  "country": "US",
  "countryName": "United States",
  "region": "California",
  "city": "San Francisco",
  "latitude": 37.7749,
  "longitude": -122.4194
}
```

## Privacy Considerations

### IP Logging Policy

**Privacy-Conscious Logging**: IP address and geolocation data is ONLY logged for authorization failures (403/404 responses), NOT for successful requests (200/201).

**Rationale**:
1. Authorization failures are the primary signal for security threats
2. Minimizes PII collection while maintaining security visibility
3. Aligns with data minimization principles (GDPR Article 5)
4. Sufficient for threat detection without excessive tracking

### Legitimate Interest Basis

IP logging for authorization failures is justified under legitimate interest for:
- Detecting brute-force attacks
- Identifying credential stuffing attempts
- Detecting geographic anomalies
- Incident response and forensics
- Rate limiting enforcement

## CloudWatch Logs Insights Queries

### Top Attacking IPs

Identify IP addresses with the most authorization failures:

```
fields @timestamp, ip, country, city, endpoint, statusCode
| filter statusCode = 403 or statusCode = 404
| stats count(*) as attempts by ip, country
| sort attempts desc
| limit 10
```

### Failed Access by Country

Geographic distribution of authorization failures:

```
fields @timestamp, ip, country, countryName, city
| filter @message like /Unauthorized wishlist access attempt/
| stats count(*) as failures by country, countryName
| sort failures desc
| limit 20
```

### Geographic Anomalies

Detect users accessing from multiple countries (potential account compromise):

```
fields @timestamp, userId, ip, country, city
| filter @message like /Unauthorized wishlist access attempt/
| stats count_distinct(country) as countries,
        count(*) as attempts by userId
| filter countries > 1
| sort attempts desc
```

### Failed Attempts by Hour

Temporal analysis of authorization failures:

```
fields @timestamp, ip, endpoint, method
| filter @message like /Unauthorized wishlist access attempt/
| stats count(*) as failures by bin(1h)
| sort @timestamp desc
```

### Specific IP Investigation

Investigate all activity from a suspicious IP:

```
fields @timestamp, userId, endpoint, method, statusCode, city
| filter ip = "203.0.113.195"
| sort @timestamp desc
| limit 100
```

### Brute-Force Detection

Find IPs with many failures in a short time window:

```
fields @timestamp, ip, endpoint
| filter @message like /Unauthorized wishlist access attempt/
| stats count(*) as failures by ip, bin(5m)
| filter failures >= 10
| sort failures desc
```

## Rate Limiting Integration

IP extraction for geolocation logging uses the same utility as rate limiting (WISH-2008 AC24), ensuring consistency in IP identification across:

1. Rate limit enforcement (block after 10 failures in 5 minutes)
2. Audit logging (enrich with geolocation)
3. Threat detection (CloudWatch queries)

## Geolocation Service

### MaxMind GeoLite2

IP geolocation uses the MaxMind GeoLite2 City database:

- **Database**: GeoLite2-City.mmdb (~50 MB)
- **Update Frequency**: Monthly
- **Accuracy**: Country-level 99.8%, City-level 70-80%
- **Performance**: < 10ms lookup (in-memory cache)

### Graceful Degradation

If geolocation lookup fails:
- IP address is still logged
- Geolocation fields are null
- Warning logged (non-blocking)
- Authorization response NOT affected

## Endpoints Covered

All wishlist endpoints log IP/geolocation on authorization failures:

| Endpoint | Method | Failure Codes |
|----------|--------|---------------|
| `/api/wishlist` | GET | 401 |
| `/api/wishlist/:id` | GET | 403, 404 |
| `/api/wishlist` | POST | 401 |
| `/api/wishlist/:id` | PUT | 403, 404 |
| `/api/wishlist/:id` | DELETE | 403, 404 |
| `/api/wishlist/reorder` | PUT | 401 |
| `/api/wishlist/:id/purchased` | POST | 403, 404 |
| `/api/wishlist/images/presign` | GET | 401 |

## Future Enhancements

The following are out of scope for WISH-2047 but planned for future work:

1. **Real-time Threat Detection**: Automated IP blocking based on patterns
2. **VPN/Proxy Detection**: Identify anonymizing services
3. **IP Reputation Scoring**: Integration with threat intelligence feeds
4. **Audit Log Dashboard**: UI for security team review
5. **Automated Alerting**: CloudWatch Alarms for anomaly detection
