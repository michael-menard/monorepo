#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { CognitoAuthStack } from '../lib/cognito-auth-stack'

const app = new cdk.App()

// Get environment from context or default to 'dev'
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev'

// Stack naming
const stackPrefix = `LegoMoc-${environment}`

// Common props for all stacks
const commonProps = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tags: {
    Project: 'LegoMocInstructions',
    Environment: environment,
    Service: 'Auth',
    ManagedBy: 'CDK',
  },
}

// Create Cognito Auth Stack
const cognitoAuthStack = new CognitoAuthStack(app, `${stackPrefix}-CognitoAuth`, {
  ...commonProps,
  stage: environment,
})

// Console output
console.log(`🚀 Deploying Cognito Auth Stack: ${stackPrefix}-CognitoAuth`)
console.log(`📍 Environment: ${environment}`)
console.log(`🌍 Region: ${commonProps.env.region}`)
console.log(`🔐 Account: ${commonProps.env.account}`)

app.synth()
