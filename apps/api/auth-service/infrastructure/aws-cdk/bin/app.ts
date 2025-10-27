#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import {AuthServiceStack} from '../lib/auth-service-stack'

const app = new cdk.App()

const environment = process.env.ENVIRONMENT || 'staging'

new AuthServiceStack(
  app,
  `AuthServiceStack${environment.charAt(0).toUpperCase() + environment.slice(1)}`,
  {
    environment: environment as 'staging' | 'production',
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
