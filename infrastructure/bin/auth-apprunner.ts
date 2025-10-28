#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AuthServiceAppRunnerStack } from '../lib/auth-service-apprunner-stack';

const app = new cdk.App();

const stage = app.node.tryGetContext('stage') || 'dev';

new AuthServiceAppRunnerStack(app, `AuthServiceAppRunnerStack${stage.charAt(0).toUpperCase() + stage.slice(1)}`, {
  stage,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  // GitHub connection ARN will be created during first deployment
  githubConnectionArn: undefined,
});
