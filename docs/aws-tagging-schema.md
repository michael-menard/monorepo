# AWS Resource Tagging Schema

## Overview

This document defines the standardized tagging schema for all AWS resources across the organization. Consistent tagging enables cost tracking, resource management, automation, and compliance.

## Tag Categories

1. **Required Tags** - Must be applied to ALL resources
2. **Functional Tags** - Applied based on resource type and purpose
3. **Cost Allocation Tags** - For financial tracking and optimization
4. **Operational Tags** - For lifecycle management and automation

---

## Required Tags (ALL Resources)

These tags MUST be applied to every AWS resource without exception:

| Tag Key | Format | Example Values | Purpose |
|---------|--------|----------------|---------|
| `Project` | String | `UserMetrics`, `Application`, `Infrastructure` | Group resources by project/initiative |
| `Environment` | Enum | `dev`, `staging`, `prod` | Separate resources by deployment environment |
| `ManagedBy` | String | `SST`, `Terraform`, `CloudFormation`, `Manual` | Identify infrastructure-as-code tool |
| `CostCenter` | String | `Engineering`, `Observability`, `DataPlatform` | Budget allocation and chargeback |
| `Owner` | Email/Team | `engineering@example.com`, `devops-team` | Point of contact for resource |

**SST Implementation:**
```typescript
// Base required tags for all resources
export const requiredTags = (stage: string, project: string, owner: string) => ({
  Project: project,
  Environment: stage,
  ManagedBy: 'SST',
  CostCenter: 'Engineering',  // Adjust per project
  Owner: owner,
});
```

---

## Functional Tags (Resource-Specific)

Apply these tags based on the resource's purpose and type:

### General Functional Tags

| Tag Key | Value Options | Applied To | Purpose |
|---------|---------------|------------|---------|
| `Component` | `API`, `Frontend`, `Database`, `Observability`, `Analytics`, `Auth`, etc. | All resources | Identify architectural component |
| `Function` | `Compute`, `Storage`, `Networking`, `Monitoring`, `Analytics`, etc. | All resources | Identify functional role |
| `Tier` | `Free`, `Essential`, `Standard`, `Premium` | Managed services | Track service tier for cost analysis |
| `DataClassification` | `Public`, `Internal`, `Confidential`, `Restricted` | Data storage resources | Security and compliance |

### Compute Resources (Lambda, ECS, EC2)

| Tag Key | Value Options | Example |
|---------|---------------|---------|
| `ServiceType` | `Lambda`, `ECS`, `EC2`, `Fargate` | `Lambda` |
| `Runtime` | `nodejs20.x`, `python3.11`, etc. | `nodejs20.x` |
| `Endpoint` | API endpoint name | `WebVitals`, `ErrorReporting`, `UserAuth` |
| `MemorySize` | Memory allocation | `512MB`, `1024MB` |

**SST Lambda Example:**
```typescript
new Function(stack, 'MyFunction', {
  handler: 'src/handler.main',
  tags: {
    ...requiredTags(stack.stage, 'Application', 'team@example.com'),
    Component: 'API',
    Function: 'Compute',
    ServiceType: 'Lambda',
    Endpoint: 'UserAuth',
    Runtime: 'nodejs20.x',
  }
});
```

### Storage Resources (S3, RDS, DynamoDB)

| Tag Key | Value Options | Example |
|---------|---------------|---------|
| `DataType` | `Logs`, `Metrics`, `Sessions`, `UserData`, `Assets`, `Backups` | `Sessions` |
| `RetentionPeriod` | Days/months/years | `30days`, `1year`, `7years` |
| `BackupEnabled` | `true`, `false` | `true` |
| `EncryptionEnabled` | `true`, `false` | `true` |

**S3 Bucket Example:**
```typescript
new Bucket(stack, 'DataBucket', {
  cdk: {
    bucket: {
      tags: [
        { key: 'Project', value: 'Application' },
        { key: 'Environment', value: stack.stage },
        { key: 'Component', value: 'Storage' },
        { key: 'DataType', value: 'UserData' },
        { key: 'RetentionPeriod', value: '90days' },
        { key: 'EncryptionEnabled', value: 'true' },
      ]
    }
  }
});
```

**RDS/Aurora Example:**
```typescript
tags: {
  Project: 'Application',
  Environment: 'prod',
  Component: 'Database',
  Function: 'Storage',
  DataType: 'UserData,Analytics',  // Multiple data types
  BackupEnabled: 'true',
  EncryptionEnabled: 'true',
}
```

### Networking Resources (VPC, Subnets, Load Balancers)

| Tag Key | Value Options | Example |
|---------|---------------|---------|
| `NetworkTier` | `Public`, `Private`, `Isolated` | `Private` |
| `SubnetType` | `PublicSubnet`, `PrivateSubnet`, `DatabaseSubnet` | `PrivateSubnet` |
| `AvailabilityZone` | AWS AZ | `us-east-1a`, `us-east-1b` |

**VPC Example:**
```typescript
tags: {
  Project: 'Infrastructure',
  Environment: 'prod',
  Component: 'Networking',
  Function: 'Networking',
  NetworkTier: 'Private',
}
```

**ALB Example:**
```typescript
tags: {
  Project: 'Application',
  Component: 'API',
  Function: 'LoadBalancing',
  ServiceType: 'ALB',
  TargetService: 'Umami',  // What service does it front
}
```

### IAM Resources (Roles, Policies)

| Tag Key | Value Options | Example |
|---------|---------------|---------|
| `Purpose` | `LambdaExecution`, `ECSTaskExecution`, `ServiceRole` | `LambdaExecution` |
| `AccessLevel` | `ReadOnly`, `ReadWrite`, `Admin` | `ReadWrite` |

**IAM Role Example:**
```typescript
tags: {
  Project: 'Application',
  Component: 'IAM',
  Function: 'AccessControl',
  Purpose: 'LambdaExecution',
  AccessLevel: 'ReadWrite',
}
```

---

## Cost Allocation Tags

These tags enable detailed cost tracking and optimization:

| Tag Key | Purpose | Example Values |
|---------|---------|----------------|
| `BillingCode` | Internal billing/chargeback | `ENG-2024-Q4`, `OBS-001` |
| `CostOptimization` | Flag for cost review | `Review`, `Optimized`, `Critical` |
| `BudgetAlert` | Monthly budget threshold | `$100`, `$500`, `$1000` |

**Usage:**
```typescript
tags: {
  // ... required tags
  BillingCode: 'ENG-2024-Q4',
  CostOptimization: 'Review',
  BudgetAlert: '$150',
}
```

---

## Operational Tags

Tags for automation, lifecycle management, and operations:

| Tag Key | Value Options | Purpose |
|---------|---------------|---------|
| `BackupSchedule` | `Daily`, `Weekly`, `Monthly`, `None` | Automated backup triggers |
| `MaintenanceWindow` | `Sunday-3AM`, `None` | Scheduled maintenance |
| `AutoScaling` | `true`, `false` | Auto-scaling enabled |
| `MonitoringLevel` | `Basic`, `Enhanced`, `Custom` | CloudWatch monitoring detail |
| `LogRetention` | Days | `7`, `30`, `90`, `365` |

---

## Tagging Patterns by Use Case

### Pattern 1: Microservice API

```typescript
{
  // Required
  Project: 'Application',
  Environment: 'prod',
  ManagedBy: 'SST',
  CostCenter: 'Engineering',
  Owner: 'api-team@example.com',

  // Functional
  Component: 'UserService',
  Function: 'Compute',
  ServiceType: 'Lambda',
  Endpoint: 'GetUser',

  // Operational
  MonitoringLevel: 'Enhanced',
  LogRetention: '30',
}
```

### Pattern 2: Data Storage

```typescript
{
  // Required
  Project: 'DataPlatform',
  Environment: 'prod',
  ManagedBy: 'SST',
  CostCenter: 'DataEngineering',
  Owner: 'data-team@example.com',

  // Functional
  Component: 'DataLake',
  Function: 'Storage',
  DataType: 'Analytics',
  DataClassification: 'Internal',

  // Operational
  RetentionPeriod: '7years',
  BackupEnabled: 'true',
  EncryptionEnabled: 'true',
}
```

### Pattern 3: Observability Infrastructure

```typescript
{
  // Required
  Project: 'UserMetrics',
  Environment: 'prod',
  ManagedBy: 'SST',
  CostCenter: 'Observability',
  Owner: 'engineering@example.com',

  // Functional
  Component: 'Umami',
  Function: 'Analytics',
  ServiceType: 'ECS',

  // Cost
  BudgetAlert: '$25',
  CostOptimization: 'Optimized',
}
```

### Pattern 4: Shared Infrastructure

```typescript
{
  // Required
  Project: 'Infrastructure',
  Environment: 'shared',  // Shared across environments
  ManagedBy: 'SST',
  CostCenter: 'Platform',
  Owner: 'devops@example.com',

  // Functional
  Component: 'Networking',
  Function: 'Networking',
  NetworkTier: 'Private',

  // Operational
  MaintenanceWindow: 'Sunday-3AM',
}
```

---

## SST Implementation Guide

### Centralized Tag Configuration

Create `sst/tags.ts`:

```typescript
export interface TagConfig {
  project: string;
  environment: string;
  owner: string;
  costCenter?: string;
}

export const createBaseTags = (config: TagConfig) => ({
  Project: config.project,
  Environment: config.environment,
  ManagedBy: 'SST',
  CostCenter: config.costCenter || 'Engineering',
  Owner: config.owner,
});

export const componentTags = {
  api: {
    Component: 'API',
    Function: 'Compute',
  },
  frontend: {
    Component: 'Frontend',
    Function: 'Presentation',
  },
  database: {
    Component: 'Database',
    Function: 'Storage',
  },
  observability: {
    Component: 'Observability',
    Function: 'Monitoring',
  },
  networking: {
    Component: 'Networking',
    Function: 'Networking',
  },
};

export const dataTypeTags = {
  metrics: { DataType: 'Metrics' },
  logs: { DataType: 'Logs' },
  sessions: { DataType: 'Sessions' },
  analytics: { DataType: 'Analytics' },
  userData: { DataType: 'UserData' },
};
```

### Using Tags in SST Stacks

```typescript
import { createBaseTags, componentTags, dataTypeTags } from './tags';

export function MyStack({ stack }: StackContext) {
  const baseTags = createBaseTags({
    project: 'Application',
    environment: stack.stage,
    owner: 'engineering@example.com',
  });

  // Lambda with tags
  const api = new Function(stack, 'API', {
    handler: 'src/api.handler',
    tags: {
      ...baseTags,
      ...componentTags.api,
      Endpoint: 'UserAuth',
    },
  });

  // S3 bucket with tags
  const bucket = new Bucket(stack, 'DataBucket', {
    cdk: {
      bucket: {
        tags: [
          ...Object.entries({
            ...baseTags,
            ...componentTags.database,
            ...dataTypeTags.userData,
            RetentionPeriod: '90days',
          }).map(([key, value]) => ({ key, value })),
        ],
      },
    },
  });
}
```

---

## AWS Cost Allocation Setup

### Step 1: Activate Tags in Billing Console

1. Navigate to **AWS Billing Console** → **Cost Allocation Tags**
2. Activate these user-defined tags:
   - `Project`
   - `Component`
   - `Function`
   - `Environment`
   - `CostCenter`
   - `DataType`
   - `Owner`

3. Wait **24 hours** for tags to become available in Cost Explorer

### Step 2: Create Cost Explorer Views

**View 1: Cost by Project**
```
Group by: Tag:Project
Time range: Last 3 months
Granularity: Monthly
```

**View 2: Cost by Component**
```
Group by: Tag:Component
Filter: Tag:Project = [Your Project]
Time range: Last month
Granularity: Daily
```

**View 3: Cost by Environment**
```
Group by: Tag:Environment
Time range: Last month
Granularity: Daily
```

### Step 3: Set Up Budgets

```
Budget Name: [Project]-Monthly-Budget
Amount: $XXX/month
Filters: Tag:Project = [Your Project]
Alerts:
  - 80% threshold → Email notification
  - 100% threshold → Email notification
  - 120% threshold → Email + SNS topic
```

---

## Validation and Compliance

### Tag Compliance Checks

**Check 1: Find untagged resources**
```bash
aws resourcegroupstaggingapi get-resources \
  --resource-type-filters \
    lambda:function \
    s3:bucket \
    rds:db \
    ec2:instance \
  --region us-east-1 \
  --query 'ResourceTagMappingList[?length(Tags)==`0`]'
```

**Check 2: Find resources missing required tags**
```bash
# Check for resources missing Project tag
aws resourcegroupstaggingapi get-resources \
  --region us-east-1 \
  --query 'ResourceTagMappingList[?!contains(Tags[].Key, `Project`)]'

# Check for resources with insufficient tags (less than 5)
aws resourcegroupstaggingapi get-resources \
  --region us-east-1 \
  --query 'ResourceTagMappingList[?length(Tags) < `5`]'
```

**Check 3: List all resources for a project**
```bash
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=Project,Values=Application \
  --region us-east-1
```

### Automated Compliance (AWS Config)

Create AWS Config rule for tag enforcement:

```yaml
ConfigRuleName: required-tags
Source:
  Owner: AWS
  SourceIdentifier: REQUIRED_TAGS
InputParameters:
  tag1Key: Project
  tag2Key: Environment
  tag3Key: ManagedBy
  tag4Key: CostCenter
  tag5Key: Owner
```

---

## Cost Query Examples

### Query 1: Total cost by project (last month)
```bash
aws ce get-cost-and-usage \
  --time-period Start=2025-11-01,End=2025-11-30 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=TAG,Key=Project
```

### Query 2: Daily costs for specific project
```bash
aws ce get-cost-and-usage \
  --time-period Start=2025-11-01,End=2025-11-30 \
  --granularity DAILY \
  --metrics BlendedCost \
  --filter file://filter.json

# filter.json:
{
  "Tags": {
    "Key": "Project",
    "Values": ["Application"]
  }
}
```

### Query 3: Cost by component within project
```bash
aws ce get-cost-and-usage \
  --time-period Start=2025-11-01,End=2025-11-30 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter '{"Tags":{"Key":"Project","Values":["Application"]}}' \
  --group-by Type=TAG,Key=Component
```

### Query 4: Environment cost comparison
```bash
aws ce get-cost-and-usage \
  --time-period Start=2025-11-01,End=2025-11-30 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=TAG,Key=Environment
```

---

## Best Practices

### DO:
✅ Apply all 5 required tags to every resource
✅ Use consistent tag value formats (e.g., always `prod`, never `production`)
✅ Centralize tag configuration in code (don't hardcode tags)
✅ Validate tags during deployment (CI/CD checks)
✅ Review cost reports monthly using tag dimensions
✅ Document project-specific tag conventions
✅ Use tags for automation (backup schedules, monitoring, etc.)

### DON'T:
❌ Skip tagging "temporary" resources (they often become permanent)
❌ Use inconsistent tag value casing (Project=Dev vs project=dev)
❌ Put sensitive data in tag values (PII, secrets, etc.)
❌ Create one-off custom tags without documentation
❌ Manually tag resources (use IaC)
❌ Ignore untagged resources warnings

---

## Quick Reference Card

### Minimum Required Tags (Every Resource)
```typescript
{
  Project: 'YourProject',
  Environment: 'dev|staging|prod',
  ManagedBy: 'SST|Terraform|Manual',
  CostCenter: 'Engineering|Observability|...',
  Owner: 'team@example.com',
}
```

### Common Additional Tags
```typescript
{
  Component: 'API|Frontend|Database|...',
  Function: 'Compute|Storage|Networking|...',
  DataType: 'Metrics|Logs|UserData|...',
}
```

### SST Usage Pattern
```typescript
import { createBaseTags, componentTags } from './tags';

const tags = {
  ...createBaseTags({ project: 'App', environment: stack.stage, owner: 'team@ex.com' }),
  ...componentTags.api,
  // Additional resource-specific tags
};
```

---

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-23 | 1.0 | Initial tagging schema | Winston (Architect) |

---

## References

- [AWS Tagging Best Practices](https://docs.aws.amazon.com/whitepapers/latest/tagging-best-practices/tagging-best-practices.html)
- [AWS Cost Allocation Tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html)
- [SST Resource Tagging](https://docs.sst.dev/)
