# AWS IAM User Setup Guide for LEGO MOC Monorepo

Step-by-step guide to create a dedicated IAM user with CLI-only access for deploying this monorepo infrastructure.

## Table of Contents

1. [Create IAM User](#step-1-create-iam-user)
2. [Create Custom IAM Policy](#step-2-create-custom-iam-policy)
3. [Attach Policies to User](#step-3-attach-policies-to-user)
4. [Generate Access Keys](#step-4-generate-access-keys)
5. [Configure Local Credentials](#step-5-configure-local-credentials)
6. [Verify Setup](#step-6-verify-setup)

---

## Step 1: Create IAM User

### 1.1 Navigate to IAM Console

1. Log into your AWS account at https://console.aws.amazon.com
2. Search for **IAM** in the top search bar
3. Click on **IAM** to open the Identity and Access Management console

### 1.2 Create New User

1. In the left sidebar, click **Users**
2. Click **Create user** button (top right)
3. **User name**: Enter `lego-moc-deployer` (or your preferred name)
4. **Provide user access to the AWS Management Console**: **UNCHECK** this box
   - We only want CLI access, not console access
5. Click **Next**

---

## Step 2: Create Custom IAM Policy

We'll create a custom policy that grants exactly what's needed for CDK deployment.

### 2.1 Open Policies Page

1. In a **new browser tab**, go to IAM Console
2. Click **Policies** in the left sidebar
3. Click **Create policy** button

### 2.2 Use JSON Editor

1. Click the **JSON** tab
2. **Delete** the existing placeholder content
3. **Copy and paste** the policy below:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CDKBootstrapAndDeploy",
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "iam:CreateRole",
        "iam:PutRolePolicy",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:GetRole",
        "iam:PassRole",
        "iam:DeleteRole",
        "iam:GetRolePolicy",
        "iam:CreatePolicy",
        "iam:DeletePolicy",
        "iam:GetPolicy",
        "iam:GetPolicyVersion",
        "iam:ListPolicyVersions",
        "iam:CreatePolicyVersion",
        "iam:DeletePolicyVersion",
        "ssm:GetParameter",
        "ssm:PutParameter",
        "ssm:DeleteParameter",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ECSFullAccess",
      "Effect": "Allow",
      "Action": [
        "ecs:*",
        "ecr:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "EC2VPCNetworking",
      "Effect": "Allow",
      "Action": [
        "ec2:CreateVpc",
        "ec2:DeleteVpc",
        "ec2:DescribeVpcs",
        "ec2:ModifyVpcAttribute",
        "ec2:CreateSubnet",
        "ec2:DeleteSubnet",
        "ec2:DescribeSubnets",
        "ec2:CreateRouteTable",
        "ec2:DeleteRouteTable",
        "ec2:DescribeRouteTables",
        "ec2:AssociateRouteTable",
        "ec2:DisassociateRouteTable",
        "ec2:CreateRoute",
        "ec2:DeleteRoute",
        "ec2:CreateInternetGateway",
        "ec2:DeleteInternetGateway",
        "ec2:AttachInternetGateway",
        "ec2:DetachInternetGateway",
        "ec2:DescribeInternetGateways",
        "ec2:CreateNatGateway",
        "ec2:DeleteNatGateway",
        "ec2:DescribeNatGateways",
        "ec2:AllocateAddress",
        "ec2:ReleaseAddress",
        "ec2:DescribeAddresses",
        "ec2:CreateSecurityGroup",
        "ec2:DeleteSecurityGroup",
        "ec2:DescribeSecurityGroups",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:AuthorizeSecurityGroupEgress",
        "ec2:RevokeSecurityGroupIngress",
        "ec2:RevokeSecurityGroupEgress",
        "ec2:CreateTags",
        "ec2:DeleteTags",
        "ec2:DescribeTags",
        "ec2:DescribeAvailabilityZones",
        "ec2:DescribeAccountAttributes"
      ],
      "Resource": "*"
    },
    {
      "Sid": "LoadBalancers",
      "Effect": "Allow",
      "Action": [
        "elasticloadbalancing:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DatabaseServices",
      "Effect": "Allow",
      "Action": [
        "rds:*",
        "docdb:*",
        "elasticache:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "OpenSearchService",
      "Effect": "Allow",
      "Action": [
        "es:*",
        "opensearch:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudFrontAndCertificates",
      "Effect": "Allow",
      "Action": [
        "cloudfront:*",
        "acm:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "Route53DNS",
      "Effect": "Allow",
      "Action": [
        "route53:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "SecretsManager",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CDKAssetUpload",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::cdk-*",
        "arn:aws:s3:::cdk-*/*"
      ]
    }
  ]
}
```

### 2.3 Name and Create Policy

1. Click **Next**
2. **Policy name**: Enter `LegoMocDeployerPolicy`
3. **Description**: Enter `CDK deployment permissions for LEGO MOC monorepo`
4. Click **Create policy**

### 2.4 Alternative: Use AWS Managed Policies (Simpler but Less Secure)

If you prefer a simpler approach (not recommended for production):

1. Skip creating the custom policy above
2. When attaching policies in Step 3, use these AWS managed policies:
   - `PowerUserAccess` (grants most permissions except IAM)
   - `IAMFullAccess` (for CDK to create roles)

**Note**: This gives more permissions than needed. Use custom policy for production.

---

## Step 3: Attach Policies to User

### 3.1 Return to User Creation

1. Go back to the browser tab where you were creating the user
2. You should be on the **Set permissions** page

### 3.2 Attach Custom Policy

1. Select **Attach policies directly**
2. In the search box, type `LegoMocDeployerPolicy`
3. **Check the box** next to `LegoMocDeployerPolicy`
4. Click **Next**

### 3.3 Review and Create

1. Review the user details:
   - User name: `lego-moc-deployer`
   - AWS access type: Programmatic access
   - Permissions: `LegoMocDeployerPolicy`
2. Click **Create user**

---

## Step 4: Generate Access Keys

### 4.1 Navigate to User

1. In IAM Console, click **Users** in left sidebar
2. Click on the **lego-moc-deployer** user you just created

### 4.2 Create Access Key

1. Click the **Security credentials** tab
2. Scroll down to **Access keys** section
3. Click **Create access key**

### 4.3 Choose Use Case

1. Select **Command Line Interface (CLI)**
2. **Check** the confirmation box at the bottom
3. Click **Next**

### 4.4 Add Description Tag (Optional)

1. **Description tag**: Enter `LEGO MOC Monorepo CLI Access`
2. Click **Create access key**

### 4.5 Save Your Credentials

**CRITICAL**: This is the **ONLY TIME** you'll see the secret access key!

You'll see:
- **Access key ID**: Something like `AKIAIOSFODNN7EXAMPLE`
- **Secret access key**: Something like `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

**Option 1**: Download the CSV file
- Click **Download .csv file**
- Store it securely (password manager recommended)

**Option 2**: Copy to clipboard
- Keep this page open while you configure credentials in Step 5

⚠️ **DO NOT**:
- Share these keys with anyone
- Commit them to git
- Store them in plain text files
- Email them to yourself

---

## Step 5: Configure Local Credentials

### 5.1 Edit Credentials File

The credentials file has already been created at `~/.aws/credentials`.

Open it with your preferred editor:

```bash
# Using nano
nano ~/.aws/credentials

# Using VS Code
code ~/.aws/credentials

# Using vim
vim ~/.aws/credentials
```

### 5.2 Add Your Keys

Replace the placeholders with your actual keys from Step 4:

```ini
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Replace**:
- `AKIAIOSFODNN7EXAMPLE` with your actual Access Key ID
- `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` with your actual Secret Access Key

### 5.3 Save and Close

- **nano**: Press `Ctrl+X`, then `Y`, then `Enter`
- **VS Code**: `Cmd+S` (Mac) or `Ctrl+S` (Windows/Linux)
- **vim**: Press `Esc`, type `:wq`, press `Enter`

### 5.4 Verify Permissions

Ensure the file has secure permissions:

```bash
chmod 600 ~/.aws/credentials
chmod 600 ~/.aws/config
```

---

## Step 6: Verify Setup

### 6.1 Test AWS CLI Access

Run this command to verify your credentials work:

```bash
aws sts get-caller-identity
```

**Expected output**:
```json
{
    "UserId": "AIDAXXXXXXXXXXXXXXXXX",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/lego-moc-deployer"
}
```

✅ If you see this, your credentials are working!

### 6.2 Test Specific Permissions

Test that you can list S3 buckets:

```bash
aws s3 ls
```

Test CloudFormation access:

```bash
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE
```

### 6.3 Set Environment Variables

For convenience, add these to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION=us-east-1
export CDK_DEFAULT_REGION=us-east-1
```

Apply the changes:

```bash
source ~/.zshrc  # or ~/.bashrc
```

---

## Next Steps

Now that your IAM user is set up, you can:

1. **Bootstrap CDK**:
   ```bash
   cd /Users/michaelmenard/Development/Monorepo

   # Get your account ID
   export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

   # Bootstrap CDK
   npx cdk bootstrap aws://$AWS_ACCOUNT_ID/us-east-1
   ```

2. **Deploy Infrastructure**:
   Follow the steps in `INFRASTRUCTURE_DEPLOYMENT_GUIDE.md`

---

## Security Best Practices

### ✅ DO:
- Rotate access keys every 90 days
- Use separate IAM users for different team members
- Enable MFA on your root account
- Store credentials in a password manager
- Use least-privilege permissions

### ❌ DON'T:
- Use root account credentials
- Share access keys between team members
- Commit credentials to version control
- Give `AdministratorAccess` unless necessary
- Leave unused access keys active

---

## Troubleshooting

### "Access Denied" Errors

If you get permission errors during deployment:

1. **Check policy attachment**:
   ```bash
   aws iam list-attached-user-policies --user-name lego-moc-deployer
   ```

2. **Add missing permissions**: Edit the `LegoMocDeployerPolicy` in IAM Console

3. **Verify credentials**:
   ```bash
   aws sts get-caller-identity
   ```

### "Invalid Credentials" Errors

1. **Re-check credentials file**:
   ```bash
   cat ~/.aws/credentials
   ```

2. **Ensure no extra spaces** around the `=` signs

3. **Regenerate access keys** if needed (go back to Step 4)

### Need More Permissions?

If CDK deployment fails due to missing permissions, you can:

1. **Review CloudFormation error** to identify missing permission
2. **Update the policy** in IAM Console → Policies → LegoMocDeployerPolicy → Edit
3. **Add the required permission** to the appropriate statement
4. **Save** and retry deployment

---

## Cleanup (When Done)

To remove the IAM user when no longer needed:

1. **Delete access keys**:
   - IAM Console → Users → lego-moc-deployer → Security credentials
   - Click **Delete** next to each access key

2. **Delete user**:
   - IAM Console → Users → lego-moc-deployer
   - Click **Delete user**

3. **Delete policy** (if no longer used):
   - IAM Console → Policies → LegoMocDeployerPolicy
   - Actions → Delete

---

## Support

For AWS IAM issues:
- AWS IAM Documentation: https://docs.aws.amazon.com/iam/
- AWS Support: https://console.aws.amazon.com/support/

For CDK deployment issues:
- See `INFRASTRUCTURE_DEPLOYMENT_GUIDE.md`
- AWS CDK Documentation: https://docs.aws.amazon.com/cdk/
