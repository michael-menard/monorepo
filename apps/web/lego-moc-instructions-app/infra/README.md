# Lego MOC Instructions App - Infrastructure

This directory contains the Infrastructure as Code (IaC) configuration for deploying the Lego MOC Instructions App to AWS using the Serverless Framework.

## Architecture Overview

The infrastructure deploys the following AWS resources:

### Core Infrastructure
- **S3 Buckets**: Static website hosting, file uploads, and logs
- **CloudFront Distribution**: Global CDN for static content and API proxying
- **API Gateway**: REST API for serverless functions
- **Application Load Balancer**: Load balancing for backend services
- **Route 53**: DNS management and domain routing

### Security & Monitoring
- **WAF Web ACL**: Web application firewall for security
- **CloudWatch Logs**: Centralized logging
- **Secrets Manager**: Secure storage for sensitive data
- **Parameter Store**: Configuration management

### Serverless Functions
- **Health Check**: Application health monitoring
- **File Upload**: Secure file upload handling
- **Image Optimization**: Image processing and optimization
- **Cache Invalidation**: CloudFront cache management

## Prerequisites

### AWS Account Setup
1. AWS Account with appropriate permissions
2. AWS CLI configured with credentials
3. Domain name registered in Route 53 (or external registrar)

### Local Development Setup
1. Node.js 18+ and npm/pnpm
2. Serverless Framework CLI: `npm install -g serverless`
3. AWS CLI: `aws configure`

### Required AWS Services
- IAM (for permissions)
- S3 (for storage)
- CloudFront (for CDN)
- API Gateway (for APIs)
- Lambda (for serverless functions)
- Route 53 (for DNS)
- WAF (for security)
- Secrets Manager (for secrets)
- Parameter Store (for configuration)
- CloudWatch (for monitoring)

## Configuration

### Environment Variables

Create a `.env` file in the infra directory:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=default

# Domain Configuration
DOMAIN_NAME=lego-moc-instructions.com
CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# VPC Configuration (if using VPC)
VPC_ID=vpc-xxxxxxxxxxxxxxxxx
SUBNET_IDS=subnet-xxxxxxxxxxxxxxxxx,subnet-yyyyyyyyyyyyyyyyy
SECURITY_GROUP_IDS=sg-xxxxxxxxxxxxxxxxx

# Application Configuration
API_BASE_URL=https://api.lego-moc-instructions.com
ENVIRONMENT=dev
```

### Stage-Specific Configuration

The `serverless.yml` file includes stage-specific configurations for:
- **dev**: Development environment
- **staging**: Staging environment  
- **prod**: Production environment

Each stage has its own:
- Domain name
- SSL certificate
- API base URL
- Resource naming

## Deployment

### Initial Setup

1. **Install dependencies**:
   ```bash
   cd apps/web/lego-moc-instructions-app/infra
   npm install
   ```

2. **Configure AWS credentials**:
   ```bash
   aws configure
   ```

3. **Update configuration**:
   - Replace placeholder values in `serverless.yml`
   - Update domain names and certificate ARNs
   - Configure VPC settings if needed

### Deploy to Different Stages

#### Development
```bash
npm run deploy:dev
```

#### Staging
```bash
npm run deploy:staging
```

#### Production
```bash
npm run deploy:prod
```

### Deploy All Resources
```bash
npm run deploy
```

## Resource Management

### View Deployed Resources
```bash
# View all resources
npm run info

# View specific stage
npm run info:dev
npm run info:staging
npm run info:prod
```

### Remove Infrastructure
```bash
# Remove all resources
npm run remove

# Remove specific stage
npm run remove:dev
npm run remove:staging
npm run remove:prod
```

### Update Infrastructure
```bash
# Deploy updates
npm run deploy

# Validate before deployment
npm run validate
```

## Monitoring & Logs

### View Function Logs
```bash
# View all function logs
npm run logs

# View specific stage logs
npm run logs:dev
npm run logs:staging
npm run logs:prod
```

### CloudWatch Monitoring
- Log groups are automatically created
- Log retention is set to 14 days
- Metrics are available in CloudWatch console

## Security

### WAF Protection
- Rate limiting (2000 requests per IP)
- DDoS protection
- Geographic restrictions (configurable)

### IAM Permissions
- Least privilege access
- Service-specific roles
- Temporary credentials

### Data Encryption
- S3 buckets encrypted at rest
- CloudFront HTTPS only
- Secrets Manager encryption

## Cost Optimization

### CloudFront
- Price Class 100 (North America and Europe only)
- Optimized caching strategies
- Compression enabled

### S3 Lifecycle Policies
- Automatic deletion of old versions
- Incomplete multipart upload cleanup
- Log rotation and cleanup

### Lambda Optimization
- Appropriate memory allocation
- Efficient timeout settings
- Cold start optimization

## Troubleshooting

### Common Issues

1. **Deployment Failures**
   - Check AWS credentials
   - Verify IAM permissions
   - Review CloudFormation events

2. **Domain Issues**
   - Verify SSL certificate
   - Check Route 53 configuration
   - Validate DNS propagation

3. **Function Errors**
   - Check CloudWatch logs
   - Verify environment variables
   - Test locally with `serverless offline`

### Debug Commands

```bash
# Validate configuration
npm run validate

# Test functions locally
npm run offline

# Invoke functions
npm run invoke:local

# Check deployment status
npm run info
```

## Development Workflow

### Local Development
1. Start local development server:
   ```bash
   npm run offline
   ```

2. Test functions locally:
   ```bash
   npm run invoke:local
   ```

3. Build functions:
   ```bash
   npm run build
   ```

### CI/CD Integration

The infrastructure supports CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Deploy to AWS
  run: |
    cd apps/web/lego-moc-instructions-app/infra
    npm install
    npm run deploy:${{ github.ref_name }}
```

## Best Practices

### Security
- Use least privilege IAM policies
- Enable WAF protection
- Encrypt sensitive data
- Regular security audits

### Performance
- Optimize CloudFront caching
- Use appropriate Lambda memory
- Monitor and optimize costs
- Implement proper error handling

### Maintenance
- Regular dependency updates
- Monitor resource usage
- Backup critical data
- Test disaster recovery

## Support

For infrastructure issues:
1. Check CloudWatch logs
2. Review CloudFormation events
3. Consult AWS documentation
4. Contact the DevOps team

## Contributing

When making infrastructure changes:
1. Test locally first
2. Update documentation
3. Follow naming conventions
4. Review security implications
5. Test in staging before production 