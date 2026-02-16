#!/usr/bin/env tsx
/**
 * MinIO Smoke Test Script
 *
 * Tests S3 client operations against local MinIO instance.
 *
 * Usage:
 *   pnpm tsx packages/backend/s3-client/scripts/test-minio.ts
 *
 * Prerequisites:
 *   - MinIO running: docker compose -f infra/compose.lego-app.yaml up -d minio
 *   - Environment variables set (see .env.example)
 */

import { config } from 'dotenv'
import { uploadToS3, deleteFromS3, initializeBucket, getS3Client } from '../src/index'
import { GetObjectCommand } from '@aws-sdk/client-s3'

// Load environment variables from .env file
config()

const BUCKET_NAME = 'workflow-artifacts'
const TEST_KEY = 'smoke-test/test-artifact.txt'
const TEST_CONTENT = 'Hello from MinIO smoke test!'

async function runSmokeTest() {
  console.log('MinIO Smoke Test')
  console.log('='.repeat(50))
  console.log('')

  let testsPassed = 0
  let testsFailed = 0

  try {
    // Test 1: Initialize bucket (idempotent)
    console.log('Test 1: Initialize bucket...')
    try {
      await initializeBucket(BUCKET_NAME)
      console.log(`✓ Bucket '${BUCKET_NAME}' initialized successfully`)
      testsPassed++
    } catch (error: any) {
      console.error(`✗ Bucket initialization failed: ${error.message}`)
      testsFailed++
      throw error // Stop if bucket init fails
    }

    // Test 2: Upload file
    console.log('\nTest 2: Upload file...')
    try {
      const testBuffer = Buffer.from(TEST_CONTENT, 'utf-8')
      const url = await uploadToS3({
        key: TEST_KEY,
        body: testBuffer,
        contentType: 'text/plain',
        bucket: BUCKET_NAME,
      })
      console.log(`✓ Uploaded to: ${url}`)
      testsPassed++
    } catch (error: any) {
      console.error(`✗ Upload failed: ${error.message}`)
      testsFailed++
    }

    // Test 3: Download file
    console.log('\nTest 3: Download file...')
    try {
      const s3 = getS3Client()
      const response = await s3.send(
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: TEST_KEY,
        }),
      )

      const downloadedContent = await response.Body?.transformToString('utf-8')

      if (downloadedContent === TEST_CONTENT) {
        console.log('✓ Downloaded content matches uploaded content')
        testsPassed++
      } else {
        console.error('✗ Content mismatch!')
        console.error(`  Expected: "${TEST_CONTENT}"`)
        console.error(`  Got: "${downloadedContent}"`)
        testsFailed++
      }
    } catch (error: any) {
      console.error(`✗ Download failed: ${error.message}`)
      testsFailed++
    }

    // Test 4: Delete file
    console.log('\nTest 4: Delete file...')
    try {
      await deleteFromS3({
        key: TEST_KEY,
        bucket: BUCKET_NAME,
      })
      console.log('✓ File deleted successfully')
      testsPassed++
    } catch (error: any) {
      console.error(`✗ Delete failed: ${error.message}`)
      testsFailed++
    }

    // Test 5: Verify deletion
    console.log('\nTest 5: Verify deletion...')
    try {
      const s3 = getS3Client()
      await s3.send(
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: TEST_KEY,
        }),
      )
      console.error('✗ File still exists after deletion')
      testsFailed++
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        console.log('✓ File successfully deleted (not found)')
        testsPassed++
      } else {
        console.error(`✗ Unexpected error: ${error.message}`)
        testsFailed++
      }
    }

    // Summary
    console.log('')
    console.log('='.repeat(50))
    console.log('Test Summary')
    console.log('='.repeat(50))
    console.log(`Passed: ${testsPassed}`)
    console.log(`Failed: ${testsFailed}`)
    console.log(`Total:  ${testsPassed + testsFailed}`)
    console.log('')

    if (testsFailed === 0) {
      console.log('✓ All tests passed!')
      process.exit(0)
    } else {
      console.error('✗ Some tests failed')
      process.exit(1)
    }
  } catch (error: any) {
    console.error('')
    console.error('Fatal error:', error.message)
    console.error('')
    console.error('Make sure MinIO is running:')
    console.error('  docker compose -f infra/compose.lego-app.yaml up -d minio')
    console.error('')
    console.error('And environment variables are set (see .env.example)')
    process.exit(1)
  }
}

runSmokeTest()
