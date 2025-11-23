# Story 1.9: Route53 Weighted Routing Configuration

**Epic:** Epic 1: Frontend Serverless Migration

**Story ID:** 1.9

**Priority:** High

**Estimated Effort:** 5 story points

---

## User Story

**As a** DevOps engineer,
**I want** Route53 weighted routing configured for staged rollout control,
**so that** traffic can be gradually shifted from Express to Serverless API.

---

## Business Context

Route53 weighted routing enables gradual traffic shifting (10% → 25% → 50% → 100%) between Express and Serverless backends. This provides controlled production validation with minimal user exposure at each stage, enabling quick rollback if issues arise.

---

## Prerequisites

DevOps must validate Route53 hosted zone exists for `api.example.com` with appropriate IAM permissions before starting this story. If hosted zone does not exist, DevOps must provision it and delegate DNS management from domain registrar.

---

## Acceptance Criteria

**AC1**: Route53 hosted zone configured with two A/AAAA records: `api.example.com` pointing to Express and Serverless endpoints

**AC2**: Initial weights set: 100 (Express) / 0 (Serverless) for production environment

**AC3**: Routing configuration files created for each stage: `10-percent.json`, `25-percent.json`, `50-percent.json`, `100-percent.json`

**AC4**: TTL set to 60 seconds on Route53 records to minimize DNS propagation delay

**AC5**: Health checks configured for both Express and Serverless endpoints with 30-second intervals

**AC6**: Automated weight update script: `scripts/update-route53-weights.sh --stage <percentage>`

---

## Integration Verification

**IV1**: DNS resolution tested: `dig api.example.com` returns correct endpoints with configured weights

**IV2**: Health checks functional: Unhealthy endpoint triggers CloudWatch alarm

**IV3**: Weight update tested in staging: Change from 0% → 10% Serverless, observe traffic distribution in CloudWatch metrics

---

## Technical Implementation Notes

### Implementation Approach

```bash
# scripts/update-route53-weights.sh
#!/bin/bash

STAGE=$1
HOSTED_ZONE_ID="Z1234567890ABC"

if [ -z "$STAGE" ]; then
  echo "Usage: ./update-route53-weights.sh [10|25|50|100]"
  exit 1
fi

CONFIG_FILE="infrastructure/route53/weights-${STAGE}-percent.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Config file not found: $CONFIG_FILE"
  exit 1
fi

echo "Updating Route53 weights to ${STAGE}%..."
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://$CONFIG_FILE

echo "Weight update initiated. Changes may take up to 60 seconds to propagate."
```

**Weight Configuration Files**:

```json
// infrastructure/route53/weights-10-percent.json
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "Express",
        "Weight": 90,
        "TTL": 60,
        "ResourceRecords": [{ "Value": "10.0.1.100" }],
        "HealthCheckId": "health-check-express-id"
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "Serverless",
        "Weight": 10,
        "TTL": 60,
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "d123.execute-api.us-east-1.amazonaws.com",
          "EvaluateTargetHealth": true
        },
        "HealthCheckId": "health-check-serverless-id"
      }
    }
  ]
}
```

---

## Definition of Done

- [ ] Route53 hosted zone configured
- [ ] Weighted routing records created for Express and Serverless
- [ ] Initial weights set (100/0)
- [ ] Configuration files created for all stages
- [ ] TTL set to 60 seconds
- [ ] Health checks configured
- [ ] Weight update script created and tested
- [ ] All Integration Verification criteria passed
- [ ] Code reviewed and approved
- [ ] Changes merged to main branch

---

**Story Created:** 2025-11-23
