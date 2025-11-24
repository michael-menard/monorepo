# Deployment Status

**Last Updated**: 2025-11-24

## Current Status: 🟡 Ready for IAM Setup

Your monorepo is **code-ready** for deployment but requires IAM permissions to proceed.

---

## ✅ What's Been Completed

### 1. Code Fixes

- ✅ Fixed SST configuration (removed top-level imports)
- ✅ Fixed VPC NAT gateway configuration
- ✅ Fixed API Gateway authorizer configuration
- ✅ All packages built successfully (28 packages)

### 2. Documentation Created

- ✅ `DEPLOYMENT_GUIDE.md` - Complete deployment walkthrough
- ✅ `IAM_SETUP_INSTRUCTIONS.md` - Step-by-step IAM setup guide
- ✅ `apps/api/docs/DEPLOYMENT_IAM_POLICY.json` - IAM policy document
- ✅ `scripts/setup-iam-permissions.sh` - Automated setup script
- ✅ `DEPLOYMENT_STATUS.md` - This file

### 3. Infrastructure Configuration

- ✅ VPC with 2 AZs, public/private subnets
- ✅ RDS PostgreSQL database configuration
- ✅ OpenSearch domain configuration
- ✅ S3 buckets (main, config, logs, sessions)
- ✅ Cognito authentication (User Pool + Identity Pool)
- ✅ API Gateway (HTTP + WebSocket)
- ✅ Lambda functions (14+ endpoints)
- ✅ CloudWatch monitoring and alarms
- ✅ Cost tracking and budgets

---

## 🔴 Blocking Issue: IAM Permissions

### Problem

The AWS user `lego-moc-deployer` (Account: 213351177820) lacks permissions to:

- Create IAM roles and policies
- Create DynamoDB tables
- Create RDS instances
- Create OpenSearch domains
- And other AWS services needed for deployment

### Solution Required

You must grant IAM permissions using one of these methods:

#### **Option 1: AWS Console** (Easiest)

1. Log into AWS Console with admin access
2. Navigate to IAM → Policies → Create policy
3. Use JSON from `apps/api/docs/DEPLOYMENT_IAM_POLICY.json`
4. Name it: `SST-Deployment-Policy`
5. Attach to user: `lego-moc-deployer`

**Detailed steps**: See `IAM_SETUP_INSTRUCTIONS.md`

#### **Option 2: Automated Script** (If you have admin CLI access)

```bash
./scripts/setup-iam-permissions.sh
```

#### **Option 3: Manual CLI** (If you have admin credentials)

```bash
# Create policy
aws iam create-policy \
  --policy-name SST-Deployment-Policy \
  --policy-document file://apps/api/docs/DEPLOYMENT_IAM_POLICY.json

# Attach to user
aws iam attach-user-policy \
  --user-name lego-moc-deployer \
  --policy-arn arn:aws:iam::213351177820:policy/SST-Deployment-Policy
```

---

## 🚀 Next Steps

### Step 1: Grant IAM Permissions ⏳

Choose one of the options above to grant permissions.

**How to verify**:

```bash
aws iam list-attached-user-policies --user-name lego-moc-deployer
```

You should see `SST-Deployment-Policy` in the list.

### Step 2: Deploy Infrastructure

```bash
cd apps/api
pnpm sst deploy --stage production
```

**Expected time**: 20-30 minutes

**What gets created**:

- VPC with networking (NAT Gateway, Internet Gateway, etc.)
- RDS PostgreSQL database
- OpenSearch domain for search
- S3 buckets for file storage
- Cognito for authentication
- API Gateway + 14 Lambda functions
- CloudWatch monitoring
- DynamoDB for WebSocket connections

### Step 3: Save Deployment Outputs

After deployment completes, save these outputs:

- API URL
- WebSocket URL
- Cognito User Pool ID
- Cognito User Pool Client ID
- Cognito Identity Pool ID
- Database connection string
- S3 bucket names

### Step 4: Configure Frontend

Create `apps/web/lego-moc-instructions-app/.env.production`:

```env
VITE_USE_AWS_SERVICES=true
VITE_API_BASE_URL=<API_URL>
VITE_WEBSOCKET_URL=<WEBSOCKET_URL>
VITE_USER_POOL_ID=<USER_POOL_ID>
VITE_USER_POOL_CLIENT_ID=<CLIENT_ID>
VITE_IDENTITY_POOL_ID=<IDENTITY_POOL_ID>
VITE_ENVIRONMENT=production
```

### Step 5: Deploy Frontend

Options:

- AWS Amplify Hosting (recommended)
- Vercel
- Netlify
- S3 + CloudFront

See `DEPLOYMENT_GUIDE.md` for frontend deployment options.

### Step 6: Initialize Database

```bash
cd apps/api
pnpm db:migrate
```

---

## 📊 Infrastructure Components

### Compute

- **API Gateway**: HTTP API + WebSocket API
- **Lambda Functions**: 14+ functions (MOC instructions, gallery, wishlist, auth)
- **DynamoDB**: WebSocket connections table

### Storage

- **RDS PostgreSQL**: Primary database (db.t3.micro)
- **S3 Buckets**:
  - Main bucket (file uploads)
  - Config bucket (runtime config)
  - Logs bucket (CloudWatch logs)
  - Sessions bucket (OpenReplay)
- **OpenSearch**: Search and analytics (t3.small.search)

### Networking

- **VPC**: 10.0.0.0/24
- **Subnets**: 2 public (/27), 2 private (/26)
- **NAT Gateway**: Single gateway for cost optimization
- **Security Groups**: Lambda, RDS, OpenSearch, etc.

### Authentication

- **Cognito User Pool**: User authentication
- **Cognito Identity Pool**: Federated identities
- **JWT Authorizer**: API Gateway authorization

### Monitoring

- **CloudWatch**: Logs, metrics, alarms
- **SNS**: Error notifications
- **Dashboards**: Custom monitoring dashboards
- **Cost Monitoring**: Budget alerts and tracking

---

## 💰 Cost Estimates

### Monthly Recurring Costs (Production)

- VPC + NAT Gateway: ~$32/month
- RDS PostgreSQL (db.t3.micro): ~$15/month
- OpenSearch (t3.small.search): ~$25/month
- S3 Storage (5GB): ~$5/month
- CloudWatch Logs: ~$5/month

**Fixed Total**: ~$82/month

### Variable Costs (Usage-based)

- API Gateway requests: $1 per million requests
- Lambda executions: $0.20 per million requests (first 1M free)
- Data transfer: $0.09/GB (first 1GB free)
- DynamoDB: $0.25 per million read/write requests

**Variable Total**: ~$10-50/month (depends on traffic)

**Grand Total**: ~$92-132/month for production environment

---

## 🔒 Security Considerations

### Current Setup

- ✅ VPC with private subnets for databases
- ✅ Security groups restrict access
- ✅ Cognito JWT authentication
- ✅ S3 buckets not publicly accessible
- ✅ RDS in private subnet
- ✅ CloudWatch logging enabled
- ✅ IAM least-privilege roles for Lambda

### Recommended Additions (Post-deployment)

- [ ] Enable AWS CloudTrail for audit logging
- [ ] Enable AWS Config for compliance
- [ ] Set up AWS WAF for API protection
- [ ] Enable RDS encryption at rest
- [ ] Enable S3 bucket versioning
- [ ] Configure VPC Flow Logs
- [ ] Set up AWS Secrets Manager rotation
- [ ] Enable MFA for Cognito users
- [ ] Configure backup policies for RDS

---

## 🐛 Troubleshooting

### IAM Permission Errors

**Symptom**: "User is not authorized to perform: iam:CreateRole"
**Solution**: Complete Step 1 (Grant IAM Permissions)

### VPC Quota Exceeded

**Symptom**: "VPCLimitExceeded"
**Solution**: Delete unused VPCs or request quota increase

### RDS Creation Fails

**Symptom**: "DBSubnetGroupDoesNotCoverEnoughAZs"
**Solution**: Ensure you have subnets in at least 2 availability zones

### OpenSearch Creation Fails

**Symptom**: "LimitExceededException"
**Solution**: Check OpenSearch domain limits in your region

### Deployment Timeout

**Symptom**: Deployment takes longer than 30 minutes
**Solution**: This is usually fine - RDS and OpenSearch can take 15-20 minutes each

---

## 📞 Support Resources

- **SST Documentation**: https://sst.dev
- **AWS Documentation**: https://docs.aws.amazon.com
- **Your Deployment Logs**: Check CloudWatch Logs in AWS Console
- **SST Console**: https://sst.dev/u/45a3b8ec (from last deployment attempt)

---

## 📝 Deployment Checklist

### Pre-Deployment

- [x] Code fixes completed
- [x] All packages built
- [x] IAM policy document created
- [ ] IAM permissions granted ⏳ **YOU ARE HERE**

### Deployment

- [ ] Run `pnpm sst deploy --stage production`
- [ ] Save deployment outputs
- [ ] Verify resources in AWS Console
- [ ] Check CloudWatch dashboard

### Post-Deployment

- [ ] Configure frontend with deployment outputs
- [ ] Deploy frontend to hosting service
- [ ] Run database migrations
- [ ] Test API health endpoint
- [ ] Test authentication flow
- [ ] Configure custom domain (optional)
- [ ] Set up CI/CD pipeline (optional)

---

## 🎯 Quick Reference

### Important Files

- `DEPLOYMENT_GUIDE.md` - Full deployment guide
- `IAM_SETUP_INSTRUCTIONS.md` - IAM setup details
- `apps/api/docs/DEPLOYMENT_IAM_POLICY.json` - IAM policy
- `scripts/setup-iam-permissions.sh` - Automated setup
- `apps/api/sst.config.ts` - Infrastructure code

### Key Commands

```bash
# Deploy infrastructure
cd apps/api && pnpm sst deploy --stage production

# Remove infrastructure (careful!)
cd apps/api && pnpm sst remove --stage production

# Check AWS credentials
aws sts get-caller-identity

# View CloudWatch logs
aws logs tail /aws/lambda/lego-api-serverless-production-* --follow

# Check RDS status
aws rds describe-db-instances --query 'DBInstances[].DBInstanceIdentifier'
```

### AWS Account Info

- **Account ID**: 213351177820
- **Region**: us-east-1 (default)
- **IAM User**: lego-moc-deployer
- **Stage**: production

---

**Status**: Ready for IAM setup → Deployment → Frontend configuration
