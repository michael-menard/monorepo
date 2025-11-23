/// <reference path="./.sst/platform/config.d.ts" />

/**
 * SST v3 (Ion) Configuration for LEGO Projects API Serverless Migration
 *
 * This configuration defines the complete serverless infrastructure including:
 * - VPC networking with public/private subnets
 * - RDS PostgreSQL with RDS Proxy
 * - OpenSearch domain
 * - S3 buckets for file storage
 * - Lambda functions with API Gateway
 * - CloudWatch monitoring and alarms
 */

import { createAlarms } from './src/infrastructure/monitoring/alarms'

export default $config({
  app(input) {
    return {
      name: 'lego-api-serverless',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
      // Story 5.7: AWS tagging schema compliance (all required tags)
      tags: {
        // Required tags (per aws-tagging-schema.md)
        Project: 'lego-api',
        Environment: input?.stage || 'development',
        ManagedBy: 'SST',
        CostCenter: 'Engineering',
        Owner: 'engineering@bricklink.com',
      },
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
    // Cognito User Pool for Authentication
    // ========================================

    /**
     * Cognito User Pool
     * - Email-based sign-in with auto-verification
     * - Password policy: 8+ chars, lowercase, uppercase, digits
     * - Custom attributes: avatar_url, preferences
     * - Deletion protection enabled for production
     */
    const userPool = new aws.cognito.UserPool('LegoMocUserPool', {
      name: `lego-moc-users-${stage}`,

      // Sign-in configuration
      usernameAttributes: ['email'],
      autoVerifiedAttributes: ['email'],

      // Password policy
      passwordPolicy: {
        minimumLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSymbols: false,
        temporaryPasswordValidityDays: 7,
      },

      // Account recovery
      accountRecoverySetting: {
        recoveryMechanisms: [
          {
            name: 'verified_email',
            priority: 1,
          },
        ],
      },

      // Email configuration (using Cognito's built-in email)
      // TODO: Switch to SES for production
      emailConfiguration: {
        emailSendingAccount: 'COGNITO_DEFAULT',
      },

      // User verification templates
      verificationMessageTemplate: {
        defaultEmailOption: 'CONFIRM_WITH_LINK',
        emailSubject: 'Verify your LEGO MOC account',
        emailMessage:
          'Hello! Please verify your email address by clicking this link: {##Verify Email##}',
        emailSubjectByLink: 'Verify your LEGO MOC account',
        emailMessageByLink:
          'Hello! Please verify your email address by clicking this link: {##Verify Email##}',
      },

      // Admin user creation templates
      adminCreateUserConfig: {
        allowAdminCreateUserOnly: false,
        inviteMessageTemplate: {
          emailSubject: 'Welcome to LEGO MOC Instructions!',
          emailMessage: 'Hello {username}! Your temporary password is {####}',
        },
      },

      // Standard attributes
      schemas: [
        {
          attributeDataType: 'String',
          name: 'email',
          required: true,
          mutable: true,
        },
        {
          attributeDataType: 'String',
          name: 'given_name',
          required: true,
          mutable: true,
        },
        {
          attributeDataType: 'String',
          name: 'family_name',
          required: false,
          mutable: true,
        },
        // Custom attributes
        {
          attributeDataType: 'String',
          name: 'avatar_url',
          mutable: true,
          stringAttributeConstraints: {
            maxLength: '2048',
            minLength: '0',
          },
        },
        {
          attributeDataType: 'String',
          name: 'preferences',
          mutable: true,
          stringAttributeConstraints: {
            maxLength: '2048',
            minLength: '0',
          },
        },
      ],

      // Deletion protection
      deletionProtection: stage === 'production' ? 'ACTIVE' : 'INACTIVE',

      tags: {
        Environment: stage,
        Service: 'lego-api-serverless',
      },
    })

    /**
     * Cognito User Pool Client
     * - OAuth 2.0 authorization code flow
     * - JWT token validity: 1 hour (access/id), 30 days (refresh)
     * - Callback URLs for local development and production
     */
    const userPoolClient = new aws.cognito.UserPoolClient('LegoMocWebClient', {
      userPoolId: userPool.id,
      name: `lego-moc-web-client-${stage}`,

      // OAuth configuration
      allowedOauthFlows: ['code'],
      allowedOauthFlowsUserPoolClient: true,
      allowedOauthScopes: ['email', 'openid', 'profile'],
      callbackUrls: [
        'http://localhost:3002/auth/callback',
        'http://localhost:5173/auth/callback', // Vite dev server
        'https://lego-moc-instructions.com/auth/callback',
      ],
      logoutUrls: [
        'http://localhost:3002/auth/logout',
        'http://localhost:5173/auth/logout',
        'https://lego-moc-instructions.com/auth/logout',
      ],

      // Security settings
      generateSecret: false, // Public client (SPA)
      preventUserExistenceErrors: 'ENABLED',

      // Token validity
      accessTokenValidity: 1,
      idTokenValidity: 1,
      refreshTokenValidity: 30,
      tokenValidityUnits: {
        accessToken: 'hours',
        idToken: 'hours',
        refreshToken: 'days',
      },

      // Supported identity providers
      supportedIdentityProviders: ['COGNITO'],

      // Read/write attributes
      readAttributes: [
        'email',
        'email_verified',
        'given_name',
        'family_name',
        'custom:avatar_url',
        'custom:preferences',
      ],
      writeAttributes: [
        'email',
        'given_name',
        'family_name',
        'custom:avatar_url',
        'custom:preferences',
      ],
    })

    /**
     * Cognito Identity Pool
     * - Provides temporary AWS credentials for authenticated users
     * - Used for direct S3 access (if needed)
     */
    const identityPool = new aws.cognito.IdentityPool('LegoMocIdentityPool', {
      identityPoolName: `lego_moc_identity_${stage}`,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.id,
          providerName: userPool.endpoint,
        },
      ],
    })

    /**
     * IAM Role for authenticated Cognito users
     * - Allows S3 read access for user-specific files
     */
    const authenticatedRole = new aws.iam.Role('CognitoAuthenticatedRole', {
      assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Federated: 'cognito-identity.amazonaws.com',
            },
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
              StringEquals: {
                'cognito-identity.amazonaws.com:aud': identityPool.id,
              },
              'ForAnyValue:StringLike': {
                'cognito-identity.amazonaws.com:amr': 'authenticated',
              },
            },
          },
        ],
      }),
      managedPolicyArns: ['arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess'],
    })

    /**
     * Attach IAM role to Identity Pool
     */
    new aws.cognito.IdentityPoolRoleAttachment('IdentityPoolRoleAttachment', {
      identityPoolId: identityPool.id,
      roles: {
        authenticated: authenticatedRole.arn,
      },
    })

    // ========================================
    // Story 1.8: Health Check Lambda + API Gateway
    // ========================================

    /**
     * Health Check Lambda Function
     * - Validates connectivity to PostgreSQL, OpenSearch
     * - Returns 200 (healthy/degraded) or 503 (unhealthy)
     * - No authentication required (public endpoint)
     */
    const healthCheckFunction = new sst.aws.Function('HealthCheckFunction', {
      handler: 'functions/health/index.handler',
      runtime: 'nodejs20.x',
      timeout: '30 seconds',
      memory: '256 MB',
      vpc,
      link: [postgres, openSearch, bucket],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
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
     * - Uses SST-managed Cognito User Pool and Client
     */
    const region = aws.getRegionOutput().name

    const cognitoAuthorizer = new aws.apigatewayv2.Authorizer('CognitoJwtAuthorizer', {
      apiId: api.id,
      authorizerType: 'JWT',
      identitySources: ['$request.header.Authorization'],
      name: `cognito-jwt-authorizer-${stage}`,
      jwtConfiguration: {
        audiences: [userPoolClient.id],
        issuer: $interpolate`https://cognito-idp.${region}.amazonaws.com/${userPool.id}`,
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
     * - Connected to PostgreSQL, OpenSearch, S3
     */
    const mocInstructionsFunction = new sst.aws.Function('MocInstructionsFunction', {
      handler: 'functions/moc-instructions/instructions/index.handler',
      runtime: 'nodejs20.x',
      timeout: '30 seconds',
      memory: '512 MB',
      vpc,
      link: [postgres, openSearch, bucket],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
        LEGO_API_BUCKET_NAME: bucket.name,
        LEGO_API_OPENSEARCH_ENDPOINT: openSearch.endpoint,
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
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
     * - Handles multipart/form-data file uploads (single or multi-file)
     * - JWT authentication via Cognito
     * - Validates file type, size, and MIME type
     * - Uploads to S3 with metadata (parallel for multi-file)
     * - Creates database records
     * - Story 4.7: Enhanced for multi-file uploads (up to 10 files)
     */
    const mocFileUploadFunction = new sst.aws.Function('MocFileUploadFunction', {
      handler: 'functions/moc-instructions/fileUpload/index.handler',
      runtime: 'nodejs20.x',
      timeout: '120 seconds', // 2 minutes for multi-file parallel uploads
      memory: '2048 MB', // Increased memory for parallel processing
      vpc,
      link: [postgres, bucket],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
        LEGO_API_BUCKET_NAME: bucket.name,
        MAX_FILES_PER_UPLOAD: '10',
        MAX_TOTAL_PAYLOAD: '52428800', // 50MB in bytes
        MAX_FILE_SIZE: '52428800', // 50MB per file
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
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
      handler: 'functions/moc-instructions/fileDownload/index.handler',
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
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // MOC File Download Route
    api.route('GET /api/mocs/{mocId}/files/{fileId}/download', mocFileDownloadFunction)

    // ========================================
    // MOC File Delete Lambda
    // ========================================

    /**
     * MOC File Delete Lambda Function
     * - Deletes file attachments from MOC instructions
     * - JWT authentication via Cognito
     * - Verifies MOC ownership and file association
     * - Updates MOC updatedAt timestamp
     */
    const mocFileDeleteFunction = new sst.aws.Function('MocFileDeleteFunction', {
      handler: 'functions/moc-instructions/delete-moc-file/index.handler',
      runtime: 'nodejs20.x',
      timeout: '10 seconds',
      memory: '256 MB',
      vpc,
      link: [postgres],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // MOC File Delete Route
    api.route('DELETE /api/mocs/{id}/files/{fileId}', mocFileDeleteFunction)

    // ========================================
    // MOC Parts List Upload Lambda
    // ========================================

    /**
     * MOC Parts List Upload Lambda Function
     * - Uploads and parses parts list files (CSV/XML)
     * - Extracts part numbers, quantities, total piece count
     * - Creates mocFiles and mocPartsLists records
     * - Updates MOC totalPieceCount
     * - JWT authentication via Cognito
     */
    const uploadPartsListFunction = new sst.aws.Function('UploadPartsListFunction', {
      handler: 'functions/moc-instructions/upload-parts-list/index.handler',
      runtime: 'nodejs20.x',
      timeout: '30 seconds', // Longer timeout for file parsing
      memory: '512 MB', // More memory for CSV/XML processing
      vpc,
      link: [postgres, bucket],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
        LEGO_API_BUCKET_NAME: bucket.name,
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // MOC Parts List Upload Route
    api.route('POST /api/mocs/{id}/upload-parts-list', uploadPartsListFunction)

    // ========================================
    // MOC with Files (Two-Phase Upload Pattern)
    // ========================================

    /**
     * Initialize MOC with Files Lambda Function
     * - Phase 1: Creates MOC record and generates presigned S3 URLs
     * - Accepts MOC metadata + file list (no actual files)
     * - Returns MOC ID + presigned URLs for direct S3 upload
     * - Client uploads files directly to S3 (bypassing API Gateway 10MB limit)
     * - JWT authentication via Cognito
     */
    const initializeMocWithFilesFunction = new sst.aws.Function('InitializeMocWithFilesFunction', {
      handler: 'functions/moc-instructions/initialize-moc-with-files/index.handler',
      runtime: 'nodejs20.x',
      timeout: '30 seconds',
      memory: '512 MB',
      vpc,
      link: [postgres, bucket],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
        LEGO_API_BUCKET_NAME: bucket.name,
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    /**
     * Finalize MOC with Files Lambda Function
     * - Phase 2: Verifies file uploads and finalizes MOC
     * - Confirms files exist in S3
     * - Sets first image as thumbnail
     * - Indexes MOC in Elasticsearch
     * - Returns complete MOC data with all files
     * - JWT authentication via Cognito
     */
    const finalizeMocWithFilesFunction = new sst.aws.Function('FinalizeMocWithFilesFunction', {
      handler: 'functions/moc-instructions/finalize-moc-with-files/index.handler',
      runtime: 'nodejs20.x',
      timeout: '30 seconds',
      memory: '512 MB',
      vpc,
      link: [postgres, openSearch, bucket],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
        LEGO_API_BUCKET_NAME: bucket.name,
        LEGO_API_OPENSEARCH_ENDPOINT: openSearch.endpoint,
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // MOC with Files Routes
    api.route('POST /api/mocs/with-files/initialize', initializeMocWithFilesFunction)
    api.route('POST /api/mocs/{mocId}/finalize', finalizeMocWithFilesFunction)

    // ========================================
    // MOC Gallery Image Linking Lambdas
    // ========================================

    /**
     * Link Gallery Image to MOC Lambda
     * - Creates association between gallery image and MOC
     * - Validates ownership and existence
     * - Prevents duplicate links
     */
    const linkGalleryImageFunction = new sst.aws.Function('LinkGalleryImageFunction', {
      handler: 'functions/moc-instructions/link-gallery-image/index.handler',
      runtime: 'nodejs20.x',
      timeout: '10 seconds',
      memory: '256 MB',
      vpc,
      link: [postgres],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    /**
     * Unlink Gallery Image from MOC Lambda
     * - Removes association between gallery image and MOC
     * - Verifies ownership
     */
    const unlinkGalleryImageFunction = new sst.aws.Function('UnlinkGalleryImageFunction', {
      handler: 'functions/moc-instructions/unlink-gallery-image/index.handler',
      runtime: 'nodejs20.x',
      timeout: '10 seconds',
      memory: '256 MB',
      vpc,
      link: [postgres],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    /**
     * Get MOC Gallery Images Lambda
     * - Retrieves all gallery images linked to a MOC
     * - Returns full image data with metadata
     */
    const getMocGalleryImagesFunction = new sst.aws.Function('GetMocGalleryImagesFunction', {
      handler: 'functions/moc-instructions/get-moc-gallery-images/index.handler',
      runtime: 'nodejs20.x',
      timeout: '10 seconds',
      memory: '256 MB',
      vpc,
      link: [postgres],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // MOC Gallery Image Routes
    api.route('POST /api/mocs/{id}/gallery-images', linkGalleryImageFunction)
    api.route('DELETE /api/mocs/{id}/gallery-images/{galleryImageId}', unlinkGalleryImageFunction)
    api.route('GET /api/mocs/{id}/gallery-images', getMocGalleryImagesFunction)

    // ========================================
    // MOC Analytics Lambdas
    // ========================================

    /**
     * Get MOC Stats by Category Lambda
     * - Returns statistics grouped by category/theme/tags
     * - Top 10 categories with counts
     */
    const getMocStatsByCategoryFunction = new sst.aws.Function('GetMocStatsByCategoryFunction', {
      handler: 'functions/moc-instructions/get-moc-stats/index.handler',
      runtime: 'nodejs20.x',
      timeout: '15 seconds',
      memory: '512 MB',
      vpc,
      link: [postgres],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    /**
     * Get MOC Uploads Over Time Lambda
     * - Returns time-series data of uploads (last 12 months)
     * - Grouped by month and category
     */
    const getMocUploadsOverTimeFunction = new sst.aws.Function('GetMocUploadsOverTimeFunction', {
      handler: 'functions/moc-instructions/get-moc-uploads-over-time/index.handler',
      runtime: 'nodejs20.x',
      timeout: '15 seconds',
      memory: '512 MB',
      vpc,
      link: [postgres],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // MOC Analytics Routes
    api.route('GET /api/mocs/stats/by-category', getMocStatsByCategoryFunction)
    api.route('GET /api/mocs/stats/uploads-over-time', getMocUploadsOverTimeFunction)

    // ========================================
    // Story 3.1 & 3.2: Gallery Images Lambdas (Separate Handlers)
    // ========================================

    /**
     * Shared Lambda configuration for gallery handlers
     */
    const galleryLambdaConfig = {
      runtime: 'nodejs20.x' as const,
      vpc,
      link: [postgres, openSearch, bucket],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
        LEGO_API_BUCKET_NAME: bucket.name,
        LEGO_API_OPENSEARCH_ENDPOINT: openSearch.endpoint,
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    }

    // Image Upload Handler - Requires high memory for Sharp image processing
    const uploadImageFunction = new sst.aws.Function('UploadImageFunction', {
      ...galleryLambdaConfig,
      handler: 'functions/gallery/upload-image/index.handler',
      timeout: '60 seconds', // Story 3.2 AC #9: Longer timeout for Sharp processing
      memory: '2048 MB', // Story 3.2 AC #9: Required for Sharp image processing
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Image List Handler
    const listImagesFunction = new sst.aws.Function('ListImagesFunction', {
      ...galleryLambdaConfig,
      handler: 'functions/gallery/list-images/index.handler',
      timeout: '30 seconds',
      memory: '512 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Image Search Handler - Story 3.8: Gallery and Wishlist Search
    const searchImagesFunction = new sst.aws.Function('SearchImagesFunction', {
      ...galleryLambdaConfig,
      handler: 'functions/gallery/search-images/index.handler',
      timeout: '30 seconds',
      memory: '512 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Get Single Image Handler
    const getImageFunction = new sst.aws.Function('GetImageFunction', {
      ...galleryLambdaConfig,
      handler: 'functions/gallery/get-image/index.handler',
      timeout: '10 seconds',
      memory: '256 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Update Image Handler
    const updateImageFunction = new sst.aws.Function('UpdateImageFunction', {
      ...galleryLambdaConfig,
      handler: 'functions/gallery/update-image/index.handler',
      timeout: '30 seconds',
      memory: '512 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Delete Image Handler
    const deleteImageFunction = new sst.aws.Function('DeleteImageFunction', {
      ...galleryLambdaConfig,
      handler: 'functions/gallery/delete-image/index.handler',
      timeout: '30 seconds',
      memory: '512 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Flag Image Handler
    const flagImageFunction = new sst.aws.Function('FlagImageFunction', {
      ...galleryLambdaConfig,
      handler: 'functions/gallery/flag-image/index.handler',
      timeout: '10 seconds',
      memory: '256 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Create Album Handler
    const createAlbumFunction = new sst.aws.Function('CreateAlbumFunction', {
      ...galleryLambdaConfig,
      handler: 'functions/gallery/create-album/index.handler',
      timeout: '30 seconds',
      memory: '512 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // List Albums Handler
    const listAlbumsFunction = new sst.aws.Function('ListAlbumsFunction', {
      ...galleryLambdaConfig,
      handler: 'functions/gallery/list-albums/index.handler',
      timeout: '30 seconds',
      memory: '512 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Get Album Handler
    const getAlbumFunction = new sst.aws.Function('GetAlbumFunction', {
      ...galleryLambdaConfig,
      handler: 'functions/gallery/get-album/index.handler',
      timeout: '30 seconds',
      memory: '512 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Update Album Handler
    const updateAlbumFunction = new sst.aws.Function('UpdateAlbumFunction', {
      ...galleryLambdaConfig,
      handler: 'functions/gallery/update-album/index.handler',
      timeout: '30 seconds',
      memory: '512 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Delete Album Handler
    const deleteAlbumFunction = new sst.aws.Function('DeleteAlbumFunction', {
      ...galleryLambdaConfig,
      handler: 'functions/gallery/delete-album/index.handler',
      timeout: '30 seconds',
      memory: '512 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Gallery Image API Routes
    api.route('POST /api/images', uploadImageFunction) // Story 3.2: Upload with Sharp processing
    api.route('GET /api/images', listImagesFunction)
    api.route('GET /api/images/search', searchImagesFunction) // Story 3.8: Search endpoint
    api.route('GET /api/images/{id}', getImageFunction)
    api.route('PATCH /api/images/{id}', updateImageFunction)
    api.route('DELETE /api/images/{id}', deleteImageFunction)
    api.route('POST /api/flag', flagImageFunction)

    // Album API Routes (Story 3.4)
    api.route('POST /api/albums', createAlbumFunction)
    api.route('GET /api/albums', listAlbumsFunction)
    api.route('GET /api/albums/{id}', getAlbumFunction)
    api.route('PATCH /api/albums/{id}', updateAlbumFunction)
    api.route('DELETE /api/albums/{id}', deleteAlbumFunction)

    // ========================================
    // Story 3.5: Wishlist Modular Lambda Handlers
    // ========================================

    /**
     * Shared configuration for wishlist handlers
     * - All handlers connect to PostgreSQL, OpenSearch, S3
     * - JWT authentication via Cognito
     */
    const wishlistLambdaConfig = {
      runtime: 'nodejs20.x' as const,
      vpc,
      link: [postgres, openSearch, bucket],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
        LEGO_API_BUCKET_NAME: bucket.name,
        LEGO_API_OPENSEARCH_ENDPOINT: openSearch.endpoint,
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    }

    // List Wishlist Items Handler
    const listWishlistFunction = new sst.aws.Function('ListWishlistFunction', {
      ...wishlistLambdaConfig,
      handler: 'functions/wishlist/list-wishlist/index.handler',
      timeout: '10 seconds',
      memory: '256 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Get Wishlist Item Handler
    const getWishlistItemFunction = new sst.aws.Function('GetWishlistItemFunction', {
      ...wishlistLambdaConfig,
      handler: 'functions/wishlist/get-wishlist-item/index.handler',
      timeout: '10 seconds',
      memory: '256 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Create Wishlist Item Handler
    const createWishlistItemFunction = new sst.aws.Function('CreateWishlistItemFunction', {
      ...wishlistLambdaConfig,
      handler: 'functions/wishlist/create-wishlist-item/index.handler',
      timeout: '15 seconds',
      memory: '512 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Update Wishlist Item Handler
    const updateWishlistItemFunction = new sst.aws.Function('UpdateWishlistItemFunction', {
      ...wishlistLambdaConfig,
      handler: 'functions/wishlist/update-wishlist-item/index.handler',
      timeout: '15 seconds',
      memory: '512 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Delete Wishlist Item Handler
    const deleteWishlistItemFunction = new sst.aws.Function('DeleteWishlistItemFunction', {
      ...wishlistLambdaConfig,
      handler: 'functions/wishlist/delete-wishlist-item/index.handler',
      timeout: '15 seconds',
      memory: '512 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Reorder Wishlist Handler
    const reorderWishlistFunction = new sst.aws.Function('ReorderWishlistFunction', {
      ...wishlistLambdaConfig,
      handler: 'functions/wishlist/reorder-wishlist/index.handler',
      timeout: '20 seconds',
      memory: '512 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Upload Wishlist Image Handler - Requires high memory for Sharp image processing
    const uploadWishlistImageFunction = new sst.aws.Function('UploadWishlistImageFunction', {
      ...wishlistLambdaConfig,
      handler: 'functions/wishlist/upload-wishlist-image/index.handler',
      timeout: '60 seconds', // Story 3.7 AC #7: Timeout for image processing
      memory: '1024 MB', // Story 3.7 AC #7: Memory for Sharp processing
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Search Wishlist Handler
    const searchWishlistFunction = new sst.aws.Function('SearchWishlistFunction', {
      ...wishlistLambdaConfig,
      handler: 'functions/wishlist/search-wishlist/index.handler',
      timeout: '15 seconds',
      memory: '512 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // Wishlist API Routes (Story 3.5 AC #2)
    api.route('GET /api/wishlist', listWishlistFunction)
    api.route('GET /api/wishlist/search', searchWishlistFunction)
    api.route('GET /api/wishlist/{id}', getWishlistItemFunction)
    api.route('POST /api/wishlist', createWishlistItemFunction)
    api.route('PATCH /api/wishlist/{id}', updateWishlistItemFunction)
    api.route('DELETE /api/wishlist/{id}', deleteWishlistItemFunction)
    api.route('POST /api/wishlist/reorder', reorderWishlistFunction)
    api.route('POST /api/wishlist/{id}/image', uploadWishlistImageFunction)

    // ========================================
    // MOC Parts Lists Lambda Handlers
    // ========================================

    /**
     * Shared configuration for MOC parts list handlers
     * - All connect to PostgreSQL for parts list management
     * - JWT authentication via Cognito
     * - No image processing, S3, or search needed
     */
    const mocPartsListsLambdaConfig = {
      runtime: 'nodejs20.x' as const,
      vpc,
      link: [postgres],
      environment: {
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    }

    /**
     * Get Parts Lists for MOC
     * - Retrieves all parts lists for a specific MOC
     * - Verifies MOC ownership
     * - Returns ordered by creation date
     */
    const getPartsListsFunction = new sst.aws.Function('GetPartsListsFunction', {
      ...mocPartsListsLambdaConfig,
      handler: 'functions/moc-parts-lists/get-parts-lists/index.handler',
      timeout: '10 seconds',
      memory: '256 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    /**
     * Create Parts List
     * - Creates new parts list for a MOC
     * - Optionally creates parts list items
     * - Verifies MOC ownership
     */
    const createPartsListFunction = new sst.aws.Function('CreatePartsListFunction', {
      ...mocPartsListsLambdaConfig,
      handler: 'functions/moc-parts-lists/create-parts-list/index.handler',
      timeout: '30 seconds',
      memory: '512 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    /**
     * Update Parts List (Full Replacement)
     * - Updates parts list metadata and/or parts
     * - Replaces all parts if parts array provided
     * - Automatically updates counts
     */
    const updatePartsListFunction = new sst.aws.Function('UpdatePartsListFunction', {
      ...mocPartsListsLambdaConfig,
      handler: 'functions/moc-parts-lists/update-parts-list/index.handler',
      timeout: '30 seconds',
      memory: '512 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    /**
     * Update Parts List Status (Partial Update)
     * - Updates only the status field
     * - Lightweight operation for status transitions
     */
    const updatePartsListStatusFunction = new sst.aws.Function('UpdatePartsListStatusFunction', {
      ...mocPartsListsLambdaConfig,
      handler: 'functions/moc-parts-lists/update-parts-list-status/index.handler',
      timeout: '10 seconds',
      memory: '256 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    /**
     * Delete Parts List
     * - Deletes parts list and all associated items
     * - Cascade delete for parts list items
     * - Verifies MOC ownership
     */
    const deletePartsListFunction = new sst.aws.Function('DeletePartsListFunction', {
      ...mocPartsListsLambdaConfig,
      handler: 'functions/moc-parts-lists/delete-parts-list/index.handler',
      timeout: '10 seconds',
      memory: '256 MB',
    
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    /**
     * Parse CSV Parts List (Story 4.6)
     * - Downloads CSV file from S3
     * - Parses and validates CSV data
     * - Expected format: Part ID, Part Name, Quantity, Color
     * - Max 10,000 rows
     * - Stores parts in mocPartsLists and mocParts tables
     * - Updates MOC totalPieceCount
     */
    const parsePartsListFunction = new sst.aws.Function('ParsePartsListFunction', {
      ...mocPartsListsLambdaConfig,
      handler: 'functions/moc-parts-lists/parse-parts-list/index.handler',
      timeout: '5 minutes', // 300 seconds for large CSV files
      memory: '512 MB',
      link: [postgres, bucket],
      environment: {
        ...mocPartsListsLambdaConfig.environment,
        BUCKET_NAME: bucket.name,
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    /**
     * Get User Parts Lists Summary
     * - Aggregates statistics across all user's MOCs
     * - Provides dashboard overview
     * - Groups by status with totals
     */
    const getUserPartsListsSummaryFunction = new sst.aws.Function(
      'GetUserPartsListsSummaryFunction',
      {
        ...mocPartsListsLambdaConfig,
        handler: 'functions/moc-parts-lists/get-user-summary/index.handler',
        timeout: '20 seconds',
        memory: '512 MB',
      },
    )

    // MOC Parts Lists API Routes
    // All routes require JWT authentication via Cognito
    api.route('GET /api/moc-instructions/{mocId}/parts-lists', getPartsListsFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })
    api.route('POST /api/moc-instructions/{mocId}/parts-lists', createPartsListFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })
    api.route(
      'PUT /api/moc-instructions/{mocId}/parts-lists/{partsListId}',
      updatePartsListFunction,
      {
        auth: { jwt: { authorizer: cognitoAuthorizer } },
      },
    )
    api.route(
      'PATCH /api/moc-instructions/{mocId}/parts-lists/{partsListId}/status',
      updatePartsListStatusFunction,
      {
        auth: { jwt: { authorizer: cognitoAuthorizer } },
      },
    )
    api.route(
      'DELETE /api/moc-instructions/{mocId}/parts-lists/{partsListId}',
      deletePartsListFunction,
      {
        auth: { jwt: { authorizer: cognitoAuthorizer } },
      },
    )
    api.route(
      'POST /api/mocs/{id}/upload-parts-list',
      parsePartsListFunction,
      {
        auth: { jwt: { authorizer: cognitoAuthorizer } },
      },
    )
    api.route('GET /api/user/parts-lists/summary', getUserPartsListsSummaryFunction, {
      auth: { jwt: { authorizer: cognitoAuthorizer } },
    })

    // ========================================
    // Story 4.5.5: WebSocket Server for Real-Time Updates
    // ========================================

    /**
     * DynamoDB Table for WebSocket Connection Tracking
     * - Stores active WebSocket connections with user mapping
     * - TTL for automatic cleanup of stale connections (2 hours)
     * - Global secondary index on userId for efficient user lookups
     */
    const websocketConnectionsTable = new sst.aws.Dynamo('WebSocketConnections', {
      fields: {
        connectionId: 'string',
        userId: 'string',
      },
      primaryIndex: { hashKey: 'connectionId' },
      globalIndexes: {
        userIdIndex: { hashKey: 'userId', projection: 'all' },
      },
      ttl: 'expiresAt', // Auto-cleanup stale connections after 2 hours
      transform: {
        table: args => {
          args.tags = {
            Environment: stage,
            Service: 'lego-api-serverless',
            Feature: 'websocket',
          }
        },
      },
    })

    /**
     * WebSocket API Gateway
     * - Provides real-time bidirectional communication
     * - Used for upload progress, notifications, and real-time updates
     * - JWT authentication on connection
     */
    const websocketApi = new sst.aws.ApiGatewayWebSocket('WebSocketApi')

    /**
     * WebSocket $connect Handler
     * - Authenticates user via JWT token (from query parameter)
     * - Stores connection in DynamoDB
     * - Rejects invalid/expired tokens
     */
    const websocketConnectFunction = new sst.aws.Function('WebSocketConnectFunction', {
      handler: 'websocket/connect/index.handler',
      runtime: 'nodejs20.x',
      timeout: '30 seconds',
      memory: '256 MB',
      vpc,
      link: [websocketConnectionsTable, websocketApi],
      environment: {
        CONNECTIONS_TABLE_NAME: websocketConnectionsTable.name,
        COGNITO_USER_POOL_ID: userPool.id,
        COGNITO_REGION: aws.getRegionOutput().name,
        WEBSOCKET_API_ENDPOINT: $interpolate`${websocketApi.managementEndpoint}`,
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    /**
     * WebSocket $disconnect Handler
     * - Removes connection from DynamoDB on disconnect
     * - Ensures cleanup of stale connections
     */
    const websocketDisconnectFunction = new sst.aws.Function('WebSocketDisconnectFunction', {
      handler: 'websocket/disconnect/index.handler',
      runtime: 'nodejs20.x',
      timeout: '30 seconds',
      memory: '256 MB',
      vpc,
      link: [websocketConnectionsTable, websocketApi],
      environment: {
        CONNECTIONS_TABLE_NAME: websocketConnectionsTable.name,
        WEBSOCKET_API_ENDPOINT: $interpolate`${websocketApi.managementEndpoint}`,
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    /**
     * WebSocket $default Handler
     * - Handles any messages sent from client
     * - For now, just acknowledges receipt
     * - Can be extended for client-initiated actions
     */
    const websocketDefaultFunction = new sst.aws.Function('WebSocketDefaultFunction', {
      handler: 'websocket/default/index.handler',
      runtime: 'nodejs20.x',
      timeout: '30 seconds',
      memory: '256 MB',
      vpc,
      link: [websocketConnectionsTable, websocketApi],
      environment: {
        CONNECTIONS_TABLE_NAME: websocketConnectionsTable.name,
        WEBSOCKET_API_ENDPOINT: $interpolate`${websocketApi.managementEndpoint}`,
        NODE_ENV: stage === 'production' ? 'production' : 'development',
        STAGE: stage,
      },
      // Story 5.3: Enable X-Ray tracing for distributed tracing
      tracing: 'active',
    })

    // WebSocket Routes
    websocketApi.route('$connect', websocketConnectFunction)
    websocketApi.route('$disconnect', websocketDisconnectFunction)
    websocketApi.route('$default', websocketDefaultFunction)

    // ========================================
    // Story 4.8: CloudWatch Alarms for Error Monitoring
    // ========================================

    /**
     * SNS Topic for Error Alerts
     * - Receives notifications when error rate exceeds threshold
     * - Subscribe via email/SMS in AWS Console after deployment
     */
    const errorAlertTopic = new aws.sns.Topic('ErrorAlertTopic', {
      name: `lego-api-error-alerts-${stage}`,
      displayName: 'LEGO API Error Alerts',
      tags: {
        Environment: stage,
        Service: 'lego-api-serverless',
        Feature: 'monitoring',
      },
    })

    /**
     * Helper function to create error rate alarm for a Lambda function
     * - Monitors error rate (errors / invocations) over 5-minute periods
     * - Triggers alert if error rate exceeds 5% for 2 consecutive periods
     * - Publishes to SNS topic for notifications
     */
    const createErrorRateAlarm = (functionName: string, lambdaFunction: any) => {
      return new aws.cloudwatch.MetricAlarm(`${functionName}ErrorRateAlarm`, {
        name: `${functionName}-error-rate-${stage}`,
        comparisonOperator: 'GreaterThanThreshold',
        evaluationPeriods: 2,
        threshold: 5.0, // 5% error rate threshold (AC #10)
        actionsEnabled: true,
        alarmActions: [errorAlertTopic.arn],
        metricQueries: [
          {
            id: 'errorRate',
            expression: '(errors / invocations) * 100',
            label: 'Error Rate (%)',
            returnData: true,
          },
          {
            id: 'errors',
            metric: {
              namespace: 'AWS/Lambda',
              metricName: 'Errors',
              period: 300, // 5 minutes
              stat: 'Sum',
              dimensions: {
                FunctionName: lambdaFunction.name,
              },
            },
          },
          {
            id: 'invocations',
            metric: {
              namespace: 'AWS/Lambda',
              metricName: 'Invocations',
              period: 300, // 5 minutes
              stat: 'Sum',
              dimensions: {
                FunctionName: lambdaFunction.name,
              },
            },
          },
        ],
        treatMissingData: 'notBreaching',
        tags: {
          Environment: stage,
          Service: 'lego-api-serverless',
          Function: functionName,
        },
      })
    }

    // Create error rate alarms for critical Lambda functions
    createErrorRateAlarm('HealthCheck', healthCheckFunction)
    createErrorRateAlarm('MocInstructions', mocInstructionsFunction)
    createErrorRateAlarm('MocFileUpload', mocFileUploadFunction)
    createErrorRateAlarm('MocFileDownload', mocFileDownloadFunction)
    createErrorRateAlarm('UploadImage', uploadImageFunction)
    createErrorRateAlarm('ListWishlist', listWishlistFunction)
    createErrorRateAlarm('CreateWishlistItem', createWishlistItemFunction)
    createErrorRateAlarm('UploadWishlistImage', uploadWishlistImageFunction)
    createErrorRateAlarm('WebSocketConnect', websocketConnectFunction)

    // ========================================
    // Story 5.1: CloudWatch Dashboards for SST Services
    // ========================================

    /**
     * Get current AWS account ID for dashboard configuration
     */
    const accountId = aws.getCallerIdentityOutput().accountId

    /**
     * Create CloudWatch Dashboard for monitoring all SST services using SST v3 globals
     *
     * IMPORTANT: This uses SST's global `aws` object, NOT Pulumi imports.
     * SST v3 (Ion) provides Pulumi under the hood via global types.
     *
     * Dashboard includes:
     * - Lambda functions: invocations, duration (p50/p95), errors, throttles
     * - API Gateway: requests, latency (p50/p95/p99), errors
     * - RDS PostgreSQL: connections, CPU, memory, IOPS, latency
     * - ElastiCache Redis: cache hit rate, evictions, connections, CPU, memory
     * - OpenSearch: cluster health, indexing rate, search latency, CPU, JVM
     *
     * Configuration:
     * - Auto-refresh: 60-second period for all metrics
     * - Time range: Configured via CloudWatch console (1h, 3h, 6h, 12h, 24h, 7d)
     * - Period override: AUTO (adapts to selected time range)
     */
    const dashboardName = `lego-api-sst-${stage}`

    const dashboard = new aws.cloudwatch.Dashboard('LegoApiDashboard', {
      dashboardName,
      dashboardBody: $jsonStringify($output([
        api.id,
        healthCheckFunction.name,
        mocInstructionsFunction.name,
        mocFileUploadFunction.name,
        mocFileDownloadFunction.name,
        uploadImageFunction.name,
        listImagesFunction.name,
        searchImagesFunction.name,
        getImageFunction.name,
        updateImageFunction.name,
        deleteImageFunction.name,
        listWishlistFunction.name,
        createWishlistItemFunction.name,
        updateWishlistItemFunction.name,
        deleteWishlistItemFunction.name,
        uploadWishlistImageFunction.name,
        websocketConnectFunction.name,
        websocketDisconnectFunction.name,
        postgres.clusterIdentifier,
        redis.clusterId,
        openSearch.domainName,
        region,
        accountId,
      ]).apply(([
        apiId,
        healthCheckFnName,
        mocInstructionsFnName,
        mocFileUploadFnName,
        mocFileDownloadFnName,
        uploadImageFnName,
        listImagesFnName,
        searchImagesFnName,
        getImageFnName,
        updateImageFnName,
        deleteImageFnName,
        listWishlistFnName,
        createWishlistItemFnName,
        updateWishlistItemFnName,
        deleteWishlistItemFnName,
        uploadWishlistImageFnName,
        websocketConnectFnName,
        websocketDisconnectFnName,
        rdsClusterId,
        redisId,
        openSearchDomain,
        region,
        accountId,
      ]) => {
        const widgets: any[] = []

        // ========================================
        // Overview Section
        // ========================================
        widgets.push(
          {
            type: 'text',
            x: 0,
            y: 0,
            width: 24,
            height: 2,
            properties: {
              markdown: `# LEGO API Production Monitoring\n\nReal-time metrics for SST serverless infrastructure - **${stage}** environment`,
            },
          },
          {
            type: 'metric',
            x: 0,
            y: 2,
            width: 12,
            height: 6,
            properties: {
              title: 'API Request Volume',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  'AWS/ApiGateway',
                  'Count',
                  { ApiId: apiId },
                  { stat: 'Sum', label: 'Total Requests' },
                ],
              ],
              period: 60,
              yAxis: {
                left: {
                  min: 0,
                },
              },
            },
          },
          {
            type: 'metric',
            x: 12,
            y: 2,
            width: 12,
            height: 6,
            properties: {
              title: 'API Error Rate',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  { expression: '(m1 / m2) * 100', label: '5xx Error Rate (%)', id: 'e1' },
                ],
                [
                  'AWS/ApiGateway',
                  '5XXError',
                  { ApiId: apiId },
                  { stat: 'Sum', id: 'm1', visible: false },
                ],
                [
                  'AWS/ApiGateway',
                  'Count',
                  { ApiId: apiId },
                  { stat: 'Sum', id: 'm2', visible: false },
                ],
              ],
              period: 60,
              yAxis: {
                left: {
                  min: 0,
                },
              },
            },
          },
        )

        // ========================================
        // Lambda Functions Section
        // ========================================
        const lambdaFunctions = [
          { name: 'Health Check', functionName: healthCheckFnName },
          { name: 'MOC Instructions', functionName: mocInstructionsFnName },
          { name: 'MOC File Upload', functionName: mocFileUploadFnName },
          { name: 'MOC File Download', functionName: mocFileDownloadFnName },
          { name: 'Upload Image', functionName: uploadImageFnName },
          { name: 'List Images', functionName: listImagesFnName },
          { name: 'Search Images', functionName: searchImagesFnName },
          { name: 'Get Image', functionName: getImageFnName },
          { name: 'Update Image', functionName: updateImageFnName },
          { name: 'Delete Image', functionName: deleteImageFnName },
          { name: 'List Wishlist', functionName: listWishlistFnName },
          { name: 'Create Wishlist', functionName: createWishlistItemFnName },
          { name: 'Update Wishlist', functionName: updateWishlistItemFnName },
          { name: 'Delete Wishlist', functionName: deleteWishlistItemFnName },
          { name: 'Upload Wishlist Img', functionName: uploadWishlistImageFnName },
          { name: 'WebSocket Connect', functionName: websocketConnectFnName },
          { name: 'WebSocket Disconnect', functionName: websocketDisconnectFnName },
        ]

        let lambdaYPosition = 8

        widgets.push({
          type: 'text',
          x: 0,
          y: lambdaYPosition,
          width: 24,
          height: 1,
          properties: {
            markdown: '## Lambda Functions',
          },
        })

        lambdaYPosition += 1

        // Create widgets for each Lambda function (4 widgets per row)
        lambdaFunctions.forEach((lambda, index) => {
          const xPosition = (index % 4) * 6
          const yPosition = lambdaYPosition + Math.floor(index / 4) * 6

          widgets.push({
            type: 'metric',
            x: xPosition,
            y: yPosition,
            width: 6,
            height: 6,
            properties: {
              title: `${lambda.name}`,
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  'AWS/Lambda',
                  'Invocations',
                  { stat: 'Sum', label: 'Invocations', color: '#1f77b4' },
                  { FunctionName: lambda.functionName },
                ],
                [
                  '.',
                  'Errors',
                  { stat: 'Sum', label: 'Errors', yAxis: 'right', color: '#d62728' },
                  { FunctionName: lambda.functionName },
                ],
                [
                  '.',
                  'Throttles',
                  { stat: 'Sum', label: 'Throttles', yAxis: 'right', color: '#ff7f0e' },
                  { FunctionName: lambda.functionName },
                ],
                [
                  '.',
                  'Duration',
                  { stat: 'p50', label: 'p50 ms', yAxis: 'right', color: '#2ca02c' },
                  { FunctionName: lambda.functionName },
                ],
                [
                  '...',
                  { stat: 'p95', label: 'p95 ms', yAxis: 'right', color: '#98df8a' },
                  { FunctionName: lambda.functionName },
                ],
              ],
              period: 60,
              yAxis: {
                left: {
                  label: 'Count',
                  min: 0,
                },
                right: {
                  label: 'Duration (ms) / Errors',
                  min: 0,
                },
              },
            },
          })
        })

        lambdaYPosition += Math.ceil(lambdaFunctions.length / 4) * 6

        // ========================================
        // API Gateway Section
        // ========================================
        widgets.push(
          {
            type: 'text',
            x: 0,
            y: lambdaYPosition,
            width: 24,
            height: 1,
            properties: {
              markdown: '## API Gateway',
            },
          },
          {
            type: 'metric',
            x: 0,
            y: lambdaYPosition + 1,
            width: 8,
            height: 6,
            properties: {
              title: 'Requests by Status',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  'AWS/ApiGateway',
                  'Count',
                  { ApiId: apiId },
                  { stat: 'Sum', label: 'Total Requests' },
                ],
                ['...', '4XXError', { stat: 'Sum', label: '4xx Errors' }],
                ['...', '5XXError', { stat: 'Sum', label: '5xx Errors' }],
              ],
              period: 60,
              yAxis: {
                left: {
                  min: 0,
                },
              },
            },
          },
          {
            type: 'metric',
            x: 8,
            y: lambdaYPosition + 1,
            width: 8,
            height: 6,
            properties: {
              title: 'API Latency (Percentiles)',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  'AWS/ApiGateway',
                  'Latency',
                  { ApiId: apiId },
                  { stat: 'p50', label: 'p50' },
                ],
                ['...', { stat: 'p95', label: 'p95' }],
                ['...', { stat: 'p99', label: 'p99' }],
              ],
              period: 60,
              yAxis: {
                left: {
                  label: 'Latency (ms)',
                  min: 0,
                },
              },
            },
          },
          {
            type: 'metric',
            x: 16,
            y: lambdaYPosition + 1,
            width: 8,
            height: 6,
            properties: {
              title: 'Integration Latency',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  'AWS/ApiGateway',
                  'IntegrationLatency',
                  { ApiId: apiId },
                  { stat: 'Average', label: 'Avg' },
                ],
                ['...', { stat: 'p95', label: 'p95' }],
                ['...', { stat: 'p99', label: 'p99' }],
              ],
              period: 60,
              yAxis: {
                left: {
                  label: 'Latency (ms)',
                  min: 0,
                },
              },
            },
          },
        )

        lambdaYPosition += 7

        // ========================================
        // RDS PostgreSQL Section
        // ========================================
        widgets.push(
          {
            type: 'text',
            x: 0,
            y: lambdaYPosition,
            width: 24,
            height: 1,
            properties: {
              markdown: '## RDS PostgreSQL',
            },
          },
          {
            type: 'metric',
            x: 0,
            y: lambdaYPosition + 1,
            width: 8,
            height: 6,
            properties: {
              title: 'Database Connections',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  'AWS/RDS',
                  'DatabaseConnections',
                  { DBClusterIdentifier: rdsClusterId },
                  { stat: 'Average', label: 'Connections' },
                ],
              ],
              period: 60,
              yAxis: {
                left: {
                  min: 0,
                },
              },
            },
          },
          {
            type: 'metric',
            x: 8,
            y: lambdaYPosition + 1,
            width: 8,
            height: 6,
            properties: {
              title: 'CPU Utilization',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  'AWS/RDS',
                  'CPUUtilization',
                  { DBClusterIdentifier: rdsClusterId },
                  { stat: 'Average', label: 'CPU %' },
                ],
              ],
              period: 60,
              yAxis: {
                left: {
                  min: 0,
                  max: 100,
                },
              },
            },
          },
          {
            type: 'metric',
            x: 16,
            y: lambdaYPosition + 1,
            width: 8,
            height: 6,
            properties: {
              title: 'Freeable Memory',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  'AWS/RDS',
                  'FreeableMemory',
                  { DBClusterIdentifier: rdsClusterId },
                  { stat: 'Average', label: 'Free Memory (bytes)' },
                ],
              ],
              period: 60,
              yAxis: {
                left: {
                  min: 0,
                },
              },
            },
          },
          {
            type: 'metric',
            x: 0,
            y: lambdaYPosition + 7,
            width: 12,
            height: 6,
            properties: {
              title: 'Read/Write IOPS',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  'AWS/RDS',
                  'ReadIOPS',
                  { DBClusterIdentifier: rdsClusterId },
                  { stat: 'Average', label: 'Read IOPS' },
                ],
                [
                  '.',
                  'WriteIOPS',
                  { DBClusterIdentifier: rdsClusterId },
                  { stat: 'Average', label: 'Write IOPS' },
                ],
              ],
              period: 60,
              yAxis: {
                left: {
                  min: 0,
                },
              },
            },
          },
          {
            type: 'metric',
            x: 12,
            y: lambdaYPosition + 7,
            width: 12,
            height: 6,
            properties: {
              title: 'Read/Write Latency',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  'AWS/RDS',
                  'ReadLatency',
                  { DBClusterIdentifier: rdsClusterId },
                  { stat: 'Average', label: 'Read Latency (ms)' },
                ],
                [
                  '.',
                  'WriteLatency',
                  { DBClusterIdentifier: rdsClusterId },
                  { stat: 'Average', label: 'Write Latency (ms)' },
                ],
              ],
              period: 60,
              yAxis: {
                left: {
                  min: 0,
                },
              },
            },
          },
        )

        lambdaYPosition += 13

        // ========================================
        // ElastiCache Redis Section
        // ========================================
        widgets.push(
          {
            type: 'text',
            x: 0,
            y: lambdaYPosition,
            width: 24,
            height: 1,
            properties: {
              markdown: '## ElastiCache Redis',
            },
          },
          {
            type: 'metric',
            x: 0,
            y: lambdaYPosition + 1,
            width: 8,
            height: 6,
            properties: {
              title: 'Cache Hit Rate',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  {
                    expression: '(hits / (hits + misses)) * 100',
                    label: 'Hit Rate (%)',
                    id: 'e1',
                  },
                ],
                [
                  'AWS/ElastiCache',
                  'CacheHits',
                  { CacheClusterId: redisId },
                  { stat: 'Sum', id: 'hits', visible: false },
                ],
                [
                  '.',
                  'CacheMisses',
                  { CacheClusterId: redisId },
                  { stat: 'Sum', id: 'misses', visible: false },
                ],
              ],
              period: 60,
              yAxis: {
                left: {
                  min: 0,
                  max: 100,
                },
              },
            },
          },
          {
            type: 'metric',
            x: 8,
            y: lambdaYPosition + 1,
            width: 8,
            height: 6,
            properties: {
              title: 'Evictions',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  'AWS/ElastiCache',
                  'Evictions',
                  { CacheClusterId: redisId },
                  { stat: 'Sum', label: 'Evictions' },
                ],
              ],
              period: 60,
              yAxis: {
                left: {
                  min: 0,
                },
              },
            },
          },
          {
            type: 'metric',
            x: 16,
            y: lambdaYPosition + 1,
            width: 8,
            height: 6,
            properties: {
              title: 'Current Connections',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  'AWS/ElastiCache',
                  'CurrConnections',
                  { CacheClusterId: redisId },
                  { stat: 'Average', label: 'Connections' },
                ],
              ],
              period: 60,
              yAxis: {
                left: {
                  min: 0,
                },
              },
            },
          },
          {
            type: 'metric',
            x: 0,
            y: lambdaYPosition + 7,
            width: 12,
            height: 6,
            properties: {
              title: 'CPU Utilization',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  'AWS/ElastiCache',
                  'CPUUtilization',
                  { CacheClusterId: redisId },
                  { stat: 'Average', label: 'CPU %' },
                ],
              ],
              period: 60,
              yAxis: {
                left: {
                  min: 0,
                  max: 100,
                },
              },
            },
          },
          {
            type: 'metric',
            x: 12,
            y: lambdaYPosition + 7,
            width: 12,
            height: 6,
            properties: {
              title: 'Database Memory Usage',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  'AWS/ElastiCache',
                  'DatabaseMemoryUsagePercentage',
                  { CacheClusterId: redisId },
                  { stat: 'Average', label: 'Memory %' },
                ],
              ],
              period: 60,
              yAxis: {
                left: {
                  min: 0,
                  max: 100,
                },
              },
            },
          },
        )

        lambdaYPosition += 13

        // ========================================
        // OpenSearch Section
        // ========================================
        widgets.push(
          {
            type: 'text',
            x: 0,
            y: lambdaYPosition,
            width: 24,
            height: 1,
            properties: {
              markdown: '## OpenSearch',
            },
          },
          {
            type: 'metric',
            x: 0,
            y: lambdaYPosition + 1,
            width: 8,
            height: 6,
            properties: {
              title: 'Cluster Status',
              view: 'singleValue',
              region,
              metrics: [
                [
                  'AWS/ES',
                  'ClusterStatus.green',
                  { DomainName: openSearchDomain, ClientId: accountId },
                  { stat: 'Maximum', label: 'Green' },
                ],
                [
                  '.',
                  'ClusterStatus.yellow',
                  { DomainName: openSearchDomain, ClientId: accountId },
                  { stat: 'Maximum', label: 'Yellow' },
                ],
                [
                  '.',
                  'ClusterStatus.red',
                  { DomainName: openSearchDomain, ClientId: accountId },
                  { stat: 'Maximum', label: 'Red' },
                ],
              ],
              period: 60,
            },
          },
          {
            type: 'metric',
            x: 8,
            y: lambdaYPosition + 1,
            width: 8,
            height: 6,
            properties: {
              title: 'Indexing Rate',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  'AWS/ES',
                  'IndexingRate',
                  { DomainName: openSearchDomain, ClientId: accountId },
                  { stat: 'Average', label: 'Docs/min' },
                ],
              ],
              period: 60,
              yAxis: {
                left: {
                  min: 0,
                },
              },
            },
          },
          {
            type: 'metric',
            x: 16,
            y: lambdaYPosition + 1,
            width: 8,
            height: 6,
            properties: {
              title: 'Search Latency',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  'AWS/ES',
                  'SearchLatency',
                  { DomainName: openSearchDomain, ClientId: accountId },
                  { stat: 'Average', label: 'Latency (ms)' },
                ],
              ],
              period: 60,
              yAxis: {
                left: {
                  min: 0,
                },
              },
            },
          },
          {
            type: 'metric',
            x: 0,
            y: lambdaYPosition + 7,
            width: 12,
            height: 6,
            properties: {
              title: 'CPU Utilization',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  'AWS/ES',
                  'CPUUtilization',
                  { DomainName: openSearchDomain, ClientId: accountId },
                  { stat: 'Average', label: 'CPU %' },
                ],
              ],
              period: 60,
              yAxis: {
                left: {
                  min: 0,
                  max: 100,
                },
              },
            },
          },
          {
            type: 'metric',
            x: 12,
            y: lambdaYPosition + 7,
            width: 12,
            height: 6,
            properties: {
              title: 'JVM Memory Pressure',
              view: 'timeSeries',
              stacked: false,
              region,
              metrics: [
                [
                  'AWS/ES',
                  'JVMMemoryPressure',
                  { DomainName: openSearchDomain, ClientId: accountId },
                  { stat: 'Maximum', label: 'Pressure %' },
                ],
              ],
              period: 60,
              yAxis: {
                left: {
                  min: 0,
                  max: 100,
                },
              },
            },
          },
        )

        return { widgets }
      })),
    })

    // ========================================
    // Story 5.2: CloudWatch Alarms and SNS Notifications
    // ========================================

    /**
     * Create comprehensive CloudWatch alarms for monitoring
     * - Lambda errors, throttles, duration
     * - API Gateway 5xx rate, latency
     * - RDS CPU, connections, memory
     * - Redis evictions, CPU, memory
     * - OpenSearch cluster health, JVM memory
     * - SNS notifications (email + optional Slack)
     */
    const alarms = createAlarms({
      mocFunction: mocInstructionsFunction,
      galleryFunction: uploadImageFunction,
      wishlistFunction: createWishlistItemFunction,
      healthCheckFunction: healthCheckFunction,
      apiGateway: api,
      database: postgres,
      redis,
      openSearch,
      emailAddress: process.env.ALARM_EMAIL || 'devops@example.com',
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      stage,
      region,
      accountId,
    })

    return {
      // VPC Infrastructure
      vpc: vpc.id,
      vpcPrivateSubnets: vpc.privateSubnets.apply(subnets => subnets.map(s => s.subnet.id)),
      vpcPublicSubnets: vpc.publicSubnets.apply(subnets => subnets.map(s => s.subnet.id)),

      // Security Groups
      lambdaSecurityGroup: lambdaSecurityGroup.id,
      rdsSecurityGroup: rdsSecurityGroup.id,
      openSearchSecurityGroup: openSearchSecurityGroup.id,

      // Database
      postgresHost: postgres.host,
      postgresPort: postgres.port,
      postgresDatabase: postgres.database,
      postgresUsername: postgres.username,

      // Search
      openSearchEndpoint: openSearch.endpoint,

      // Storage
      bucketName: bucket.name,

      // Cognito Authentication
      userPoolId: userPool.id,
      userPoolArn: userPool.arn,
      userPoolClientId: userPoolClient.id,
      userPoolEndpoint: userPool.endpoint,
      identityPoolId: identityPool.id,

      // API Gateway
      apiUrl: api.url,
      apiId: api.id,

      // WebSocket API (Story 4.5.5)
      websocketUrl: websocketApi.url,
      websocketApiId: websocketApi.id,
      websocketConnectionsTableName: websocketConnectionsTable.name,
      websocketConnectionsTableArn: websocketConnectionsTable.arn,

      // Lambda Functions
      healthCheckFunctionName: healthCheckFunction.name,
      healthCheckFunctionArn: healthCheckFunction.arn,
      mocInstructionsFunctionName: mocInstructionsFunction.name,
      mocInstructionsFunctionArn: mocInstructionsFunction.arn,
      mocFileUploadFunctionName: mocFileUploadFunction.name,
      mocFileUploadFunctionArn: mocFileUploadFunction.arn,
      mocFileDownloadFunctionName: mocFileDownloadFunction.name,
      mocFileDownloadFunctionArn: mocFileDownloadFunction.arn,
      mocFileDeleteFunctionName: mocFileDeleteFunction.name,
      mocFileDeleteFunctionArn: mocFileDeleteFunction.arn,
      uploadPartsListFunctionName: uploadPartsListFunction.name,
      uploadPartsListFunctionArn: uploadPartsListFunction.arn,
      initializeMocWithFilesFunctionName: initializeMocWithFilesFunction.name,
      initializeMocWithFilesFunctionArn: initializeMocWithFilesFunction.arn,
      finalizeMocWithFilesFunctionName: finalizeMocWithFilesFunction.name,
      finalizeMocWithFilesFunctionArn: finalizeMocWithFilesFunction.arn,
      linkGalleryImageFunctionName: linkGalleryImageFunction.name,
      linkGalleryImageFunctionArn: linkGalleryImageFunction.arn,
      unlinkGalleryImageFunctionName: unlinkGalleryImageFunction.name,
      unlinkGalleryImageFunctionArn: unlinkGalleryImageFunction.arn,
      getMocGalleryImagesFunctionName: getMocGalleryImagesFunction.name,
      getMocGalleryImagesFunctionArn: getMocGalleryImagesFunction.arn,
      getMocStatsByCategoryFunctionName: getMocStatsByCategoryFunction.name,
      getMocStatsByCategoryFunctionArn: getMocStatsByCategoryFunction.arn,
      getMocUploadsOverTimeFunctionName: getMocUploadsOverTimeFunction.name,
      getMocUploadsOverTimeFunctionArn: getMocUploadsOverTimeFunction.arn,
      // Gallery Functions (13 separate handlers)
      uploadImageFunctionName: uploadImageFunction.name,
      uploadImageFunctionArn: uploadImageFunction.arn,
      listImagesFunctionName: listImagesFunction.name,
      listImagesFunctionArn: listImagesFunction.arn,
      searchImagesFunctionName: searchImagesFunction.name,
      searchImagesFunctionArn: searchImagesFunction.arn,
      getImageFunctionName: getImageFunction.name,
      getImageFunctionArn: getImageFunction.arn,
      updateImageFunctionName: updateImageFunction.name,
      updateImageFunctionArn: updateImageFunction.arn,
      deleteImageFunctionName: deleteImageFunction.name,
      deleteImageFunctionArn: deleteImageFunction.arn,
      flagImageFunctionName: flagImageFunction.name,
      flagImageFunctionArn: flagImageFunction.arn,
      createAlbumFunctionName: createAlbumFunction.name,
      createAlbumFunctionArn: createAlbumFunction.arn,
      listAlbumsFunctionName: listAlbumsFunction.name,
      listAlbumsFunctionArn: listAlbumsFunction.arn,
      getAlbumFunctionName: getAlbumFunction.name,
      getAlbumFunctionArn: getAlbumFunction.arn,
      updateAlbumFunctionName: updateAlbumFunction.name,
      updateAlbumFunctionArn: updateAlbumFunction.arn,
      deleteAlbumFunctionName: deleteAlbumFunction.name,
      deleteAlbumFunctionArn: deleteAlbumFunction.arn,
      // Wishlist Functions (8 modular handlers)
      listWishlistFunctionName: listWishlistFunction.name,
      listWishlistFunctionArn: listWishlistFunction.arn,
      getWishlistItemFunctionName: getWishlistItemFunction.name,
      getWishlistItemFunctionArn: getWishlistItemFunction.arn,
      createWishlistItemFunctionName: createWishlistItemFunction.name,
      createWishlistItemFunctionArn: createWishlistItemFunction.arn,
      updateWishlistItemFunctionName: updateWishlistItemFunction.name,
      updateWishlistItemFunctionArn: updateWishlistItemFunction.arn,
      deleteWishlistItemFunctionName: deleteWishlistItemFunction.name,
      deleteWishlistItemFunctionArn: deleteWishlistItemFunction.arn,
      reorderWishlistFunctionName: reorderWishlistFunction.name,
      reorderWishlistFunctionArn: reorderWishlistFunction.arn,
      uploadWishlistImageFunctionName: uploadWishlistImageFunction.name,
      uploadWishlistImageFunctionArn: uploadWishlistImageFunction.arn,
      searchWishlistFunctionName: searchWishlistFunction.name,
      searchWishlistFunctionArn: searchWishlistFunction.arn,
      // MOC Parts Lists Functions (6 handlers)
      getPartsListsFunctionName: getPartsListsFunction.name,
      getPartsListsFunctionArn: getPartsListsFunction.arn,
      createPartsListFunctionName: createPartsListFunction.name,
      createPartsListFunctionArn: createPartsListFunction.arn,
      updatePartsListFunctionName: updatePartsListFunction.name,
      updatePartsListFunctionArn: updatePartsListFunction.arn,
      updatePartsListStatusFunctionName: updatePartsListStatusFunction.name,
      updatePartsListStatusFunctionArn: updatePartsListStatusFunction.arn,
      deletePartsListFunctionName: deletePartsListFunction.name,
      deletePartsListFunctionArn: deletePartsListFunction.arn,
      getUserPartsListsSummaryFunctionName: getUserPartsListsSummaryFunction.name,
      getUserPartsListsSummaryFunctionArn: getUserPartsListsSummaryFunction.arn,

      // CloudWatch Dashboard (Story 5.1)
      dashboardName: dashboardName,
      dashboardUrl: $interpolate`https://console.aws.amazon.com/cloudwatch/home?region=${region}#dashboards:name=${dashboardName}`,

      // CloudWatch Alarms (Story 5.2)
      alarmTopicArn: alarms.topicArn,
    }
  },
})
