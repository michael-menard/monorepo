/**
 * S3 Lifecycle Policies for Cost Optimization
 * Story 5.7: Configure AWS Cost Monitoring and Budgets (AC 10)
 *
 * Creates lifecycle rules for:
 * - MOC files: Intelligent-Tiering after 30 days
 * - Gallery images: Glacier Deep Archive after 90 days
 * - Temporary uploads: Delete after 7 days
 * - Old versions: Glacier after 30 days, delete after 90 days
 */

import * as aws from '@pulumi/aws'

export interface S3LifecyclePoliciesConfig {
  /**
   * S3 bucket to apply lifecycle policies
   */
  readonly bucket: aws.s3.Bucket

  /**
   * Stage/environment name
   */
  readonly stage: string
}

/**
 * Apply cost optimization lifecycle policies to S3 bucket
 */
export function applyS3LifecyclePolicies(config: S3LifecyclePoliciesConfig): void {
  const { bucket } = config

  // Lifecycle rule 1: MOC files - Intelligent-Tiering after 30 days
  // MOC files have unpredictable access patterns, so Intelligent-Tiering optimizes cost automatically
  new aws.s3.BucketLifecycleConfigurationV2(`${bucket.id}-lifecycle-mocs`, {
    bucket: bucket.id,
    rules: [
      {
        id: 'moc-files-intelligent-tiering',
        status: 'Enabled',
        filter: {
          prefix: 'mocs/',
        },
        transitions: [
          {
            days: 30,
            storageClass: 'INTELLIGENT_TIERING',
          },
        ],
      },
    ],
  })

  // Lifecycle rule 2: Gallery images - Glacier Deep Archive after 90 days
  // Gallery images are rarely accessed after 90 days, Glacier Deep Archive provides maximum savings
  new aws.s3.BucketLifecycleConfigurationV2(`${bucket.id}-lifecycle-gallery`, {
    bucket: bucket.id,
    rules: [
      {
        id: 'gallery-images-glacier-deep-archive',
        status: 'Enabled',
        filter: {
          prefix: 'gallery/',
        },
        transitions: [
          {
            days: 90,
            storageClass: 'DEEP_ARCHIVE',
          },
        ],
      },
    ],
  })

  // Lifecycle rule 3: Temporary upload files - Delete after 7 days
  // Temporary files should be cleaned up quickly to avoid unnecessary storage costs
  new aws.s3.BucketLifecycleConfigurationV2(`${bucket.id}-lifecycle-temp`, {
    bucket: bucket.id,
    rules: [
      {
        id: 'temp-uploads-delete',
        status: 'Enabled',
        filter: {
          prefix: 'temp/',
        },
        expiration: {
          days: 7,
        },
      },
    ],
  })

  // Lifecycle rule 4: Old versions - Glacier after 30 days
  // If bucket versioning is enabled, transition old versions to Glacier for cost savings
  new aws.s3.BucketLifecycleConfigurationV2(`${bucket.id}-lifecycle-versions-glacier`, {
    bucket: bucket.id,
    rules: [
      {
        id: 'old-versions-glacier',
        status: 'Enabled',
        noncurrentVersionTransitions: [
          {
            noncurrentDays: 30,
            storageClass: 'GLACIER',
          },
        ],
      },
    ],
  })

  // Lifecycle rule 5: Old versions - Delete after 90 days
  // Permanently delete old versions after 90 days to minimize storage costs
  new aws.s3.BucketLifecycleConfigurationV2(`${bucket.id}-lifecycle-versions-delete`, {
    bucket: bucket.id,
    rules: [
      {
        id: 'old-versions-delete',
        status: 'Enabled',
        noncurrentVersionExpiration: {
          noncurrentDays: 90,
        },
      },
    ],
  })

  console.log(`✅ Applied S3 lifecycle policies to bucket: ${bucket.id}`)
}

/**
 * Get estimated cost savings from lifecycle policies
 *
 * Based on AWS S3 pricing (us-east-1, Jan 2025):
 * - S3 Standard: $0.023/GB/month
 * - S3 Intelligent-Tiering: $0.021/GB/month (frequent) + $0.0125/GB/month (infrequent)
 * - S3 Glacier: $0.004/GB/month
 * - S3 Glacier Deep Archive: $0.00099/GB/month
 *
 * Example calculation for 1TB of data:
 * - S3 Standard: $23/month
 * - After lifecycle policies: ~$5-10/month
 * - Estimated savings: $13-18/month (57-78% reduction)
 */
export function estimateLifecycleSavings(totalGB: number): {
  standardCost: number
  optimizedCost: number
  savings: number
  savingsPercent: number
} {
  // Pricing per GB per month
  const standardPricing = 0.023
  const glacierDeepArchivePricing = 0.00099
  const intelligentTieringPricing = 0.0125 // Average between frequent and infrequent

  // Cost without lifecycle policies (all S3 Standard)
  const standardCost = totalGB * standardPricing

  // Cost with lifecycle policies (assume 70% Glacier Deep Archive, 30% Intelligent-Tiering)
  const optimizedCost =
    totalGB * 0.7 * glacierDeepArchivePricing + totalGB * 0.3 * intelligentTieringPricing

  const savings = standardCost - optimizedCost
  const savingsPercent = (savings / standardCost) * 100

  return {
    standardCost: parseFloat(standardCost.toFixed(2)),
    optimizedCost: parseFloat(optimizedCost.toFixed(2)),
    savings: parseFloat(savings.toFixed(2)),
    savingsPercent: parseFloat(savingsPercent.toFixed(2)),
  }
}
