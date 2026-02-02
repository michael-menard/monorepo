# X-Ray Sampling Rule Configuration (Story 5.3)

This document describes the X-Ray sampling rule configuration for the LEGO API Serverless application.

## Overview

X-Ray sampling rules control what percentage of requests are traced. This helps balance cost with visibility.

## Production Sampling Rule

**Configuration:**
- **Sampling Rate**: 10% of requests
- **Reservoir Size**: 1 request per second (always sampled)
- **Priority**: 1000
- **Service Name**: `lego-api-serverless`
- **Resource ARN**: `*` (all Lambda functions)

## Creating the Sampling Rule

### Option 1: AWS Console

1. Open the [X-Ray Console](https://console.aws.amazon.com/xray)
2. Navigate to "Sampling" in the left sidebar
3. Click "Create sampling rule"
4. Enter the following configuration:

```
Rule name: lego-api-production-sampling
Priority: 1000
Reservoir: 1
Fixed rate: 0.10 (10%)
Service name: lego-api-serverless
Service type: AWS::Lambda
Resource ARN: *
Attributes: (leave empty)
```

### Option 2: AWS CLI

```bash
aws xray create-sampling-rule --cli-input-json '{
  "SamplingRule": {
    "RuleName": "lego-api-production-sampling",
    "Priority": 1000,
    "FixedRate": 0.10,
    "ReservoirSize": 1,
    "ServiceName": "lego-api-serverless",
    "ServiceType": "AWS::Lambda::Function",
    "Host": "*",
    "HTTPMethod": "*",
    "URLPath": "*",
    "ResourceARN": "*",
    "Version": 1
  }
}'
```

### Option 3: CloudFormation/SST (Future Enhancement)

SST v3 doesn't have built-in support for X-Ray sampling rules yet. To add via CloudFormation:

```typescript
// In sst.config.ts (requires custom resource)
import * as aws from '@pulumi/aws'

const samplingRule = new aws.xray.SamplingRule('LegoApiSamplingRule', {
  ruleName: 'lego-api-production-sampling',
  priority: 1000,
  version: 1,
  reservoirSize: 1,
  fixedRate: 0.10,
  urlPath: '*',
  host: '*',
  httpMethod: '*',
  serviceName: 'lego-api-serverless',
  serviceType: 'AWS::Lambda::Function',
  resourceArn: '*',
})
```

## Sampling Strategy

### Development Environment
- **Sampling Rate**: 100% (all requests)
- **Rationale**: Full visibility during development and testing

### Staging Environment
- **Sampling Rate**: 50% of requests
- **Rationale**: Good visibility for testing, moderate cost

### Production Environment
- **Sampling Rate**: 10% of requests
- **Reservoir**: 1 request/second always sampled
- **Rationale**: Balances cost with statistical significance

## Cost Estimation

**X-Ray Pricing (as of 2025):**
- Recording: $5 per 1 million traces recorded
- Retrieval: $0.50 per 1 million traces retrieved

**Production Traffic Estimate (100,000 requests/day):**
- Total requests: 100,000/day = 3,000,000/month
- Sampled requests (10%): 300,000/month
- **Cost**: ~$1.50/month for recording + retrieval

## Adjusting Sampling Rate

To increase sampling temporarily for debugging:

```bash
aws xray update-sampling-rule --cli-input-json '{
  "SamplingRuleUpdate": {
    "RuleName": "lego-api-production-sampling",
    "FixedRate": 1.0,
    "ReservoirSize": 1
  }
}'
```

Remember to change it back to 0.10 after debugging!

## Monitoring Sampling Effectiveness

1. Check sampled request count in CloudWatch:
   - Metric: `AWS/XRay` → `SampledCount`
   - Dimensions: `ServiceName: lego-api-serverless`

2. Verify sampling rate:
   ```bash
   aws xray get-sampling-statistic-summaries
   ```

## Trace Retention

- **Default Retention**: 30 days
- **Cannot be changed** (X-Ray limitation)
- Traces older than 30 days are automatically deleted

## Related Resources

- [AWS X-Ray Sampling Documentation](https://docs.aws.amazon.com/xray/latest/devguide/xray-console-sampling.html)
- Story 5.3: Implement AWS X-Ray Distributed Tracing
- X-Ray Dashboard: See `xray-dashboard.md`
