# Auth Service Infrastructure

This directory contains the CloudFormation template and deployment scripts for the Auth Service infrastructure.

## Overview

The infrastructure includes:
- **DynamoDB Table**: User data storage with GSIs for email, reset tokens, and timestamps
- **API Gateway**: RESTful API with CORS support and custom domain capability
- **Lambda Functions**: Serverless functions for all auth operations
- **IAM Roles & Permissions**: Secure access controls
- **KMS Key**: JWT secret encryption
- **WAF Web ACL**: Security protection against common attacks
- **CloudWatch**: Monitoring, logging, and alarms
- **SNS**: Alert notifications

## Files

- `auth-service-cloudformation.yml` - Main CloudFormation template
- `deploy.sh` - Deployment script with environment support
- `README.md` - This documentation

## Prerequisites

1. **AWS CLI** installed and configured
2. **AWS credentials** with appropriate permissions
3. **S3 bucket** for CloudFormation artifacts (optional)

## Deployment

### Quick Start

```bash
# Deploy to dev environment
./deploy.sh dev

# Deploy to staging environment
./deploy.sh staging

# Deploy to production environment
./deploy.sh prod
```

### Custom Deployment

```bash
# Deploy with custom stack name
./deploy.sh dev my-auth-stack

# Deploy to specific region
AWS_REGION=us-west-2 ./deploy.sh dev
```

## Infrastructure Components

### DynamoDB Table
- **Name**: `auth-service-users-{environment}`
- **Billing**: Pay-per-request
- **Encryption**: KMS encryption at rest
- **Backup**: Point-in-time recovery enabled
- **Indexes**:
  - EmailIndex (for user lookup by email)
  - ResetTokenIndex (for password reset)
  - CreatedAtIndex (for user analytics)

### API Gateway
- **Type**: Regional REST API
- **CORS**: Enabled for all endpoints
- **Custom Domain**: Optional support
- **Security**: WAF protection enabled
- **Endpoints**:
  - `POST /auth/signup` - User registration
  - `POST /auth/login` - User authentication
  - `POST /auth/logout` - User logout
  - `POST /auth/refresh` - Token refresh
  - `POST /auth/reset-password` - Password reset request
  - `POST /auth/confirm-reset` - Password reset confirmation
  - `GET /auth/health` - Health check

### Lambda Functions
Each endpoint has its own Lambda function:
- **Runtime**: Node.js 18.x
- **Timeout**: 30 seconds
- **Memory**: Default (128MB)
- **Environment Variables**:
  - `USERS_TABLE` - DynamoDB table name
  - `JWT_SECRET` - KMS key ARN
  - `ENVIRONMENT` - Environment name

### Security Features
- **WAF Web ACL**: Rate limiting and attack protection
- **KMS Encryption**: JWT secrets encrypted at rest
- **IAM Roles**: Least privilege access
- **CloudWatch Alarms**: Error monitoring
- **SNS Notifications**: Alert delivery

### Monitoring & Logging
- **CloudWatch Logs**: Lambda function logs
- **CloudWatch Metrics**: API Gateway and Lambda metrics
- **CloudWatch Dashboard**: Real-time monitoring
- **CloudWatch Alarms**: Error rate and performance alerts

## Environment Variables

The template supports these parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| Environment | String | dev | Environment name (dev/staging/prod) |
| ProjectName | String | auth-service | Project name for resource naming |
| DomainName | String | '' | Custom domain name (optional) |
| CertificateArn | String | '' | ACM certificate ARN (optional) |

## Outputs

After deployment, the stack provides these outputs:

| Output | Description |
|--------|-------------|
| ApiGatewayUrl | API Gateway base URL |
| ApiGatewayId | API Gateway ID |
| DynamoDBTableName | DynamoDB table name |
| DynamoDBTableArn | DynamoDB table ARN |
| JwtSecretArn | KMS key ARN for JWT secrets |
| LambdaExecutionRoleArn | Lambda execution role ARN |
| WebACLArn | WAF Web ACL ARN |
| AlarmTopicArn | SNS topic ARN for alarms |
| CustomDomainName | Custom domain name (if configured) |

## Security Considerations

### Data Protection
- All data encrypted at rest with KMS
- DynamoDB table encrypted with customer-managed keys
- JWT secrets stored in KMS with access controls

### Network Security
- WAF protection against common attacks
- Rate limiting to prevent abuse
- CORS configuration for controlled access

### Access Control
- IAM roles with least privilege
- Lambda functions isolated by endpoint
- API Gateway authorization controls

### Monitoring
- CloudWatch alarms for error rates
- SNS notifications for critical events
- Comprehensive logging for audit trails

## Cost Optimization

### DynamoDB
- Pay-per-request billing (no provisioned capacity)
- GSIs optimized for common queries
- Point-in-time recovery for backup

### Lambda
- 30-second timeout (optimized for auth operations)
- Minimal memory allocation (128MB default)
- Cold start optimization through proper packaging

### API Gateway
- Regional deployment for latency
- Caching disabled (auth operations are stateful)
- Request/response transformation minimized

## Troubleshooting

### Common Issues

1. **Stack Creation Fails**
   - Check AWS credentials and permissions
   - Verify region availability
   - Ensure no naming conflicts

2. **Lambda Function Errors**
   - Check CloudWatch logs
   - Verify environment variables
   - Test function locally

3. **API Gateway Issues**
   - Check CORS configuration
   - Verify Lambda permissions
   - Test endpoints with curl

### Useful Commands

```bash
# Check stack status
aws cloudformation describe-stacks --stack-name auth-service-stack

# View stack outputs
aws cloudformation describe-stacks --stack-name auth-service-stack --query 'Stacks[0].Outputs'

# View Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/auth-service"

# Test API endpoint
curl -X GET https://your-api-id.execute-api.region.amazonaws.com/dev/auth/health
```

## Customization

### Adding Custom Domain
1. Create ACM certificate for your domain
2. Update parameters in deployment script
3. Deploy with custom domain parameters

### Adding New Endpoints
1. Add Lambda function to template
2. Add API Gateway resource and method
3. Update deployment dependencies
4. Add Lambda permission

### Environment-Specific Configurations
1. Modify parameters file in deployment script
2. Add environment-specific resources
3. Update IAM policies as needed

## Best Practices

1. **Security First**: Always use least privilege access
2. **Monitoring**: Set up comprehensive logging and alerts
3. **Testing**: Test in dev environment before production
4. **Backup**: Enable point-in-time recovery for critical data
5. **Documentation**: Keep infrastructure documentation updated
6. **Version Control**: Track infrastructure changes in Git
7. **Automation**: Use CI/CD for infrastructure deployments 