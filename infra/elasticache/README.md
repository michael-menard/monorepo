# ElastiCache Redis Infrastructure (WISH-2124)

CloudFormation template for deploying ElastiCache Redis cluster for feature flag caching.

## Architecture

- **Engine**: Redis 7.1
- **Node Type**: cache.t3.micro (staging), cache.t3.small (production)
- **Availability**: Single-node (no replication for MVP)
- **Persistence**: Daily snapshots with 5-day retention
- **Networking**: Private subnets only, VPC security groups

## Prerequisites

1. **VPC Setup**:
   - VPC ID
   - At least 2 private subnets (for high availability)
   - Lambda security group ID (for ingress rules)

2. **AWS CLI**:
   ```bash
   aws --version
   # AWS CLI version 2.x or higher
   ```

3. **Permissions**:
   - `elasticache:*`
   - `ec2:CreateSecurityGroup`, `ec2:AuthorizeSecurityGroupIngress`
   - `cloudformation:*`

## Deployment

### Staging Environment

```bash
# Set variables
export ENV=staging
export VPC_ID=vpc-xxxxxxxxx
export SUBNET_1=subnet-xxxxxxxxx
export SUBNET_2=subnet-yyyyyyyyy
export LAMBDA_SG=sg-zzzzzzzzz

# Deploy stack
aws cloudformation deploy \
  --template-file template.yaml \
  --stack-name ${ENV}-lego-api-redis \
  --parameter-overrides \
    Environment=${ENV} \
    VpcId=${VPC_ID} \
    SubnetIds=${SUBNET_1},${SUBNET_2} \
    LambdaSecurityGroupId=${LAMBDA_SG} \
    NodeType=cache.t3.micro \
    RedisVersion=7.1 \
  --capabilities CAPABILITY_IAM \
  --region us-east-1
```

### Production Environment

```bash
# Set variables
export ENV=production
export VPC_ID=vpc-xxxxxxxxx
export SUBNET_1=subnet-xxxxxxxxx
export SUBNET_2=subnet-yyyyyyyyy
export LAMBDA_SG=sg-zzzzzzzzz

# Deploy stack
aws cloudformation deploy \
  --template-file template.yaml \
  --stack-name ${ENV}-lego-api-redis \
  --parameter-overrides \
    Environment=${ENV} \
    VpcId=${VPC_ID} \
    SubnetIds=${SUBNET_1},${SUBNET_2} \
    LambdaSecurityGroupId=${LAMBDA_SG} \
    NodeType=cache.t3.small \
    RedisVersion=7.1 \
  --capabilities CAPABILITY_IAM \
  --region us-east-1
```

## Post-Deployment

### 1. Get Redis Endpoint

```bash
# Get Redis endpoint from CloudFormation outputs
aws cloudformation describe-stacks \
  --stack-name ${ENV}-lego-api-redis \
  --query "Stacks[0].Outputs" \
  --output table

# Expected outputs:
# - CacheEndpoint: xxx.cache.amazonaws.com
# - CachePort: 6379
# - RedisUrl: redis://xxx.cache.amazonaws.com:6379
```

### 2. Update Lambda Environment Variables

```bash
# Get Redis URL
export REDIS_URL=$(aws cloudformation describe-stacks \
  --stack-name ${ENV}-lego-api-redis \
  --query "Stacks[0].Outputs[?OutputKey=='RedisUrl'].OutputValue" \
  --output text)

# Update Lambda function
aws lambda update-function-configuration \
  --function-name ${ENV}-lego-api \
  --environment "Variables={REDIS_URL=${REDIS_URL},DATABASE_URL=...,JWT_SECRET=...}"
```

### 3. Verify Connectivity

```bash
# From EC2 instance or Lambda in same VPC
redis-cli -h ${CACHE_ENDPOINT} ping
# Expected: PONG

# Test from Lambda (AWS CLI)
aws lambda invoke \
  --function-name ${ENV}-lego-api \
  --payload '{"path": "/config/flags", "httpMethod": "GET"}' \
  response.json

# Check CloudWatch logs for "Redis connected" message
```

## Monitoring (AC 12)

### CloudWatch Alarms

The stack creates 3 CloudWatch alarms:

1. **HighCPUAlarm**: CPU > 75% for 5 minutes
2. **HighMemoryAlarm**: Memory > 80% for 5 minutes
3. **HighEvictionsAlarm**: Evictions > 100 in 5 minutes

### View Alarms

```bash
aws cloudwatch describe-alarms \
  --alarm-names \
    ${ENV}-lego-api-redis-high-cpu \
    ${ENV}-lego-api-redis-high-memory \
    ${ENV}-lego-api-redis-high-evictions
```

### Set SNS Notification (Optional)

```bash
# Create SNS topic
aws sns create-topic --name ${ENV}-lego-api-redis-alerts

# Subscribe email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:${ENV}-lego-api-redis-alerts \
  --protocol email \
  --notification-endpoint ops@example.com

# Update alarm actions
aws cloudwatch put-metric-alarm \
  --alarm-name ${ENV}-lego-api-redis-high-cpu \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:${ENV}-lego-api-redis-alerts
```

## Cost Monitoring (AC 12)

### Estimated Monthly Costs

| Node Type | On-Demand | 1-Year Reserved | 3-Year Reserved |
|-----------|-----------|-----------------|-----------------|
| cache.t3.micro | $12.41 | $7.90 | $5.05 |
| cache.t3.small | $24.82 | $15.80 | $10.10 |
| cache.t3.medium | $49.64 | $31.60 | $20.20 |

*Prices for us-east-1 as of 2026. Plus data transfer costs (~$0.01/GB).*

### Enable Cost Allocation Tags

```bash
# Activate cost allocation tags in AWS Billing Console
aws ce list-cost-allocation-tags

# Tag the stack resources for Cost Explorer filtering
# Tags are already applied in template:
# - Service: ElastiCache
# - Feature: FeatureFlags
# - Environment: staging/production
```

### View Current Costs

```bash
# AWS Cost Explorer (via Console)
# Filter by:
# - Service: Amazon ElastiCache
# - Tag: Feature=FeatureFlags

# Or AWS CLI
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-02-28 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://cost-filter.json
```

**cost-filter.json**:
```json
{
  "Dimensions": {
    "Key": "SERVICE",
    "Values": ["Amazon ElastiCache"]
  }
}
```

See `docs/infrastructure/cost-monitoring.md` for billing alarm setup.

## Security (AC 9)

### VPC Configuration

- **Private Subnets**: ElastiCache is NOT publicly accessible
- **Security Group**: Only allows inbound traffic from Lambda SG on port 6379
- **Encryption**: At-rest encryption available (add `AtRestEncryptionEnabled: true` for production)
- **Transit Encryption**: In-transit encryption available (add `TransitEncryptionEnabled: true` for production)

### Enable VPC Flow Logs (Optional)

```bash
# Create flow log for troubleshooting
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids ${VPC_ID} \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/lego-api-${ENV}
```

## Troubleshooting

### Connection Timeout

**Symptom**: Lambda logs show "Redis connection timeout"

**Solutions**:
1. Verify Lambda is in same VPC as ElastiCache
2. Check security group allows Lambda SG → Redis SG on port 6379
3. Check subnet routing tables (NAT gateway for private subnets)
4. Test with `nc -zv ${CACHE_ENDPOINT} 6379` from Lambda or EC2

### High Memory Usage

**Symptom**: HighMemoryAlarm triggered

**Solutions**:
1. Check cache eviction policy: `redis-cli -h ${CACHE_ENDPOINT} CONFIG GET maxmemory-policy`
2. Increase TTL to reduce cache size (currently 5 minutes)
3. Scale up to larger node type: `cache.t3.small` or `cache.t3.medium`
4. Monitor cache hit rate: If low, reduce caching scope

### High Evictions

**Symptom**: HighEvictionsAlarm triggered

**Solutions**:
1. Increase node memory (scale up node type)
2. Reduce cache TTL (less data cached)
3. Review cache key pattern - too broad? (currently caches all flags per environment)

## Maintenance

### Upgrade Redis Version

```bash
# Update stack with new Redis version
aws cloudformation update-stack \
  --stack-name ${ENV}-lego-api-redis \
  --use-previous-template \
  --parameters \
    ParameterKey=RedisVersion,ParameterValue=7.2 \
    ParameterKey=Environment,UsePreviousValue=true \
    ParameterKey=VpcId,UsePreviousValue=true \
    ParameterKey=SubnetIds,UsePreviousValue=true \
    ParameterKey=LambdaSecurityGroupId,UsePreviousValue=true \
    ParameterKey=NodeType,UsePreviousValue=true
```

### Scale Node Type

```bash
# Scale up to t3.small
aws cloudformation update-stack \
  --stack-name ${ENV}-lego-api-redis \
  --use-previous-template \
  --parameters \
    ParameterKey=NodeType,ParameterValue=cache.t3.small \
    ParameterKey=Environment,UsePreviousValue=true \
    ParameterKey=VpcId,UsePreviousValue=true \
    ParameterKey=SubnetIds,UsePreviousValue=true \
    ParameterKey=LambdaSecurityGroupId,UsePreviousValue=true \
    ParameterKey=RedisVersion,UsePreviousValue=true
```

### Backup and Restore

```bash
# Create manual snapshot
aws elasticache create-snapshot \
  --cache-cluster-id ${ENV}-lego-api-redis \
  --snapshot-name ${ENV}-lego-api-redis-manual-$(date +%Y%m%d)

# List snapshots
aws elasticache describe-snapshots \
  --cache-cluster-id ${ENV}-lego-api-redis

# Restore from snapshot (create new cluster)
aws elasticache create-cache-cluster \
  --cache-cluster-id ${ENV}-lego-api-redis-restored \
  --snapshot-name ${ENV}-lego-api-redis-manual-20260208 \
  --cache-node-type cache.t3.micro
```

## Teardown

```bash
# Delete stack (CAUTION: destroys Redis cluster)
aws cloudformation delete-stack \
  --stack-name ${ENV}-lego-api-redis

# Wait for deletion
aws cloudformation wait stack-delete-complete \
  --stack-name ${ENV}-lego-api-redis
```

## Related Documentation

- [CloudFormation Template](./template.yaml)
- [Cost Monitoring](../../docs/infrastructure/cost-monitoring.md)
- [Canary Deployment](../../docs/deployment/canary-redis-migration.md)
- [API README](../../apps/api/lego-api/README.md)
