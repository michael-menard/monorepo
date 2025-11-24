#!/usr/bin/env tsx

/**
 * Runtime Configuration Validator
 * Story 1.1: Runtime Configuration Infrastructure Setup
 *
 * This script validates runtime configuration using the Zod schema.
 * Can be used to validate local config files or fetched from S3.
 */

import { safeValidateRuntimeConfig } from '../src/lib/config/runtime-config-schema'

async function fetchConfigFromS3(stage: string): Promise<unknown> {
  const bucketName = `lego-runtime-config-${stage}`
  const configUrl = `https://${bucketName}.s3.amazonaws.com/config.json`

  console.log(`📥 Fetching config from: ${configUrl}`)

  try {
    const response = await fetch(configUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const config = await response.json()
    console.log('✅ Successfully fetched config from S3')
    return config
  } catch (error) {
    console.error('❌ Failed to fetch config from S3:', error)
    throw error
  }
}

function validateConfigData(data: unknown, source: string): void {
  console.log(`\n🔍 Validating configuration from ${source}...`)

  const result = safeValidateRuntimeConfig(data)

  if (result.success) {
    console.log('✅ Configuration is valid!')
    console.log('\n📋 Configuration details:')
    console.log(`   API Base URL: ${result.data.apiBaseUrl}`)
    console.log(`   Use Serverless: ${result.data.useServerless}`)
    console.log(`   Cognito User Pool ID: ${result.data.cognitoConfig.userPoolId}`)
    console.log(`   Cognito Client ID: ${result.data.cognitoConfig.clientId}`)
    console.log(`   Cognito Region: ${result.data.cognitoConfig.region}`)
  } else {
    console.error('❌ Configuration validation failed!')
    console.error('\n🚨 Validation errors:')
    result.error.issues.forEach((issue, index) => {
      console.error(`   ${index + 1}. ${issue.path.join('.')}: ${issue.message}`)
    })
    throw new Error('Configuration validation failed')
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage:')
    console.log('  tsx scripts/validate-runtime-config.ts <stage>')
    console.log('  tsx scripts/validate-runtime-config.ts --file <path>')
    console.log('')
    console.log('Examples:')
    console.log('  tsx scripts/validate-runtime-config.ts dev')
    console.log('  tsx scripts/validate-runtime-config.ts staging')
    console.log('  tsx scripts/validate-runtime-config.ts --file ./config.json')
    process.exit(1)
  }

  try {
    if (args[0] === '--file') {
      // Validate local file
      const filePath = args[1]
      if (!filePath) {
        throw new Error('File path is required when using --file option')
      }

      console.log(`📁 Reading config from file: ${filePath}`)
      const fs = await import('fs/promises')
      const fileContent = await fs.readFile(filePath, 'utf-8')
      const config = JSON.parse(fileContent)

      validateConfigData(config, `file: ${filePath}`)
    } else {
      // Validate S3 config
      const stage = args[0]
      const config = await fetchConfigFromS3(stage)
      validateConfigData(config, `S3 (${stage})`)
    }

    console.log('\n🎉 Configuration validation completed successfully!')
  } catch (error) {
    console.error('\n💥 Validation failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
