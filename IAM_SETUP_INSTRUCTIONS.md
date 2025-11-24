# IAM Setup Instructions

## Current Situation

Your AWS user `lego-moc-deployer` (arn:aws:iam::213351177820:user/lego-moc-deployer) does not have sufficient permissions to deploy SST infrastructure.

The user cannot create its own permissions (this is a security feature of AWS), so you need to use either:

1. AWS Console with admin/privileged access
2. AWS CLI with admin credentials
3. Ask an AWS administrator to grant permissions

## Option 1: AWS Console (Recommended)

### Step 1: Log into AWS Console

- Go to https://console.aws.amazon.com
- Use an account with IAM permissions (admin or user management access)

### Step 2: Navigate to IAM

- Services → IAM → Policies
- Click "Create policy"

### Step 3: Create the Policy

1. Click the "JSON" tab
2. Copy and paste the contents from: `apps/api/docs/DEPLOYMENT_IAM_POLICY.json`
3. Click "Next: Tags"
4. (Optional) Add tags
5. Click "Next: Review"
6. Name it: `SST-Deployment-Policy`
7. Description: "Permissions for SST serverless infrastructure deployment"
8. Click "Create policy"

### Step 4: Attach to User

1. Go to IAM → Users → `lego-moc-deployer`
2. Click the "Permissions" tab
3. Click "Add permissions" → "Attach policies directly"
4. Search for "SST-Deployment-Policy"
5. Check the box next to it
6. Click "Next: Review"
7. Click "Add permissions"

### Step 5: Verify

Run this command to verify the policy is attached:
\`\`\`bash
aws iam list-attached-user-policies --user-name lego-moc-deployer
\`\`\`

You should see `SST-Deployment-Policy` in the list.

---

## Option 2: AWS CLI with Admin Credentials

If you have access to AWS credentials with admin permissions (different from lego-moc-deployer):

### Step 1: Configure Admin Profile

\`\`\`bash
aws configure --profile admin

# Enter your admin AWS Access Key ID

# Enter your admin AWS Secret Access Key

# Enter region: us-east-1

# Enter output format: json

\`\`\`

### Step 2: Create and Attach Policy

\`\`\`bash

# Create the policy

aws iam create-policy \\
--policy-name SST-Deployment-Policy \\
--policy-document file://apps/api/docs/DEPLOYMENT_IAM_POLICY.json \\
--profile admin

# Attach to user

aws iam attach-user-policy \\
--user-name lego-moc-deployer \\
--policy-arn arn:aws:iam::213351177820:policy/SST-Deployment-Policy \\
--profile admin
\`\`\`

### Step 3: Switch Back to Deployer

\`\`\`bash

# Remove admin profile (for security)

aws configure --profile default

# Re-enter lego-moc-deployer credentials

\`\`\`

---

## Option 3: Request Admin Assistance

If you don't have admin access, send this to your AWS administrator:

### Email Template

\`\`\`
Subject: IAM Policy Request for SST Deployment

Hi [Admin Name],

I need to deploy serverless infrastructure using SST (Serverless Stack) to AWS account 213351177820.

Please create and attach the IAM policy to user "lego-moc-deployer" using the JSON policy document attached.

Policy Name: SST-Deployment-Policy
User: lego-moc-deployer (arn:aws:iam::213351177820:user/lego-moc-deployer)

The policy grants permissions to create and manage:

- Lambda functions and API Gateway
- RDS PostgreSQL database
- S3 buckets and CloudWatch
- VPC networking resources
- Cognito authentication
- OpenSearch domain
- IAM roles for Lambda execution

All resources will be tagged with:

- Project: lego-api
- Environment: production
- ManagedBy: SST

Thank you!
\`\`\`

Attach: `apps/api/docs/DEPLOYMENT_IAM_POLICY.json`

---

## After Permissions Are Granted

Once the policy is attached, verify and deploy:

\`\`\`bash

# 1. Verify permissions

aws iam list-attached-user-policies --user-name lego-moc-deployer

# 2. You should see SST-Deployment-Policy listed

# 3. Deploy the infrastructure

cd apps/api
pnpm sst deploy --stage production
\`\`\`

Expected deployment time: 20-30 minutes

---

## Alternative: Use AWS Administrator Access Temporarily

If you have temporary admin access:

\`\`\`bash

# 1. Create policy

aws iam create-policy \\
--policy-name SST-Deployment-Policy \\
--policy-document file://apps/api/docs/DEPLOYMENT_IAM_POLICY.json

# 2. Attach to current user (lego-moc-deployer)

aws iam attach-user-policy \\
--user-name lego-moc-deployer \\
--policy-arn arn:aws:iam::213351177820:policy/SST-Deployment-Policy

# 3. Deploy

cd apps/api
pnpm sst deploy --stage production
\`\`\`

---

## Security Note

The policy grants broad permissions needed for infrastructure-as-code deployment. This is normal for CI/CD deployment users. After deployment, you can:

1. Use more restrictive policies for day-to-day operations
2. Limit production deployments to CI/CD pipelines only
3. Enable CloudTrail to audit all actions taken by this user

---

## Troubleshooting

### "Policy already exists"

If the policy already exists, just attach it:
\`\`\`bash
aws iam attach-user-policy \\
--user-name lego-moc-deployer \\
--policy-arn arn:aws:iam::213351177820:policy/SST-Deployment-Policy
\`\`\`

### "Policy document is too large"

The policy is under AWS limits. If you get this error, verify the JSON file is valid.

### "Cannot attach more policies"

AWS has a limit of 10 managed policies per user. You may need to:

1. Remove unused policies from the user
2. Consolidate policies
3. Use inline policies instead

---

## Next Steps

After permissions are granted:

1. ✅ Run deployment: `cd apps/api && pnpm sst deploy --stage production`
2. ✅ Save deployment outputs (API URLs, Cognito IDs, etc.)
3. ✅ Configure frontend with deployment outputs
4. ✅ Run database migrations
5. ✅ Test endpoints

See `DEPLOYMENT_GUIDE.md` for complete deployment instructions.
