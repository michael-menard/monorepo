/**
 * Frontend Infrastructure Stack
 * 
 * Creates S3 + CloudFront static site hosting with:
 * - Environment-specific domains
 * - SPA routing support (404/403 -> index.html)
 * - Build-time environment variable injection
 * - CDN optimization based on stage
 */

interface FrontendConfig {
  domainName?: string
  apiUrl: string
  authApiUrl: string
  websocketUrl?: string
}

export function createFrontendStack(stage: string) {
  // Simple single environment configuration
  const config: FrontendConfig = {
    domainName: undefined, // Use CloudFront default domain (no custom domain needed)
    apiUrl: 'http://localhost:9000', // Connect to local API for now
    authApiUrl: 'http://localhost:9300', // Connect to local auth for now
    websocketUrl: 'ws://localhost:9000', // Connect to local websocket for now
  }

  /**
   * Static Site with S3 + CloudFront
   * - Vite build output from dist/ directory
   * - Custom domain for staging/production
   * - Environment variables injected at build time
   * - SPA routing support with custom error responses
   */
  const site = new sst.aws.StaticSite('Frontend', {
    path: '.',
    build: {
      command: 'pnpm build',
      output: 'dist',
    },
    domain: config.domainName ? {
      name: config.domainName,
      redirects: stage === 'production' ? [`www.${config.domainName}`] : undefined,
    } : undefined,
    environment: {
      VITE_ENVIRONMENT: stage,
      VITE_API_BASE_URL: config.apiUrl,
      VITE_AUTH_API_URL: config.authApiUrl,
      VITE_WS_URL: config.websocketUrl,
      VITE_USE_AWS_SERVICES: 'true',
      NODE_ENV: 'production',
    },
    transform: {
      distribution: (args) => {
        // Custom error pages for SPA routing
        args.customErrorResponses = [
          {
            errorCode: 404,
            responseCode: 200,
            responsePagePath: '/index.html',
            errorCachingMinTtl: 300,
          },
          {
            errorCode: 403,
            responseCode: 200, 
            responsePagePath: '/index.html',
            errorCachingMinTtl: 300,
          },
        ]
        
        // Price class based on environment
        args.priceClass = stage === 'production' 
          ? 'PriceClass_All' 
          : 'PriceClass_100'

        // Cache behaviors for different file types
        args.cacheBehaviors = [
          {
            pathPattern: '/static/*',
            targetOriginId: args.origins?.[0]?.originId || 'default',
            viewerProtocolPolicy: 'redirect-to-https',
            cachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad', // CachingOptimized
            compress: true,
          },
          {
            pathPattern: '*.js',
            targetOriginId: args.origins?.[0]?.originId || 'default',
            viewerProtocolPolicy: 'redirect-to-https',
            cachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad', // CachingOptimized
            compress: true,
          },
          {
            pathPattern: '*.css',
            targetOriginId: args.origins?.[0]?.originId || 'default',
            viewerProtocolPolicy: 'redirect-to-https',
            cachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad', // CachingOptimized
            compress: true,
          },
        ]
      },
      bucket: (args) => {
        args.tags = {
          Environment: stage,
          Project: 'lego-moc-instructions',
          Component: 'frontend-storage',
          ManagedBy: 'SST',
        }
      },
    },
  })

  return {
    url: site.url,
    domain: config.domainName,
    bucketName: site.bucket,
    distributionId: site.distribution,
    config,
  }
}
