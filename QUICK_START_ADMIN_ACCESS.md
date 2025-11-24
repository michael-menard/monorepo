# Quick Start: Grant Admin Access (Temporary)

## Why This Makes Sense

For initial deployment and troubleshooting, giving `lego-moc-deployer` **temporary admin access** is the fastest approach. Once deployment succeeds, you can:

1. Review CloudTrail logs to see exactly what permissions were used
2. Create a least-privilege policy
3. Replace admin access with the minimal policy

## Grant Admin Access

### Method 1: AWS Console (Easiest)

1. Log into AWS Console: https://console.aws.amazon.com
2. Go to: IAM → Users → `lego-moc-deployer`
3. Click "Permissions" tab
4. Click "Add permissions" → "Attach policies directly"
5. Search for: **AdministratorAccess**
6. Check the box
7. Click "Add permissions"

**Done!** The user now has full admin access.

### Method 2: AWS CLI (With Admin Credentials)

```bash
aws iam attach-user-policy \
  --user-name lego-moc-deployer \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

## Verify Admin Access

```bash
aws iam list-attached-user-policies --user-name lego-moc-deployer
```

Should show:

```json
{
  "AttachedPolicies": [
    {
      "PolicyName": "AdministratorAccess",
      "PolicyArn": "arn:aws:iam::aws:policy/AdministratorAccess"
    }
  ]
}
```

## Deploy Immediately

```bash
cd apps/api
pnpm sst deploy --stage production
```

**Time**: 20-30 minutes

## After Successful Deployment

### Step 1: Enable CloudTrail (If Not Already)

This tracks all AWS API calls:

```bash
# Check if CloudTrail is enabled
aws cloudtrail describe-trails

# If not enabled, create a trail (optional - for future auditing)
```

### Step 2: Review What Was Created

Look at the resources created in AWS Console:

- VPC, Subnets, NAT Gateway
- RDS Database
- OpenSearch Domain
- Lambda Functions
- API Gateway
- S3 Buckets
- IAM Roles
- DynamoDB Tables
- CloudWatch Resources

### Step 3: Create Least-Privilege Policy (Later)

After deployment works, you can:

1. Use CloudTrail to see exact permissions used
2. Update the policy at `infrastructure/iam-policies/complete-sst-deployment-policy.json`
3. Test with the restricted policy
4. Remove admin access once confirmed working

```bash
# Remove admin access
aws iam detach-user-policy \
  --user-name lego-moc-deployer \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Attach least-privilege policy
aws iam attach-user-policy \
  --user-name lego-moc-deployer \
  --policy-arn arn:aws:iam::213351177820:policy/SST-Deployment-Policy
```

## Security Notes

### ✅ Safe for Development/Testing

- Temporary admin access is common during initial setup
- Fine for testing environments
- Good for troubleshooting deployment issues

### ⚠️ Production Considerations

- Remove admin access after initial deployment
- Use least-privilege for production CI/CD
- Enable CloudTrail for audit logging
- Consider using temporary credentials (STS assume role)
- Rotate access keys regularly

## Quick Deploy Checklist

- [ ] Grant admin access (5 minutes)
- [ ] Run deployment: `cd apps/api && pnpm sst deploy --stage production` (20-30 minutes)
- [ ] Save deployment outputs
- [ ] Configure frontend with outputs
- [ ] Test the deployment
- [ ] (Later) Create least-privilege policy and remove admin access

---

## What Happens Next

Once admin access is granted, the deployment will:

1. ✅ Create VPC and networking
2. ✅ Create RDS PostgreSQL
3. ✅ Create OpenSearch domain
4. ✅ Create S3 buckets
5. ✅ Create Cognito User Pool
6. ✅ Create API Gateway + Lambda functions
7. ✅ Create DynamoDB tables
8. ✅ Create CloudWatch monitoring
9. ✅ Deploy all infrastructure

**No more permission errors!**

After deployment completes, you'll get outputs like:

```
api: https://abc123.execute-api.us-east-1.amazonaws.com
websocketApi: wss://xyz789.execute-api.us-east-1.amazonaws.com
userPool: us-east-1_ABC123XYZ
userPoolClient: 1a2b3c4d5e6f7g8h9i0j
identityPool: us-east-1:12345678-1234-1234-1234-123456789abc
database: postgres://...
bucket: lego-api-bucket-abc123
```

Save these for frontend configuration!

---

## Troubleshooting

### Still getting errors after granting admin?

- Wait 30 seconds for IAM changes to propagate
- Run: `aws iam list-attached-user-policies --user-name lego-moc-deployer` to verify
- Make sure you're using the right AWS profile

### Deployment takes too long?

- RDS + OpenSearch can take 15-20 minutes each
- This is normal for first deployment
- Subsequent updates are faster

### Want to start over?

```bash
cd apps/api
pnpm sst remove --stage production
# Then deploy again
```

---

**Ready to deploy?** Grant admin access and run:

```bash
cd apps/api && pnpm sst deploy --stage production
```
