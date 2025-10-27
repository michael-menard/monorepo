#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import {FrontendStack} from '../lib/frontend-stack'

const app = new cdk.App()

const environment = process.env.ENVIRONMENT || 'staging'

new FrontendStack(
  app,
  `FrontendStack${environment.charAt(0).toUpperCase() + environment.slice(1)}`,
  {
    environment: environment as 'staging' | 'production',
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    tags: {
      Environment: environment,
      Project: 'lego-moc-instructions',
      Component: 'frontend',
    },
  },
)
