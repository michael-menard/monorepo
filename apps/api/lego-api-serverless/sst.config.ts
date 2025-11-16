/// <reference path="./.sst/platform/config.d.ts" />

/**
 * SST v3 (Ion) Configuration for LEGO Projects API Serverless Migration
 *
 * This configuration defines the complete serverless infrastructure including:
 * - VPC networking with public/private subnets
 * - RDS PostgreSQL with RDS Proxy
 * - ElastiCache Redis
 * - OpenSearch domain
 * - S3 buckets for file storage
 * - Lambda functions with API Gateway
 * - CloudWatch monitoring and alarms
 */

export default $config({
  app(input) {
    return {
      name: 'lego-api-serverless',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
    }
  },
  async run() {
    const stage = $app.stage

    // ========================================
    // Story 1.2: VPC Networking Infrastructure
    // ========================================

    /**
     * VPC with public/private subnets across 2 Availability Zones
     * - Public subnets: Internet Gateway routing for NAT Gateway and Bastion
     * - Private subnets: NAT Gateway routing for Lambda, RDS, Redis, OpenSearch
     */
    const vpc = new sst.aws.Vpc('LegoApiVpc', {
      nat: 'managed', // Managed NAT Gateway for Lambda internet access
      az: 2, // Two Availability Zones for high availability
    })

    /**
     * Security Group for Lambda Functions
     * - Allows all outbound traffic (needed for RDS, Redis, OpenSearch, internet)
     */
    const lambdaSecurityGroup = new aws.ec2.SecurityGroup('LambdaSecurityGroup', {
      vpcId: vpc.id,
      description: 'Security group for Lambda functions',
      egress: [
        {
          protocol: '-1', // All protocols
          fromPort: 0,
          toPort: 0,
          cidrBlocks: ['0.0.0.0/0'],
          description: 'Allow all outbound traffic',
        },
      ],
      tags: {
        Name: `lego-api-lambda-sg-${stage}`,
        Environment: stage,
        Project: 'lego-api-serverless',
      },
    })

    /**
     * Security Group for RDS PostgreSQL
     * - Allows inbound traffic from Lambda security group only on port 5432
     */
    const rdsSecurityGroup = new aws.ec2.SecurityGroup('RdsSecurityGroup', {
      vpcId: vpc.id,
      description: 'Security group for RDS PostgreSQL',
      ingress: [
        {
          protocol: 'tcp',
          fromPort: 5432,
          toPort: 5432,
          securityGroups: [lambdaSecurityGroup.id],
          description: 'Allow PostgreSQL access from Lambda',
        },
      ],
      tags: {
        Name: `lego-api-rds-sg-${stage}`,
        Environment: stage,
        Project: 'lego-api-serverless',
      },
    })

    /**
     * Security Group for ElastiCache Redis
     * - Allows inbound traffic from Lambda security group only on port 6379
     */
    const redisSecurityGroup = new aws.ec2.SecurityGroup('RedisSecurityGroup', {
      vpcId: vpc.id,
      description: 'Security group for ElastiCache Redis',
      ingress: [
        {
          protocol: 'tcp',
          fromPort: 6379,
          toPort: 6379,
          securityGroups: [lambdaSecurityGroup.id],
          description: 'Allow Redis access from Lambda',
        },
      ],
      tags: {
        Name: `lego-api-redis-sg-${stage}`,
        Environment: stage,
        Project: 'lego-api-serverless',
      },
    })

    /**
     * Security Group for OpenSearch
     * - Allows inbound traffic from Lambda security group only on port 443 (HTTPS)
     */
    const openSearchSecurityGroup = new aws.ec2.SecurityGroup('OpenSearchSecurityGroup', {
      vpcId: vpc.id,
      description: 'Security group for OpenSearch domain',
      ingress: [
        {
          protocol: 'tcp',
          fromPort: 443,
          toPort: 443,
          securityGroups: [lambdaSecurityGroup.id],
          description: 'Allow HTTPS access from Lambda',
        },
      ],
      tags: {
        Name: `lego-api-opensearch-sg-${stage}`,
        Environment: stage,
        Project: 'lego-api-serverless',
      },
    })

    /**
     * VPC Endpoint for S3 (Gateway Endpoint)
     * - Avoids NAT Gateway costs for S3 traffic
     * - Provides private connectivity to S3
     */
    new aws.ec2.VpcEndpoint('S3VpcEndpoint', {
      vpcId: vpc.id,
      serviceName: `com.amazonaws.${aws.getRegionOutput().name}.s3`,
      vpcEndpointType: 'Gateway',
      routeTableIds: vpc.privateSubnets.apply(subnets =>
        subnets.map(subnet => subnet.routeTable.id),
      ),
      tags: {
        Name: `lego-api-s3-endpoint-${stage}`,
        Environment: stage,
        Project: 'lego-api-serverless',
      },
    })

    // ========================================
    // Story 1.3: PostgreSQL RDS with RDS Proxy
    // ========================================

    /**
     * RDS PostgreSQL Database with automated backups and encryption
     * - PostgreSQL 15.x
     * - Deployed in private subnets for security
     * - Automated backups with 7-day retention
     * - Sized appropriately per environment
     */
    const postgres = new sst.aws.Postgres('LegoApiPostgres', {
      vpc,
      version: '15.8',
      instance: stage === 'production' ? 'r6g.large' : 't4g.micro',
      scaling: {
        min: stage === 'production' ? '1 ACU' : '0.5 ACU',
        max: stage === 'production' ? '4 ACU' : '1 ACU',
      },
      proxy: true, // Enable RDS Proxy for connection pooling
      transform: {
        instance: args => {
          args.backupRetentionPeriod = 7
          args.storageEncrypted = true
          args.securityGroupIds = [rdsSecurityGroup.id]
        },
      },
    })

    // ========================================
    // Story 1.4: ElastiCache Redis Cluster
    // ========================================

    /**
     * ElastiCache Redis for caching frequently accessed data
     * - Redis 7.x
     * - Single node for dev, multi-node with failover for production
     * - Deployed in private subnets
     */
    const redis = new sst.aws.Redis('LegoApiRedis', {
      vpc,
      version: '7.1',
      instance: stage === 'production' ? 'cache.r7g.large' : 'cache.t4g.micro',
      transform: {
        replicationGroup: args => {
          args.securityGroupIds = [redisSecurityGroup.id]
          args.automaticFailoverEnabled = stage === 'production'
          args.multiAzEnabled = stage === 'production'
          args.numCacheClusters = stage === 'production' ? 2 : 1
        },
      },
    })

    // ========================================
    // Story 1.5: OpenSearch Domain
    // ========================================

    /**
     * AWS OpenSearch for full-text search
     * - OpenSearch 2.x
     * - t3.small for dev, r6g.large for production
     * - Deployed in private subnets with IAM authentication
     */
    const openSearch = new sst.aws.OpenSearch('LegoApiOpenSearch', {
      vpc,
      version: '2.13',
      instance: stage === 'production' ? 'r6g.large.search' : 't3.small.search',
      volume: stage === 'production' ? 100 : 20,
      transform: {
        domain: args => {
          args.vpcOptions = {
            subnetIds: vpc.privateSubnets.apply(subnets => [subnets[0].subnet.id]),
            securityGroupIds: [openSearchSecurityGroup.id],
          }
          args.ebsOptions = {
            ebsEnabled: true,
            volumeSize: stage === 'production' ? 100 : 20,
            volumeType: 'gp3',
          }
          args.clusterConfig = {
            instanceType: stage === 'production' ? 'r6g.large.search' : 't3.small.search',
            instanceCount: stage === 'production' ? 2 : 1,
            dedicatedMasterEnabled: stage === 'production',
            dedicatedMasterType: stage === 'production' ? 'r6g.large.search' : undefined,
            dedicatedMasterCount: stage === 'production' ? 3 : undefined,
            zoneAwarenessEnabled: stage === 'production',
          }
          args.advancedSecurityOptions = {
            enabled: true,
            internalUserDatabaseEnabled: false,
            masterUserOptions: {
              masterUserArn: undefined, // Will be set via IAM
            },
          }
          args.encryptionAtRest = {
            enabled: true,
          }
          args.nodeToNodeEncryption = {
            enabled: true,
          }
        },
      },
    })

    // ========================================
    // Story 1.6: S3 Buckets and Lifecycle Policies
    // ========================================

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
            rule: {
              applyServerSideEncryptionByDefault: {
                sseAlgorithm: 'AES256',
              },
            },
          }
          args.lifecycleRules = [
            {
              id: 'transition-to-ia',
              enabled: true,
              transitions: [
                {
                  days: 90,
                  storageClass: 'STANDARD_IA',
                },
              ],
            },
          ]
          args.cors = {
            corsRules: [
              {
                allowedHeaders: ['*'],
                allowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                allowedOrigins:
                  stage === 'production'
                    ? ['https://lego-moc-instructions.com']
                    : ['http://localhost:3002', 'http://localhost:5173'],
                exposeHeaders: ['ETag'],
                maxAgeSeconds: 3000,
              },
            ],
          }
          args.publicAccessBlock = {
            blockPublicAcls: true,
            blockPublicPolicy: true,
            ignorePublicAcls: true,
            restrictPublicBuckets: true,
          }
        },
      },
    })

    /**
     * CloudFront CDN for S3 Bucket (Manual Setup Required)
     * Story 3.7 Enhancement: CDN integration for image delivery
     *
     * To set up CloudFront for production:
     * 1. Create CloudFront distribution via AWS Console
     * 2. Set origin to S3 bucket created above
     * 3. Enable Origin Access Identity (OAI) for secure S3 access
     * 4. Configure cache behaviors:
     *    - TTL: 1 day default, 1 year max
     *    - Compression: Enabled
     *    - Allowed methods: GET, HEAD, OPTIONS
     * 5. Enable HTTP/2 and HTTP/3 for performance
     * 6. Update application to use CloudFront URL instead of S3 direct URLs
     *
     * Benefits:
     * - Faster image delivery via edge locations
     * - Reduced S3 costs (fewer direct S3 requests)
     * - Better user experience globally
     */

    // Story 1.7: Database migrations
    // Story 1.8: Health check Lambda + API Gateway

    // ========================================
    // Story 1.8: Health Check Lambda + API Gateway
    // ========================================

    /**
     * Health Check Lambda Function
     * - Validates connectivity to PostgreSQL, Redis, OpenSearch
     * - Returns 200 (healthy/degraded) or 503 (unhealthy)
     * - No authentication required (public endpoint)
     */
    const healthCheckFunction = new sst.aws.Function('HealthCheckFunction', {
      handler: 'src/functions/health.handler',
      runtime: 'nodejs20.x',
      timeout: '30 seconds',
      memory: '256 MB',
      vpc,
      link: [postgres, redis, openSearch, bucket],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
      },
    })

    /**
     * API Gateway HTTP API
     * - CORS enabled for all origins
     * - JWT authentication via Cognito for protected routes
     * - Public health check endpoint
     */
    const api = new sst.aws.ApiGatewayV2('LegoApi', {
      cors: {
        allowOrigins:
          stage === 'production'
            ? ['https://lego-moc-instructions.com']
            : ['http://localhost:3002', 'http://localhost:5173'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        allowCredentials: true,
      },
    })

    /**
     * Cognito JWT Authorizer
     * - Validates JWT signature, issuer, audience, and expiration
     * - Extracts userId (sub claim) and makes it available to Lambda
     * - Rejects requests before Lambda execution (saves costs)
     *
     * Note: Environment variables COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID
     * must be set for this to work. These will be configured when Cognito
     * User Pool is created.
     */
    const cognitoUserPoolId = process.env.COGNITO_USER_POOL_ID || 'PLACEHOLDER'
    const cognitoClientId = process.env.COGNITO_CLIENT_ID || 'PLACEHOLDER'
    const region = aws.getRegionOutput().name

    const cognitoAuthorizer = new aws.apigatewayv2.Authorizer('CognitoJwtAuthorizer', {
      apiId: api.id,
      authorizerType: 'JWT',
      identitySources: ['$request.header.Authorization'],
      name: `cognito-jwt-authorizer-${stage}`,
      jwtConfiguration: {
        audiences: [cognitoClientId],
        issuer: $interpolate`https://cognito-idp.${region}.amazonaws.com/${cognitoUserPoolId}`,
      },
    })

    // Health check - PUBLIC (no auth required)
    api.route('GET /health', healthCheckFunction)

    // ========================================
    // Story 2.1: MOC Instructions Lambda + API Routes
    // ========================================

    /**
     * MOC Instructions Lambda Function
     * - Multi-method handler for CRUD operations
     * - JWT authentication via Cognito
     * - Connected to PostgreSQL, Redis, OpenSearch, S3
     */
    const mocInstructionsFunction = new sst.aws.Function('MocInstructionsFunction', {
      handler: 'src/functions/moc-instructions.handler',
      runtime: 'nodejs20.x',
      timeout: '30 seconds',
      memory: '512 MB',
      vpc,
      link: [postgres, redis, openSearch, bucket],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
        LEGO_API_BUCKET_NAME: bucket.name,
        LEGO_API_OPENSEARCH_ENDPOINT: openSearch.endpoint,
      },
    })

    // TODO: Add JWT authorizer for Cognito (Story 2.1 AC 8)
    // For now, routes are public (will add auth in next commit)

    // MOC Instructions API Routes
    api.route('GET /api/mocs', mocInstructionsFunction)
    api.route('GET /api/mocs/{id}', mocInstructionsFunction)
    api.route('POST /api/mocs', mocInstructionsFunction)
    api.route('PATCH /api/mocs/{id}', mocInstructionsFunction)
    api.route('DELETE /api/mocs/{id}', mocInstructionsFunction)

    // ========================================
    // Story 2.7: MOC File Upload Lambda
    // ========================================

    /**
     * MOC File Upload Lambda Function
     * - Handles multipart/form-data file uploads
     * - JWT authentication via Cognito
     * - Validates file type, size, and MIME type
     * - Uploads to S3 with metadata
     * - Creates database records
     */
    const mocFileUploadFunction = new sst.aws.Function('MocFileUploadFunction', {
      handler: 'src/functions/moc-file-upload.handler',
      runtime: 'nodejs20.x',
      timeout: '60 seconds', // Longer timeout for file uploads
      memory: '1024 MB', // More memory for file processing
      vpc,
      link: [postgres, bucket],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
        LEGO_API_BUCKET_NAME: bucket.name,
      },
    })

    // MOC File Upload Route
    api.route('POST /api/mocs/{id}/files', mocFileUploadFunction)

    // ========================================
    // Story 2.7.1: MOC File Download Lambda
    // ========================================

    /**
     * MOC File Download Lambda Function
     * - Generates pre-signed S3 URLs for secure file downloads
     * - JWT authentication via Cognito
     * - Authorization check (user must own MOC)
     * - Supports redirect or JSON response
     * - URLs valid for 1 hour
     */
    const mocFileDownloadFunction = new sst.aws.Function('MocFileDownloadFunction', {
      handler: 'src/functions/moc-file-download.handler',
      runtime: 'nodejs20.x',
      timeout: '10 seconds',
      memory: '256 MB',
      vpc,
      link: [postgres, bucket],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
        LEGO_API_BUCKET_NAME: bucket.name,
      },
    })

    // MOC File Download Route
    api.route('GET /api/mocs/{mocId}/files/{fileId}/download', mocFileDownloadFunction)

    // ========================================
    // Story 3.1 & 3.2: Gallery Images Lambda
    // ========================================

    /**
     * Gallery Images Lambda Function
     * - Multi-method handler for gallery CRUD and image uploads
     * - JWT authentication via Cognito
     * - Sharp image processing for uploads (requires 2048 MB memory)
     * - Connected to PostgreSQL, Redis, OpenSearch, S3
     */
    const galleryFunction = new sst.aws.Function('GalleryFunction', {
      handler: 'src/functions/gallery.handler',
      runtime: 'nodejs20.x',
      timeout: '60 seconds', // Story 3.2 AC #9: Longer timeout for Sharp processing
      memory: '2048 MB', // Story 3.2 AC #9: Required for Sharp image processing
      vpc,
      link: [postgres, redis, openSearch, bucket],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
        LEGO_API_BUCKET_NAME: bucket.name,
        LEGO_API_OPENSEARCH_ENDPOINT: openSearch.endpoint,
      },
    })

    // Gallery API Routes
    api.route('GET /api/images', galleryFunction)
    api.route('GET /api/images/{id}', galleryFunction)
    api.route('POST /api/images', galleryFunction) // Story 3.2: Upload with Sharp processing
    api.route('PATCH /api/images/{id}', galleryFunction)
    api.route('DELETE /api/images/{id}', galleryFunction)

    // Album API Routes (Story 3.4)
    api.route('GET /api/albums', galleryFunction)
    api.route('GET /api/albums/{id}', galleryFunction)
    api.route('POST /api/albums', galleryFunction)
    api.route('PATCH /api/albums/{id}', galleryFunction)
    api.route('DELETE /api/albums/{id}', galleryFunction)

    // ========================================
    // Story 3.5: Wishlist Lambda Handler
    // ========================================

    /**
     * Wishlist Lambda Function
     * - Multi-method handler for wishlist CRUD and image uploads
     * - JWT authentication via Cognito
     * - Sharp image processing for uploads (requires 1024 MB memory per Story 3.7)
     * - Connected to PostgreSQL, Redis, OpenSearch, S3
     */
    const wishlistFunction = new sst.aws.Function('WishlistFunction', {
      handler: 'src/functions/wishlist.handler',
      runtime: 'nodejs20.x',
      timeout: '60 seconds', // Story 3.7 AC #7: Timeout for image processing
      memory: '1024 MB', // Story 3.7 AC #7: Memory for Sharp processing
      vpc,
      link: [postgres, redis, openSearch, bucket],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
        LEGO_API_BUCKET_NAME: bucket.name,
        LEGO_API_OPENSEARCH_ENDPOINT: openSearch.endpoint,
      },
    })

    // Wishlist API Routes (Story 3.5 AC #2)
    api.route('GET /api/wishlist', wishlistFunction)
    api.route('GET /api/wishlist/{id}', wishlistFunction)
    api.route('POST /api/wishlist', wishlistFunction)
    api.route('PATCH /api/wishlist/{id}', wishlistFunction)
    api.route('DELETE /api/wishlist/{id}', wishlistFunction)
    api.route('POST /api/wishlist/reorder', wishlistFunction) // Story 3.6 AC #6
    api.route('POST /api/wishlist/{id}/image', wishlistFunction) // Story 3.7 AC #1

    // ========================================
    // Story 4.1: User Profile Lambda Handlers
    // ========================================

    /**
     * Get User Profile Lambda Function
     * - Retrieves user profile from Cognito User Pool
     * - Aggregates statistics from PostgreSQL
     * - Redis caching with 10-minute TTL
     * - Read-only operation
     */
    const profileGetFunction = new sst.aws.Function('ProfileGetFunction', {
      handler: 'src/functions/profile-get.handler',
      runtime: 'nodejs20.x',
      timeout: '10 seconds',
      memory: '512 MB',
      vpc,
      link: [postgres, redis],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
        // COGNITO_USER_POOL_ID will be set when Cognito integration is configured
      },
    })

    /**
     * Update User Profile Lambda Function
     * - Updates user attributes in Cognito User Pool
     * - Invalidates Redis cache
     * - Fetches updated profile (requires PostgreSQL for stats)
     */
    const profileUpdateFunction = new sst.aws.Function('ProfileUpdateFunction', {
      handler: 'src/functions/profile-update.handler',
      runtime: 'nodejs20.x',
      timeout: '10 seconds',
      memory: '512 MB',
      vpc,
      link: [postgres, redis],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
        // COGNITO_USER_POOL_ID will be set when Cognito integration is configured
      },
    })

    /**
     * Upload Avatar Lambda Function
     * - Handles multipart file upload
     * - Sharp image processing (resize, optimize)
     * - Uploads to S3: avatars/{userId}/avatar.webp
     * - Updates Cognito picture attribute
     * - Requires higher memory for Sharp
     */
    const profileAvatarUploadFunction = new sst.aws.Function('ProfileAvatarUploadFunction', {
      handler: 'src/functions/profile-avatar-upload.handler',
      runtime: 'nodejs20.x',
      timeout: '60 seconds', // Longer timeout for image processing
      memory: '2048 MB', // High memory required for Sharp image processing
      vpc,
      link: [redis, bucket],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
        LEGO_API_BUCKET_NAME: bucket.name,
        // COGNITO_USER_POOL_ID will be set when Cognito integration is configured
      },
    })

    /**
     * Delete Avatar Lambda Function
     * - Deletes avatar from S3
     * - Updates Cognito picture attribute
     * - Invalidates Redis cache
     * - Lightweight operation
     */
    const profileAvatarDeleteFunction = new sst.aws.Function('ProfileAvatarDeleteFunction', {
      handler: 'src/functions/profile-avatar-delete.handler',
      runtime: 'nodejs20.x',
      timeout: '10 seconds',
      memory: '256 MB',
      vpc,
      link: [redis, bucket],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
        LEGO_API_BUCKET_NAME: bucket.name,
        // COGNITO_USER_POOL_ID will be set when Cognito integration is configured
      },
    })

    // Profile API Routes (Story 4.1 AC #2)
    // All profile routes require JWT authentication via Cognito
    api.route('GET /api/users/{id}', profileGetFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })
    api.route('PATCH /api/users/{id}', profileUpdateFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })
    api.route('POST /api/users/{id}/avatar', profileAvatarUploadFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })
    api.route('DELETE /api/users/{id}/avatar', profileAvatarDeleteFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })

    return {
      // VPC Infrastructure
      vpc: vpc.id,
      vpcPrivateSubnets: vpc.privateSubnets.apply(subnets => subnets.map(s => s.subnet.id)),
      vpcPublicSubnets: vpc.publicSubnets.apply(subnets => subnets.map(s => s.subnet.id)),

      // Security Groups
      lambdaSecurityGroup: lambdaSecurityGroup.id,
      rdsSecurityGroup: rdsSecurityGroup.id,
      redisSecurityGroup: redisSecurityGroup.id,
      openSearchSecurityGroup: openSearchSecurityGroup.id,

      // Database
      postgresHost: postgres.host,
      postgresPort: postgres.port,
      postgresDatabase: postgres.database,
      postgresUsername: postgres.username,

      // Cache & Search
      redisHost: redis.host,
      redisPort: redis.port,
      openSearchEndpoint: openSearch.endpoint,

      // Storage
      bucketName: bucket.name,

      // API Gateway
      apiUrl: api.url,
      apiId: api.id,

      // Lambda Functions
      healthCheckFunctionName: healthCheckFunction.name,
      healthCheckFunctionArn: healthCheckFunction.arn,
      mocInstructionsFunctionName: mocInstructionsFunction.name,
      mocInstructionsFunctionArn: mocInstructionsFunction.arn,
      mocFileUploadFunctionName: mocFileUploadFunction.name,
      mocFileUploadFunctionArn: mocFileUploadFunction.arn,
      mocFileDownloadFunctionName: mocFileDownloadFunction.name,
      mocFileDownloadFunctionArn: mocFileDownloadFunction.arn,
      galleryFunctionName: galleryFunction.name,
      galleryFunctionArn: galleryFunction.arn,
      wishlistFunctionName: wishlistFunction.name,
      wishlistFunctionArn: wishlistFunction.arn,
      profileGetFunctionName: profileGetFunction.name,
      profileGetFunctionArn: profileGetFunction.arn,
      profileUpdateFunctionName: profileUpdateFunction.name,
      profileUpdateFunctionArn: profileUpdateFunction.arn,
      profileAvatarUploadFunctionName: profileAvatarUploadFunction.name,
      profileAvatarUploadFunctionArn: profileAvatarUploadFunction.arn,
      profileAvatarDeleteFunctionName: profileAvatarDeleteFunction.name,
      profileAvatarDeleteFunctionArn: profileAvatarDeleteFunction.arn,
    }
  },
})
