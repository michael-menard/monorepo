# Cognito Authentication Stack

AWS Cognito User Pool, App Client, and Identity Pool for authentication.

## Resources Created

- **User Pool**: Email-based authentication with password policy
- **User Pool Client**: OAuth 2.0 authorization code flow for SPA
- **Identity Pool**: AWS credentials for authenticated users
- **IAM Roles**: Authenticated and unauthenticated roles

## Prerequisites

- AWS CLI configured with appropriate permissions
- AWS account with Cognito access

## Deployment

### Development

```bash
aws cloudformation deploy \
  --template-file template.yaml \
  --stack-name lego-moc-cognito-dev \
  --parameter-overrides Environment=dev \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### Production

```bash
aws cloudformation deploy \
  --template-file template.yaml \
  --stack-name lego-moc-cognito-production \
  --parameter-overrides \
    Environment=production \
    CallbackUrls='https://lego-moc-instructions.com/auth/callback' \
    LogoutUrls='https://lego-moc-instructions.com/auth/logout' \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

## Get Stack Outputs

```bash
aws cloudformation describe-stacks \
  --stack-name lego-moc-cognito-dev \
  --query 'Stacks[0].Outputs' \
  --output table
```

## Environment Variables

After deployment, set these environment variables:

```bash
# Backend (.env)
COGNITO_USER_POOL_ID=<UserPoolId output>
COGNITO_CLIENT_ID=<UserPoolClientId output>
COGNITO_REGION=us-east-1

# Frontend (.env)
VITE_AWS_USER_POOL_ID=<UserPoolId output>
VITE_AWS_USER_POOL_WEB_CLIENT_ID=<UserPoolClientId output>
VITE_AWS_REGION=us-east-1
```

## Delete Stack

```bash
aws cloudformation delete-stack --stack-name lego-moc-cognito-dev
```

**Warning**: Production stack has deletion protection enabled. Disable it first:

```bash
aws cognito-idp update-user-pool \
  --user-pool-id <UserPoolId> \
  --deletion-protection INACTIVE
```
