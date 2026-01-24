/**
 * S3 Lifecycle Policies for Cost Optimization
 *
 * Applies lifecycle policies to S3 buckets for automatic cost optimization:
 * - MOC files: Intelligent-Tiering after 30 days
 * - Gallery images: Standard-IA after 90 days, Glacier after 1 year
 * - Temporary files: Delete after 7 days
 */

export function applyS3LifecyclePolicies(bucket: any) {
  // Lifecycle rule 1: MOC files - Intelligent-Tiering after 30 days
  // MOC files have unpredictable access patterns, so Intelligent-Tiering optimizes cost automatically
  new aws.s3.BucketLifecycleConfigurationV2(`${bucket.id}-lifecycle-mocs`, {
    bucket: bucket.name,
    rules: [
      {
        id: 'MOCFilesIntelligentTiering',
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
      {
        id: 'GalleryImagesLifecycle',
        status: 'Enabled',
        filter: {
          prefix: 'gallery/',
        },
        transitions: [
          {
            days: 90,
            storageClass: 'STANDARD_IA', // Infrequent Access after 90 days
          },
          {
            days: 365,
            storageClass: 'GLACIER', // Glacier after 1 year
          },
        ],
      },
      {
        id: 'TempFilesCleanup',
        status: 'Enabled',
        filter: {
          prefix: 'temp/',
        },
        expiration: {
          days: 7, // Delete temporary files after 7 days
        },
      },
      {
        id: 'IncompleteMultipartUploads',
        status: 'Enabled',
        abortIncompleteMultipartUpload: {
          daysAfterInitiation: 1, // Clean up failed uploads after 1 day
        },
      },
    ],
  })

  return {
    lifecyclePolicyApplied: true,
  }
}
