# Quick Start - Deploy & Verify in 5 Minutes

## Prerequisites ✅
- AWS credentials configured (already done ✅)
- Node.js >= 20
- pnpm installed

## Option 1: Automated Deployment (Recommended)

```bash
cd apps/api/lego-api-serverless

# Run automated deployment script
./deploy-and-verify.sh dev
```

**This script will**:
1. ✅ Check prerequisites (Node, AWS credentials)
2. 📦 Install dependencies
3. 🔨 Verify TypeScript compilation
4. 🚀 Bootstrap SST (if needed)
5. ☁️ Deploy infrastructure to AWS
6. 🧪 Test health endpoint
7. 📊 Verify CloudWatch Logs
8. 📋 Display summary

**Expected Time**: 15-25 minutes (first deployment)

---

## Option 2: Manual Step-by-Step

### 1. Install & Verify
```bash
cd apps/api/lego-api-serverless
pnpm install
pnpm check-types
```

### 2. Deploy
```bash
# Local development (recommended for testing)
pnpm dev

# Or deploy to AWS
pnpm deploy
```

### 3. Test Health Endpoint
```bash
# Get API URL from deployment output
curl https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/health | jq
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "postgres": "connected",
      "redis": "connected",
      "opensearch": "connected"
    }
  }
}
```

### 4. Verify Logs
```bash
aws logs tail /aws/lambda/lego-api-serverless-dev-HealthCheckFunction --follow
```

---

## Useful Commands

```bash
# Development
pnpm dev                    # Start local dev with live AWS resources
pnpm check-types           # Verify TypeScript

# Deployment
pnpm deploy                # Deploy to dev stage
pnpm deploy:staging        # Deploy to staging
pnpm sst remove            # Remove all infrastructure

# Database
pnpm db:migrate            # Run database migrations
pnpm db:studio             # Open database GUI

# Monitoring
pnpm sst outputs           # Show deployment outputs
aws logs tail <log-group>  # View Lambda logs
```

---

## Troubleshooting

### Deployment taking too long?
- RDS: 10-15 minutes (normal)
- OpenSearch: 15-20 minutes (normal)
- Check CloudFormation: `aws cloudformation list-stacks`

### Health endpoint returns 503?
1. Check CloudWatch Logs for errors
2. Verify security groups allow Lambda → RDS/Redis/OpenSearch
3. Wait 2-3 minutes after deployment for services to initialize

### Can't connect to services?
```bash
# Test individual connections
psql -h <POSTGRES_HOST> -U postgres -c "SELECT 1"
redis-cli -h <REDIS_HOST> PING
curl https://<OPENSEARCH_ENDPOINT>/_cluster/health
```

---

## Cost Estimate (Dev Stage)

- **RDS t4g.micro**: ~$15-20/month
- **ElastiCache t4g.micro**: ~$15-20/month
- **OpenSearch t3.small**: ~$30-40/month
- **NAT Gateway**: ~$30-40/month
- **Lambda**: Free tier (minimal usage)

**Total**: ~$90-120/month

**💡 Tip**: Run `pnpm sst remove` when not actively developing to save costs.

---

## Next Steps After Successful Deployment

1. ✅ Verify all acceptance criteria (see DEPLOYMENT_GUIDE.md)
2. 📝 Document your API URL
3. 🔄 Run database migrations: `pnpm db:migrate`
4. 🚀 Begin Epic 2: API Endpoints Migration
5. 🏷️ Tag deployment: `git tag v1.0.0-epic1-deployed`

---

## Full Documentation

- **Detailed Guide**: See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Project Overview**: See [README.md](./README.md)
- **SST Docs**: https://sst.dev/docs/

---

**Questions?** Check DEPLOYMENT_GUIDE.md for detailed troubleshooting steps.
