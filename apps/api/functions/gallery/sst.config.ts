/// <reference path="./.sst/platform/config.d.ts" />

/**
 * Gallery Functions Stack
 *
 * Contains all gallery-related Lambda functions:
 * - Upload images
 * - List images
 * - Delete images
 * - Search images
 */

export default $config({
  app(input) {
    return {
      name: 'lego-gallery-functions',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: input?.stage === 'production',
      home: 'aws',
      tags: {
        Project: 'lego-monorepo',
        Environment: input?.stage || 'development',
        ManagedBy: 'SST',
        Component: 'gallery-functions',
        CostCenter: 'Engineering',
        Owner: 'engineering@bricklink.com',
      },
    }
  },
  async run() {
    const stage = $app.stage

    // Reference shared infrastructure (cross-stack references)
    // Note: In practice, you'd get these from SST's resource linking or environment variables

    // Create gallery functions
    const uploadImageFunction = new sst.aws.Function('GalleryUploadImage', {
      handler: '../../src/endpoints/gallery/upload-image/handler.handler',
      runtime: 'nodejs20.x',
      timeout: '30 seconds',
      memory: '512 MB',
      environment: {
        STAGE: stage,
        NODE_ENV: 'production',
      },
      link: [], // Will link to shared resources
    })

    const listImagesFunction = new sst.aws.Function('GalleryListImages', {
      handler: '../../src/endpoints/gallery/list-images/handler.handler',
      runtime: 'nodejs20.x',
      timeout: '30 seconds',
      memory: '256 MB',
      environment: {
        STAGE: stage,
        NODE_ENV: 'production',
      },
      link: [], // Will link to shared resources
    })

    const deleteImageFunction = new sst.aws.Function('GalleryDeleteImage', {
      handler: '../../src/endpoints/gallery/delete-image/handler.handler',
      runtime: 'nodejs20.x',
      timeout: '30 seconds',
      memory: '256 MB',
      environment: {
        STAGE: stage,
        NODE_ENV: 'production',
      },
      link: [], // Will link to shared resources
    })

    const searchImagesFunction = new sst.aws.Function('GallerySearchImages', {
      handler: '../../src/endpoints/gallery/search-images/handler.handler',
      runtime: 'nodejs20.x',
      timeout: '30 seconds',
      memory: '256 MB',
      environment: {
        STAGE: stage,
        NODE_ENV: 'production',
      },
      link: [], // Will link to shared resources
    })

    return {
      functions: {
        uploadImage: uploadImageFunction.arn,
        listImages: listImagesFunction.arn,
        deleteImage: deleteImageFunction.arn,
        searchImages: searchImagesFunction.arn,
      },
      stage,
      message: `📸 Gallery functions deployed to ${stage}`,
    }
  },
})
