# Auth Service CI/CD Pipeline

This document describes the AWS CodePipeline setup for the Auth Service project, including CodeBuild, CloudFormation deployment, and monitoring.

## Overview

The CI/CD pipeline provides:
- **Automated builds** with CodeBuild
- **Infrastructure as Code** with CloudFormation
- **Multi-environment deployment** (dev, staging, prod)
- **GitHub integration** with webhook triggers
- **Email notifications** for pipeline status
- **Monitoring and logging** with CloudWatch

## Architecture

```
GitHub Repository
       ↓
   CodePipeline
       ↓
   CodeBuild (Build & Test)
       ↓
   CloudFormation (Infrastructure)
       ↓
   CloudFormation (Lambda Functions)
       ↓
   AWS Resources (DynamoDB, API Gateway, Lambda, etc.)
```

## Pipeline Stages

### 1. Source Stage
- **Provider**: GitHub
- **Trigger**: Push to monitored branch
- **Artifacts**: Source code

### 2. Build Stage
- **Provider**: AWS CodeBuild
- **Actions**: 
  - Install dependencies
  - Build TypeScript
  - Run tests
  - Lint code
  - Package artifacts
  - Validate CloudFormation templates

### 3. Deploy Stage
- **Provider**: AWS CloudFormation
- **Actions**:
  - Deploy infrastructure (DynamoDB, API Gateway, IAM, etc.)
  - Deploy Lambda functions
  - Update environment-specific configurations

## Files

### Core Files
- `buildspec.yml` - CodeBuild configuration
- `codepipeline-cloudformation.yml` - Pipeline infrastructure template
- `deploy-pipeline.sh` - Pipeline deployment script

### Parameter Files
- `params-dev.json` - Development environment parameters
- `params-staging.json` - Staging environment parameters
- `params-prod.json` - Production environment parameters

## Prerequisites

1. **AWS CLI** installed and configured
2. **GitHub Personal Access Token** with repo access
3. **AWS credentials** with appropriate permissions
4. **S3 bucket** for pipeline artifacts (will be created)

## Deployment

### Quick Start

```bash
# Deploy pipeline for dev environment
./deploy-pipeline.sh dev

# Deploy pipeline for staging environment
./deploy-pipeline.sh staging

# Deploy pipeline for production environment
./deploy-pipeline.sh prod
```

### Manual Deployment

```bash
# Deploy with custom parameters
aws cloudformation create-stack \
  --stack-name auth-service-pipeline-dev \
  --template-body file://codepipeline-cloudformation.yml \
  --parameters file://params-dev.json \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

## Environment Configuration

### Development Environment
- **Branch**: `develop`
- **Auto-deploy**: Yes
- **Notifications**: Dev team
- **Artifacts**: 30-day retention

### Staging Environment
- **Branch**: `staging`
- **Auto-deploy**: Yes
- **Notifications**: Staging team
- **Artifacts**: 30-day retention

### Production Environment
- **Branch**: `main`
- **Auto-deploy**: Yes (with approval)
- **Notifications**: Production team
- **Artifacts**: 30-day retention

## Build Process

### CodeBuild Configuration (`buildspec.yml`)

#### Install Phase
- Install Node.js 18.x
- Install AWS CLI
- Install project dependencies

#### Pre-build Phase
- Set environment based on branch
- Create build directories
- Log build information

#### Build Phase
- Build TypeScript code
- Run unit tests
- Run linting
- Copy source files
- Create deployment package
- Validate CloudFormation templates

#### Post-build Phase
- Create environment files
- Create parameter files
- Package artifacts

### Build Artifacts
- Compiled TypeScript code
- CloudFormation templates
- Parameter files
- Environment configuration
- Build metadata

## Security Features

### IAM Roles
- **CodeBuild Role**: Limited permissions for build operations
- **CodePipeline Role**: Pipeline execution permissions
- **CloudFormation Role**: Infrastructure deployment permissions

### S3 Security
- **Encryption**: AES256 server-side encryption
- **Access Control**: Private bucket with IAM policies
- **Lifecycle**: Automatic cleanup of old artifacts

### GitHub Integration
- **OAuth Token**: Secure token storage
- **Webhook Security**: HTTPS endpoints only
- **Branch Protection**: Environment-specific branches

## Monitoring and Notifications

### CloudWatch Monitoring
- **Build Metrics**: Duration, success rate
- **Pipeline Metrics**: Execution time, stage transitions
- **Custom Dashboards**: Real-time monitoring

### SNS Notifications
- **Pipeline State Changes**: Success/failure notifications
- **Email Subscriptions**: Team-specific notifications
- **EventBridge Integration**: Automated responses

### Logging
- **CloudWatch Logs**: Build and pipeline logs
- **S3 Logs**: Long-term log storage
- **Structured Logging**: JSON format for analysis

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs
   aws logs describe-log-groups --log-group-name-prefix "/aws/codebuild/auth-service"
   
   # View recent builds
   aws codebuild list-builds --project-name auth-service-build-dev
   ```

2. **Pipeline Failures**
   ```bash
   # Check pipeline status
   aws codepipeline get-pipeline-state --name auth-service-pipeline-dev
   
   # View pipeline execution history
   aws codepipeline list-pipeline-executions --pipeline-name auth-service-pipeline-dev
   ```

3. **CloudFormation Failures**
   ```bash
   # Check stack events
   aws cloudformation describe-stack-events --stack-name auth-service-infrastructure-dev
   
   # Validate template
   aws cloudformation validate-template --template-body file://auth-service-cloudformation.yml
   ```

### Debug Commands

```bash
# Check pipeline status
aws codepipeline get-pipeline-state --name auth-service-pipeline-dev

# View build logs
aws logs tail /aws/codebuild/auth-service-dev --follow

# Check stack outputs
aws cloudformation describe-stacks --stack-name auth-service-infrastructure-dev --query 'Stacks[0].Outputs'

# Test GitHub connection
aws codepipeline get-pipeline --name auth-service-pipeline-dev
```

## Best Practices

### Security
1. **Use IAM Roles**: Never use access keys in pipeline
2. **Rotate Tokens**: Regularly update GitHub tokens
3. **Limit Permissions**: Use least privilege access
4. **Encrypt Secrets**: Store sensitive data in AWS Secrets Manager

### Reliability
1. **Test Locally**: Test builds before pushing
2. **Rollback Strategy**: Plan for deployment failures
3. **Monitoring**: Set up comprehensive alerts
4. **Documentation**: Keep pipeline documentation updated

### Performance
1. **Caching**: Use CodeBuild caching for dependencies
2. **Parallel Builds**: Optimize build stages
3. **Artifact Management**: Clean up old artifacts
4. **Resource Optimization**: Right-size build instances

## Customization

### Adding New Environments
1. Create parameter file (`params-newenv.json`)
2. Update deployment script
3. Configure environment-specific settings
4. Deploy pipeline for new environment

### Adding New Stages
1. Update `buildspec.yml`
2. Modify pipeline template
3. Add stage-specific permissions
4. Test in development first

### Custom Build Steps
1. Modify `buildspec.yml`
2. Add custom scripts
3. Update artifact configuration
4. Test build process

## Cost Optimization

### CodeBuild
- **Instance Type**: Use smallest suitable instance
- **Build Time**: Optimize build process
- **Caching**: Enable dependency caching

### S3 Storage
- **Lifecycle Policies**: Automatic cleanup
- **Compression**: Compress artifacts
- **Storage Classes**: Use appropriate storage tiers

### CloudWatch
- **Log Retention**: Set appropriate retention periods
- **Custom Metrics**: Monitor only necessary metrics
- **Alarms**: Use cost-effective alarm configurations

## Maintenance

### Regular Tasks
1. **Update Dependencies**: Keep build tools current
2. **Rotate Tokens**: Update GitHub tokens regularly
3. **Clean Artifacts**: Monitor S3 storage usage
4. **Review Logs**: Check for errors and warnings

### Monitoring
1. **Pipeline Health**: Monitor success rates
2. **Build Performance**: Track build times
3. **Resource Usage**: Monitor AWS resource consumption
4. **Security**: Regular security audits

## Support

For issues with the pipeline:
1. Check CloudWatch logs first
2. Review build artifacts
3. Test locally if possible
4. Contact DevOps team for assistance

## References

- [AWS CodePipeline Documentation](https://docs.aws.amazon.com/codepipeline/)
- [AWS CodeBuild Documentation](https://docs.aws.amazon.com/codebuild/)
- [AWS CloudFormation Documentation](https://docs.aws.amazon.com/cloudformation/)
- [GitHub Webhooks Documentation](https://developer.github.com/webhooks/) 