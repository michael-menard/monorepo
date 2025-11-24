# How to Apply IAM Policy

## Updated Policy File

I've updated your existing IAM policy at:

```
infrastructure/iam-policies/complete-sst-deployment-policy.json
```

**New permissions added**:

- ✅ DynamoDB table creation and management
- ✅ ECS services (for observability containers)
- ✅ Elastic Load Balancing
- ✅ All specific IAM roles/policies needed (OpenReplayTaskRole, UmamiTaskRole, etc.)

## How to Apply (Choose One Method)

### Method 1: AWS Console (Easiest)

#### Step 1: Login to AWS Console

Go to: https://console.aws.amazon.com

- Use an account with IAM admin permissions

#### Step 2: Create or Update Policy

**If policy "SST-Deployment-Policy" doesn't exist:**

1. Go to IAM → Policies → Create policy
2. Click "JSON" tab
3. Copy contents from: `infrastructure/iam-policies/complete-sst-deployment-policy.json`
4. Click "Next: Tags" → "Next: Review"
5. Name: `SST-Deployment-Policy`
6. Description: `Permissions for SST serverless infrastructure deployment`
7. Click "Create policy"

**If policy "SST-Deployment-Policy" already exists:**

1. Go to IAM → Policies → Search for "SST-Deployment-Policy"
2. Click on the policy
3. Click "Edit policy" → "JSON" tab
4. Replace with contents from: `infrastructure/iam-policies/complete-sst-deployment-policy.json`
5. Click "Review policy" → "Save changes"

#### Step 3: Attach to User

1. Go to IAM → Users → `lego-moc-deployer`
2. Click "Permissions" tab
3. If not already attached:
   - Click "Add permissions" → "Attach policies directly"
   - Search for "SST-Deployment-Policy"
   - Check the box
   - Click "Add permissions"
4. If already attached, the updated policy takes effect immediately

---

### Method 2: AWS CLI (If You Have Admin Access)

If you have AWS credentials with IAM admin permissions (not lego-moc-deployer):

```bash
# Configure admin profile
aws configure --profile admin
# Enter admin AWS Access Key ID
# Enter admin AWS Secret Access Key
# Region: us-east-1
# Output: json

# Create policy (if it doesn't exist)
aws iam create-policy \
  --policy-name SST-Deployment-Policy \
  --policy-document file://infrastructure/iam-policies/complete-sst-deployment-policy.json \
  --description "Permissions for SST serverless infrastructure deployment" \
  --profile admin

# If policy already exists, update it
# First, get the policy ARN and default version
POLICY_ARN="arn:aws:iam::213351177820:policy/SST-Deployment-Policy"

# Create a new version (becomes the default)
aws iam create-policy-version \
  --policy-arn $POLICY_ARN \
  --policy-document file://infrastructure/iam-policies/complete-sst-deployment-policy.json \
  --set-as-default \
  --profile admin

# Attach to user (if not already attached)
aws iam attach-user-policy \
  --user-name lego-moc-deployer \
  --policy-arn $POLICY_ARN \
  --profile admin
```

---

### Method 3: Send to AWS Administrator

If you need someone else to do this, send them:

**Email Template:**

```
Subject: IAM Policy Update for SST Deployment

Hi [Admin Name],

I need to update/create an IAM policy for SST serverless deployment.

**Action Required:**
1. Create or update IAM policy: "SST-Deployment-Policy"
2. Use the JSON document attached
3. Attach to IAM user: lego-moc-deployer (Account: 213351177820)

**New permissions added:**
- DynamoDB table management (for WebSocket connections)
- ECS services (for observability containers)
- Additional IAM roles for Lambda, Grafana, OpenReplay, Umami

This policy grants permissions to create and manage:
- Lambda functions, API Gateway, S3, RDS, OpenSearch
- VPC networking, Security Groups
- Cognito authentication
- CloudWatch monitoring
- DynamoDB tables
- ECS services

All resources are tagged with:
- Project: lego-api
- Environment: production
- ManagedBy: SST

Thank you!
```

Attach: `infrastructure/iam-policies/complete-sst-deployment-policy.json`

---

## Verify Permissions Are Applied

After applying the policy, verify with:

```bash
# List attached policies
aws iam list-attached-user-policies --user-name lego-moc-deployer

# Should output:
# {
#     "AttachedPolicies": [
#         {
#             "PolicyName": "SST-Deployment-Policy",
#             "PolicyArn": "arn:aws:iam::213351177820:policy/SST-Deployment-Policy"
#         }
#     ]
# }
```

---

## After Permissions Are Applied

Once verified, proceed with deployment:

```bash
# Deploy to production
cd apps/api
pnpm sst deploy --stage production
```

**Expected time**: 20-30 minutes

**What happens during deployment:**

1. Creates VPC with networking (5-10 min)
2. Creates RDS PostgreSQL database (10-15 min)
3. Creates OpenSearch domain (10-15 min)
4. Creates S3 buckets (1 min)
5. Creates Cognito User Pool (1 min)
6. Creates API Gateway + Lambda functions (2-5 min)
7. Creates DynamoDB table (1 min)
8. Creates CloudWatch alarms and dashboards (1 min)
9. Uploads runtime configuration (1 min)

**Total**: ~20-30 minutes (some resources create in parallel)

---

## Deployment Outputs

Save these outputs after deployment completes:

- `api`: API Gateway URL
- `websocketApi`: WebSocket API URL
- `database`: PostgreSQL connection string
- `bucket`: Main S3 bucket name
- `userPool`: Cognito User Pool ID
- `userPoolClient`: Cognito Client ID
- `identityPool`: Cognito Identity Pool ID
- `openSearchEndpoint`: OpenSearch endpoint
- `dashboardName`: CloudWatch dashboard name

You'll need these for frontend configuration!

---

## Troubleshooting

### "Policy already has 5 versions"

AWS limits policies to 5 versions. Delete old versions:

```bash
# List versions
aws iam list-policy-versions --policy-arn arn:aws:iam::213351177820:policy/SST-Deployment-Policy

# Delete old version (not the default)
aws iam delete-policy-version \
  --policy-arn arn:aws:iam::213351177820:policy/SST-Deployment-Policy \
  --version-id v1
```

### "Policy document too large"

The policy is 7.5KB, well under the 6KB limit for inline policies and 10KB for managed policies. If you get this error, verify the JSON file is not corrupted.

### "User has reached maximum policies"

AWS limits 10 managed policies per user. Remove unused policies from the user first.

---

## What Changed in This Update

Compared to the previous policy at `apps/api/docs/DEPLOYMENT_IAM_POLICY.json`, this adds:

1. **DynamoDB Permissions**: Create and manage DynamoDB tables
2. **ECS Permissions**: For OpenReplay and Umami containers
3. **Load Balancer Permissions**: For observability ALB
4. **Specific IAM Roles/Policies**:
   - OpenReplayTaskRole, UmamiTaskRole
   - ObservabilityEcsTaskExecutionRole
   - GrafanaWorkspaceRole, CognitoAuthenticatedRole
   - OpenSearchLambdaPolicy, OpenReplayS3Policy
   - GrafanaCloudWatchPolicy, GrafanaOpenSearchPolicy
   - LambdaEmfPolicy, UmamiRdsPolicy

These were identified from the failed deployment errors.

---

## Next Steps

1. ✅ Apply IAM policy using one of the methods above
2. ✅ Verify permissions are attached
3. ✅ Run deployment: `cd apps/api && pnpm sst deploy --stage production`
4. ✅ Save deployment outputs
5. ✅ Configure frontend with outputs
6. ✅ Deploy frontend
7. ✅ Run database migrations
8. ✅ Test the application

See `DEPLOYMENT_GUIDE.md` for complete instructions.
