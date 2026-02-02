/**
 * Centralized AWS Resource Tagging Configuration for User Metrics Observability
 *
 * This module provides standardized tagging utilities for all observability infrastructure
 * resources following the AWS tagging schema defined in docs/aws-tagging-schema.md.
 *
 * Required tags are applied to ALL resources for cost tracking and compliance.
 * Functional tags provide additional categorization for specific resource types.
 *
 * @see docs/aws-tagging-schema.md for complete tagging schema documentation
 */

/**
 * Required tags that must be applied to ALL AWS resources
 * These tags are mandatory for cost allocation and compliance
 */
export interface RequiredTags {
  /** Fixed project identifier for User Metrics observability */
  Project: 'UserMetrics'
  /** Environment stage (dev, staging, prod) */
  Environment: string
  /** Infrastructure management tool */
  ManagedBy: 'SST'
  /** Cost center for budget allocation */
  CostCenter: 'Observability'
  /** Resource owner contact */
  Owner: string
}

/**
 * Functional tags for categorizing resources by component and purpose
 */
export interface ComponentTags {
  /** High-level component category */
  Component: string
  /** Specific function or purpose */
  Function: string
  /** Additional context-specific properties */
  [key: string]: string
}

/**
 * Creates required tags for all User Metrics observability resources
 *
 * @param stage - SST deployment stage (dev, staging, prod)
 * @param owner - Resource owner email address
 * @returns Required tags object
 */
export const requiredTags = (
  stage: string,
  owner: string = 'engineering@example.com',
): RequiredTags => ({
  Project: 'UserMetrics',
  Environment: stage,
  ManagedBy: 'SST',
  CostCenter: 'Observability',
  Owner: owner,
})

/**
 * Pre-defined component tags for common observability resource types
 */
export const componentTags = {
  /** VPC and networking resources */
  networking: {
    Component: 'Networking',
    Function: 'Networking',
    NetworkTier: 'Private',
  },

  /** Security groups and network access control */
  security: {
    Component: 'Networking',
    Function: 'Security',
    Purpose: 'AccessControl',
  },

  /** IAM roles and policies */
  iam: {
    Component: 'IAM',
    Function: 'AccessControl',
    AccessLevel: 'ReadWrite',
  },

  /** S3 buckets and storage */
  storage: {
    Component: 'Storage',
    Function: 'Storage',
    DataType: 'Sessions',
    RetentionPeriod: '30days',
  },

  /** ECS tasks and services */
  ecs: {
    Component: 'Compute',
    Function: 'Container',
    Platform: 'ECS',
  },

  /** Application Load Balancers */
  alb: {
    Component: 'Networking',
    Function: 'LoadBalancing',
    Type: 'ApplicationLoadBalancer',
  },

  /** Observability and monitoring tools */
  observability: {
    Component: 'Observability',
    Function: 'Monitoring',
    Tool: 'Grafana',
  },
} as const

/**
 * Creates complete tag set combining required and component tags
 *
 * @param stage - SST deployment stage
 * @param componentType - Component type from componentTags
 * @param owner - Resource owner email (optional)
 * @param additionalTags - Additional context-specific tags (optional)
 * @returns Complete tags object for resource
 */
export const createResourceTags = (
  stage: string,
  componentType: keyof typeof componentTags,
  owner?: string,
  additionalTags?: Record<string, string>,
) => ({
  ...requiredTags(stage, owner),
  ...componentTags[componentType],
  ...additionalTags,
})

/**
 * Observability-specific tag utilities for different resource types
 */
export const observabilityTags = {
  /** Tags for Umami ECS service */
  umami: (stage: string) =>
    createResourceTags(stage, 'ecs', undefined, {
      Service: 'Umami',
      Purpose: 'Analytics',
    }),

  /** Tags for OpenReplay ECS service */
  openreplay: (stage: string) =>
    createResourceTags(stage, 'ecs', undefined, {
      Service: 'OpenReplay',
      Purpose: 'SessionReplay',
    }),

  /** Tags for Grafana workspace */
  grafana: (stage: string) =>
    createResourceTags(stage, 'observability', undefined, {
      Service: 'Grafana',
      Tier: 'Essential',
    }),

  /** Tags for session storage S3 bucket */
  sessionStorage: (stage: string) =>
    createResourceTags(stage, 'storage', undefined, {
      Service: 'OpenReplay',
      DataType: 'Sessions',
    }),
}
