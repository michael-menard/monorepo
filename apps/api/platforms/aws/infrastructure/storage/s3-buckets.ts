/**
 * S3 Buckets for LEGO API Serverless
 * 
 * Creates S3 buckets for:
 * - MOC files, images, and avatars
 * - Runtime configuration
 * - OpenReplay session recordings
 * - CloudWatch logs export
 */

export function createS3Buckets(stage: string) {
  /**
   * S3 Bucket for MOC files, images, and avatars
   * - Versioning enabled for production
   * - Server-side encryption (SSE-S3)
   * - Lifecycle policy for cost optimization
   */
  const bucket = new sst.aws.Bucket('LegoApiBucket', {
    name: `lego-moc-files-${stage}`,
    transform: {
      bucket: args => {
        args.versioning = {
          enabled: stage === 'production',
        }
        args.serverSideEncryptionConfiguration = {
          rules: [
            {
              applyServerSideEncryptionByDefault: {
                sseAlgorithm: 'AES256',
              },
            },
          ],
        }
        args.tags = {
          Environment: stage,
          Project: 'lego-api-serverless',
          Purpose: 'MOC Files Storage',
        }
      },
    },
  })

  /**
   * S3 Bucket for Runtime Configuration
   * - Public read access for config.json file only
   * - CORS configured for frontend origins
   * - Cache-Control headers for 60-second TTL
   * - Environment-specific configuration values
   */
  const configBucket = new sst.aws.Bucket('RuntimeConfigBucket', {
    name: `lego-runtime-config-${stage}`,
    transform: {
      bucket: args => {
        // No versioning needed for config files
        args.versioning = {
          enabled: false,
        }
        args.serverSideEncryptionConfiguration = {
          rules: [
            {
              applyServerSideEncryptionByDefault: {
                sseAlgorithm: 'AES256',
              },
            },
          ],
        }
        args.corsConfiguration = {
          corsRules: [
            {
              allowedHeaders: ['*'],
              allowedMethods: ['GET'],
              allowedOrigins:
                stage === 'production'
                  ? ['https://lego-moc-instructions.com']
                  : ['http://localhost:3002', 'http://localhost:5173'],
              maxAgeSeconds: 60,
            },
          ],
        }
        args.tags = {
          Environment: stage,
          Project: 'lego-api-serverless',
          Purpose: 'Runtime Configuration',
        }
      },
    },
  })

  /**
   * S3 Bucket for OpenReplay Session Recordings
   * - 30-day lifecycle policy for automatic deletion
   * - S3 Intelligent-Tiering for cost optimization
   * - Server-side encryption (SSE-S3)
   * - ECS task role access only
   * - CloudWatch metrics enabled
   */
  const openReplaySessionsBucket = new sst.aws.Bucket('OpenReplaySessionsBucket', {
    transform: {
      bucket: args => {
        // Bucket naming convention: user-metrics-openreplay-sessions-[stage]-[region]
        args.bucketName = `user-metrics-openreplay-sessions-${stage}-${aws.getRegionOutput().name}`

        args.versioning = {
          enabled: false, // Not needed for session recordings
        }

        args.serverSideEncryptionConfiguration = {
          rules: [
            {
              applyServerSideEncryptionByDefault: {
                sseAlgorithm: 'AES256',
              },
            },
          ],
        }

        args.lifecycleConfiguration = {
          rules: [
            {
              id: 'DeleteSessionsAfter30Days',
              status: 'Enabled',
              expiration: {
                days: 30, // Delete session recordings after 30 days
              },
              transitions: [
                {
                  days: 7,
                  storageClass: 'INTELLIGENT_TIERING', // Cost optimization
                },
              ],
            },
          ],
        }

        args.tags = {
          Environment: stage,
          Project: 'user-metrics',
          Component: 'OpenReplay',
          Purpose: 'SessionStorage',
          DataRetention: '30days',
        }
      },
    },
  })

  /**
   * S3 Bucket for CloudWatch Logs Export (Optional)
   * - 1-year lifecycle policy with Glacier transition
   * - Server-side encryption (SSE-S3)
   * - CloudWatch Logs service access
   */
  const cloudWatchLogsBucket = new sst.aws.Bucket('CloudWatchLogsBucket', {
    transform: {
      bucket: args => {
        // Bucket naming convention: user-metrics-cloudwatch-logs-[stage]-[region]
        args.bucketName = `user-metrics-cloudwatch-logs-${stage}-${aws.getRegionOutput().name}`

        args.versioning = {
          enabled: false, // Not needed for log exports
        }

        args.serverSideEncryptionConfiguration = {
          rules: [
            {
              applyServerSideEncryptionByDefault: {
                sseAlgorithm: 'AES256',
              },
            },
          ],
        }

        args.lifecycleConfiguration = {
          rules: [
            {
              id: 'ArchiveLogsAfter1Year',
              status: 'Enabled',
              transitions: [
                {
                  days: 30,
                  storageClass: 'STANDARD_IA', // Infrequent Access after 30 days
                },
                {
                  days: 90,
                  storageClass: 'GLACIER', // Glacier after 90 days
                },
              ],
              expiration: {
                days: 2555, // Delete after 7 years (compliance requirement)
              },
            },
          ],
        }

        args.tags = {
          Environment: stage,
          Project: 'user-metrics',
          Component: 'CloudWatch',
          Purpose: 'LogExport',
          DataRetention: '7years',
        }
      },
    },
  })

  return {
    bucket,
    configBucket,
    openReplaySessionsBucket,
    cloudWatchLogsBucket,
  }
}
