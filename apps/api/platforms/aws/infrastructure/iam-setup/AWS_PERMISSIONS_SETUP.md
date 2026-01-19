# AWS Permissions Setup for Runtime Configuration

**Story 1.1: Runtime Configuration Infrastructure Setup**

The `lego-moc-deployer` user currently has limited permissions and cannot deploy the runtime configuration infrastructure. This document provides the exact permissions needed and how to add them.

## Current Issue

```
User: arn:aws:iam::213351177820:user/lego-moc-deployer is not authorized to perform: s3:CreateBucket
```

## Required Permissions

Based on analysis of the complete SST configuration, the user needs permissions for:

### Core Infrastructure (All Deployments)
1. **S3 Buckets**: Runtime config, file storage, session storage, CloudWatch logs
2. **CloudFormation**: Stack management for SST deployments
3. **IAM Roles & Policies**: Service roles for Lambda, ECS, Grafana, etc.

### Complete Infrastructure (Full SST Deployment)
4. **VPC & Networking**: VPC, subnets, security groups, NAT gateways, VPC endpoints
5. **Lambda Functions**: All API handlers and utility functions
6. **API Gateway**: HTTP API with JWT authorizer
7. **RDS PostgreSQL**: Aurora Serverless v2 with RDS Proxy
8. **OpenSearch**: Managed domain for full-text search
9. **Cognito**: User pools and identity pools for authentication
10. **CloudWatch**: Logs, metrics, dashboards, and alarms
11. **SNS Topics**: Error alerts and budget notifications
12. **EventBridge**: Scheduled rules for cost metrics
13. **AWS Budgets**: Cost monitoring and alerts
14. **X-Ray**: Distributed tracing
15. **Secrets Manager**: Database credentials and API keys

## Policy Options

We provide two policy options based on your deployment needs:

### Option A: Minimal Policy (Runtime Configuration Only)
**File**: `infrastructure/iam-policies/runtime-config-s3-policy.json`
**Use Case**: Deploy only the runtime configuration infrastructure (Story 1.1)

**Permissions Include**:
- S3 bucket management for `lego-*`, `user-metrics-*`, `sst-*` patterns
- CloudFormation stack management for SST deployments
- IAM role/policy management for SST resources
- VPC and networking (EC2) permissions
- Basic Lambda function management

**Recommended For**:
- Initial runtime configuration deployment
- Minimal security footprint
- Testing the permission setup

### Option B: Complete Policy (Full SST Infrastructure)
**File**: `infrastructure/iam-policies/complete-sst-deployment-policy.json`
**Use Case**: Deploy the complete serverless infrastructure

**Permissions Include**:
- All services from Option A, plus:
- RDS (PostgreSQL Aurora Serverless)
- OpenSearch (Elasticsearch service)
- API Gateway (HTTP APIs)
- Cognito (User pools and identity pools)
- CloudWatch (Logs, metrics, dashboards)
- SNS (Topics and subscriptions)
- EventBridge (Rules and targets)
- AWS Budgets and Cost Explorer
- X-Ray tracing
- Secrets Manager

**Recommended For**:
- Complete infrastructure deployment
- Production environments
- Full feature development

## Solution Options

### Option 1: Automated Script (Recommended)

**For Minimal Policy (Runtime Configuration Only):**
```bash
# Run from repository root
./infrastructure/scripts/add-runtime-config-permissions.sh
```

**For Complete Policy (Full SST Infrastructure):**
```bash
# Run from repository root
./infrastructure/scripts/add-runtime-config-permissions.sh --complete
```

### Option 2: Manual AWS CLI

**For Minimal Policy:**
```bash
# Create the policy
aws iam create-policy \
  --policy-name RuntimeConfigS3Policy \
  --policy-document file://infrastructure/iam-policies/runtime-config-s3-policy.json \
  --description "Minimal permissions for runtime configuration infrastructure"

# Attach to user
aws iam attach-user-policy \
  --user-name lego-moc-deployer \
  --policy-arn arn:aws:iam::213351177820:policy/RuntimeConfigS3Policy
```

**For Complete Policy:**
```bash
# Create the policy
aws iam create-policy \
  --policy-name CompleteSSTDeploymentPolicy \
  --policy-document file://infrastructure/iam-policies/complete-sst-deployment-policy.json \
  --description "Complete permissions for SST infrastructure deployment"

# Attach to user
aws iam attach-user-policy \
  --user-name lego-moc-deployer \
  --policy-arn arn:aws:iam::213351177820:policy/CompleteSSTDeploymentPolicy
```

### Option 3: AWS Console (Manual)

1. Go to **IAM Console** → **Users** → **lego-moc-deployer**
2. Click **"Add permissions"** → **"Attach policies directly"**
3. Click **"Create policy"**
4. Switch to **JSON** tab
5. Copy and paste the content from your chosen policy file:
   - **Minimal**: `infrastructure/iam-policies/runtime-config-s3-policy.json`
   - **Complete**: `infrastructure/iam-policies/complete-sst-deployment-policy.json`
6. Click **"Next"** → Name the policy → **"Create policy"**
7. Go back to user → Select the new policy → **"Add permissions"**

## Recommendation

**Start with the Complete Policy** for initial deployment, then optionally switch to the Minimal Policy once the infrastructure is stable:

1. **Deploy with Complete Policy**: Gets everything working quickly
2. **Switch to Minimal Policy**: For ongoing maintenance and security
3. **Use Complete Policy again**: When adding new infrastructure components

### Option 3: Temporary Admin Access

**Alternative approach:**
1. Temporarily add `PowerUserAccess` or `AdministratorAccess` to `lego-moc-deployer`
2. Deploy the infrastructure
3. Remove the broad permissions
4. Add the specific `RuntimeConfigS3Policy`

## Policy Details

The policy grants minimal permissions for:

- **S3 Buckets**: Only `lego-runtime-config-*` and `sst-asset-*` patterns
- **CloudFormation**: Only stacks matching `lego-runtime-config-*` and `sst-*`
- **IAM**: Only roles matching `sst-*` and `lego-runtime-config-*`

**Security**: No broad permissions, follows principle of least privilege.

## Testing After Setup

Once permissions are added, test with:

```bash
# Test S3 access
aws s3 ls

# Deploy runtime configuration infrastructure
cd apps/api/lego-api-serverless
npx sst deploy --stage dev

# Test the deployed configuration
./scripts/test-runtime-config.sh dev
npx tsx scripts/validate-runtime-config.ts dev
```

## Files Created

- `infrastructure/iam-policies/runtime-config-s3-policy.json` - IAM policy document
- `infrastructure/scripts/add-runtime-config-permissions.sh` - Automated setup script
- `docs/operations/config-management.md` - Updated with permissions section

## Contact

If you need help with the permissions setup, the policy JSON file contains all the specific permissions needed. The policy is designed to be minimal and secure, only granting access to resources needed for the runtime configuration infrastructure.

---

**Account**: 213351177820  
**User**: lego-moc-deployer  
**Policy**: RuntimeConfigS3Policy  
**Created**: 2025-11-24
