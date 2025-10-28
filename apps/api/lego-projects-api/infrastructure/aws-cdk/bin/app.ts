#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import {LegoApiStack} from '../lib/lego-api-stack'

const app = new cdk.App()

const environment = process.env.ENVIRONMENT || 'dev'

new LegoApiStack(
  app,
  `LegoApiStack${environment.charAt(0).toUpperCase() + environment.slice(1)}`,
  {
    environment: environment as 'dev' | 'staging' | 'production',
    useSharedInfrastructure: true, // Use shared VPC, RDS, Redis, and monitoring
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    tags: {
      Environment: environment,
      Project: 'lego-moc-instructions',
      Component: 'lego-projects-api',
    },
  },
)
