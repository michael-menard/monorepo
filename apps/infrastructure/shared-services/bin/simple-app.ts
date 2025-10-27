#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { SimpleVpcStack } from '../lib/simple-vpc-stack'
import { SimpleDatabaseStack } from '../lib/simple-database-stack'
import { SimpleCacheStack } from '../lib/simple-cache-stack'
import { SimpleMonitoringStack } from '../lib/simple-monitoring-stack'
// import { SimpleSearchStack } from '../lib/simple-search-stack' // Temporarily disabled

const app = new cdk.App()

// Get environment from context (default to 'dev')
const environment = app.node.tryGetContext('environment') || 'dev'

// Environment-specific stack naming
const stackPrefix = `LegoMoc-${environment}`

const commonProps = {
  env: {
    account: process?.env?.CDK_DEFAULT_ACCOUNT,
    region: process?.env?.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tags: {
    Project: 'LegoMocPlatform',
    Environment: environment,
    ManagedBy: 'CDK',
    Repository: 'monorepo',
  },
}

// 1. VPC Stack (foundation)
const vpcStack = new SimpleVpcStack(app, `${stackPrefix}-Vpc`, {
  ...commonProps,
  environment: environment as 'dev' | 'staging' | 'production',
})

// 2. Database Stack (depends on VPC)
const databaseStack = new SimpleDatabaseStack(app, `${stackPrefix}-Database`, {
  ...commonProps,
  environment: environment as 'dev' | 'staging' | 'production',
  vpcId: vpcStack.vpc.vpcId,
  isolatedSubnetIds: vpcStack.vpc.isolatedSubnets.map(subnet => subnet.subnetId),
})

// 3. Cache Stack (depends on VPC)
const cacheStack = new SimpleCacheStack(app, `${stackPrefix}-Cache`, {
  ...commonProps,
  environment: environment as 'dev' | 'staging' | 'production',
  vpcId: vpcStack.vpc.vpcId,
  privateSubnetIds: vpcStack.vpc.privateSubnets.map(subnet => subnet.subnetId),
})

// 4. Search Stack (depends on VPC) - Temporarily disabled
// const searchStack = new SimpleSearchStack(app, `${stackPrefix}-Search`, {
//   ...commonProps,
//   environment: environment as 'dev' | 'staging' | 'production',
//   vpcId: vpcStack.vpc.vpcId,
//   privateSubnetIds: vpcStack.vpc.privateSubnets.map(subnet => subnet.subnetId),
// })

// 5. Monitoring Stack (can reference other resources)
const monitoringStack = new SimpleMonitoringStack(app, `${stackPrefix}-Monitoring`, {
  ...commonProps,
  environment: environment as 'dev' | 'staging' | 'production',
  // We'll pass the actual resource IDs after deployment
})

// Add dependencies
databaseStack.addDependency(vpcStack)
cacheStack.addDependency(vpcStack)
monitoringStack.addDependency(databaseStack)
monitoringStack.addDependency(cacheStack)
// searchStack.addDependency(vpcStack) // Temporarily disabled

// eslint-disable-next-line no-console
console.log(`✅ Deploying infrastructure for environment: ${environment}`)
// eslint-disable-next-line no-console
console.log(`📋 VPC Stack: ${stackPrefix}-Vpc`)
// eslint-disable-next-line no-console
console.log(`📋 Database Stack: ${stackPrefix}-Database`)
// eslint-disable-next-line no-console
console.log(`📋 Cache Stack: ${stackPrefix}-Cache`)
// eslint-disable-next-line no-console
console.log(`📋 Monitoring Stack: ${stackPrefix}-Monitoring`)
// console.log(`📋 Search Stack: ${stackPrefix}-Search`) // Temporarily disabled
// eslint-disable-next-line no-console
console.log(`🌍 Region: ${process?.env?.CDK_DEFAULT_REGION || 'us-east-1'}`)
// eslint-disable-next-line no-console
console.log(`🏗️ Account: ${process?.env?.CDK_DEFAULT_ACCOUNT || 'default'}`)
