# Shared Infrastructure Services

This CDK application manages the shared AWS infrastructure services for the LEGO MOC platform, replacing the Docker services with managed AWS services.

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS Infrastructure                        │
├─────────────────────────────────────────────────────────────┤
│  VPC Stack (Foundation)                                     │
│  ├── Public Subnets (ALB, NAT Gateway)                     │
│  ├── Private Subnets (Applications)                        │
│  └── Database Subnets (Isolated)                           │
├─────────────────────────────────────────────────────────────┤
│  Database Stack                                             │
│  ├── DocumentDB (MongoDB-compatible) - Auth Service        │
│  └── RDS PostgreSQL - LEGO Projects API                    │
├─────────────────────────────────────────────────────────────┤
│  Cache Stack                                                │
│  └── ElastiCache Redis - Session & API caching             │
├─────────────────────────────────────────────────────────────┤
│  Search Stack                                               │
│  └── OpenSearch - Full-text search for LEGO instructions   │
├─────────────────────────────────────────────────────────────┤
│  Monitoring Stack                                           │
│  ├── CloudWatch Dashboard                                   │
│  ├── CloudWatch Alarms                                      │
│  └── SNS Notifications                                      │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 **Deployment Commands**

### **Prerequisites**
```bash
# Install dependencies
pnpm install

# Bootstrap CDK (first time only)
pnpm bootstrap

# Build the CDK app
pnpm build
```

### **Environment Deployment**
```bash
# Development environment
pnpm deploy:dev

# Staging environment  
pnpm deploy:staging

# Production environment
pnpm deploy:prod

# Deploy all stacks
pnpm deploy
```

### **Management Commands**
```bash
# View what will be deployed
pnpm diff

# List all stacks
pnpm ls

# Synthesize CloudFormation templates
pnpm synth

# Destroy all stacks (careful!)
pnpm destroy
```

## 📋 **Stack Dependencies**

The stacks are deployed in this order due to dependencies:

1. **VPC Stack** - Foundation networking
2. **Database Stack** - Depends on VPC
3. **Cache Stack** - Depends on VPC  
4. **Search Stack** - Depends on VPC
5. **Monitoring Stack** - Depends on all other stacks

## 🔧 **Environment Configuration**

Each environment has different configurations:

### **Development**
- **Cost-optimized**: Single AZ, smaller instances
- **DocumentDB**: 1x db.t3.medium
- **RDS**: 1x db.t3.micro
- **Redis**: 1x cache.t3.micro
- **OpenSearch**: 1x t3.small.search

### **Staging**
- **High availability**: Multi-AZ where supported
- **DocumentDB**: 2x db.r5.large
- **RDS**: 1x db.t3.small (Multi-AZ)
- **Redis**: 2x cache.t3.small
- **OpenSearch**: 2x t3.medium.search

### **Production**
- **High availability**: Multi-AZ, read replicas
- **DocumentDB**: 3x db.r5.xlarge
- **RDS**: 1x db.r5.large (Multi-AZ) + Read Replica
- **Redis**: 3x cache.r6g.large
- **OpenSearch**: 3x m6g.large.search + Master nodes

## 🔐 **Security Features**

- **VPC**: Private subnets for all databases
- **Security Groups**: Least-privilege access rules
- **Encryption**: At-rest and in-transit encryption
- **Secrets Manager**: Database credentials rotation
- **VPC Endpoints**: Reduce NAT Gateway costs
- **Flow Logs**: Network traffic monitoring

## 📊 **Monitoring & Alerting**

- **CloudWatch Dashboard**: Real-time infrastructure metrics
- **Alarms**: CPU, memory, storage, and connection monitoring
- **SNS Notifications**: Email alerts for production issues
- **Performance Insights**: Database query optimization

## 💰 **Cost Optimization**

- **Development**: ~$105/month
- **Staging**: ~$400/month  
- **Production**: ~$1,050/month

### **Cost Saving Features**
- VPC Endpoints reduce NAT Gateway costs
- Reserved Instances for predictable workloads
- Automated snapshots with retention policies
- Right-sized instances per environment

## 🔄 **Migration from Docker**

### **Connection String Updates**
Replace Docker connection strings with AWS endpoints:

```typescript
// Before (Docker)
const mongoUrl = 'mongodb://admin:password123@localhost:27017/myapp'
const postgresUrl = 'postgresql://postgres:password@localhost:5432/lego_projects'
const redisUrl = 'redis://localhost:6379'
const elasticsearchUrl = 'http://localhost:9200'

// After (AWS)
const mongoUrl = process.env.DOCUMENTDB_ENDPOINT
const postgresUrl = process.env.RDS_ENDPOINT  
const redisUrl = process.env.REDIS_ENDPOINT
const opensearchUrl = process.env.OPENSEARCH_ENDPOINT
```

### **Environment Variables**
The CDK outputs provide these environment variables:
- `DOCUMENTDB_ENDPOINT`
- `DOCUMENTDB_SECRET_ARN`
- `RDS_ENDPOINT`
- `RDS_SECRET_ARN`
- `REDIS_ENDPOINT`
- `OPENSEARCH_ENDPOINT`

## 🎯 **Integration with Service Stacks**

Service-specific infrastructure (ECS, ALB, etc.) remains in individual service directories:
- `apps/api/auth-service/infrastructure/aws-cdk/`
- `apps/api/lego-projects-api/infrastructure/aws-cdk/`
- `apps/web/lego-moc-instructions-app/infrastructure/aws-cdk/`

Services import shared infrastructure using CloudFormation exports:
```typescript
const vpcId = cdk.Fn.importValue('LegoMoc-dev-VpcId')
const dbEndpoint = cdk.Fn.importValue('LegoMoc-dev-DocumentDbEndpoint')
```

## 🚨 **Important Notes**

1. **Production Deletion Protection**: Production databases have deletion protection enabled
2. **Backup Retention**: Varies by environment (7-35 days)
3. **Multi-AZ**: Enabled for staging and production
4. **Secrets Rotation**: Automatic credential rotation in Secrets Manager
5. **Cost Monitoring**: Set up billing alerts for cost control

## 📞 **Support**

For infrastructure issues:
1. Check CloudWatch Dashboard for metrics
2. Review CloudWatch Logs for errors
3. Check SNS notifications for alerts
4. Use AWS Systems Manager for secure database access
