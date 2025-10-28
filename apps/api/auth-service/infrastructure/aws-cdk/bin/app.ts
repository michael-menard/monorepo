#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { AuthServiceStack } from '../lib/auth-service-stack'

const app = new cdk.App()

const environment = process.env.ENVIRONMENT || 'dev'

new AuthServiceStack(
  app,
  `AuthServiceStackV2${environment.charAt(0).toUpperCase() + environment.slice(1)}`,
  {
    environment: environment as 'dev' | 'staging' | 'production',
    useSharedInfrastructure: true, // Use shared VPC and infrastructure
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    tags: {
      Environment: environment,
      Project: 'lego-moc-instructions',
      Component: 'auth-service',
    },
  },
)
