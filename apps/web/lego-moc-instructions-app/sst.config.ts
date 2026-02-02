/// <reference path="./.sst/platform/config.d.ts" />

/**
 * SST v3 Configuration for Frontend Application
 *
 * This can be deployed standalone or imported as a substack
 * into the main API configuration for unified deployment.
 */

import { createFrontendStack } from './infrastructure/frontend-stack'

export default $config({
  app(input) {
    return {
      name: 'lego-moc-frontend',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
      tags: {
        Project: 'lego-moc-instructions',
        Environment: input?.stage || 'development',
        ManagedBy: 'SST',
        Component: 'frontend',
        CostCenter: 'Engineering',
        Owner: 'engineering@bricklink.com',
      },
    }
  },
  async run() {
    const stage = $app.stage

    // Create the frontend stack
    const frontend = createFrontendStack(stage)

    return {
      url: frontend.url,
      domain: frontend.domain,
      bucketName: frontend.bucketName,
      distributionId: frontend.distributionId,
    }
  },
})
