#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { VpcStack } from '../lib/vpc-stack'
import { DatabaseStack } from '../lib/database-stack'
import { CacheStack } from '../lib/cache-stack'
import { SearchStack } from '../lib/search-stack'
import { MonitoringStack } from '../lib/monitoring-stack'
import { getEnvironmentConfig } from '../environments/config'

const app = new cdk.App()

// Get environment from context (default to 'dev')
const environment = app.node.tryGetContext('environment') || 'dev'
const config = getEnvironmentConfig(environment)

// Environment-specific stack naming
const stackPrefix = `LegoMoc-${config.environment}`

// 1. VPC Stack (foundation)
const vpcStack = new VpcStack(app, `${stackPrefix}-Vpc`, {
  env: config.awsEnv,
  environment: config.environment,
  tags: config.tags,
})

// 2. Database Stack (depends on VPC)
const databaseStack = new DatabaseStack(app, `${stackPrefix}-Database`, {
  env: config.awsEnv,
  environment: config.environment,
  vpc: vpcStack.vpc,
  tags: config.tags,
})

// 3. Cache Stack (depends on VPC)
const cacheStack = new CacheStack(app, `${stackPrefix}-Cache`, {
  env: config.awsEnv,
  environment: config.environment,
  vpc: vpcStack.vpc,
  tags: config.tags,
})

// 4. Search Stack (depends on VPC)
const searchStack = new SearchStack(app, `${stackPrefix}-Search`, {
  env: config.awsEnv,
  environment: config.environment,
  vpc: vpcStack.vpc,
  tags: config.tags,
})

// 5. Monitoring Stack (depends on all other stacks)
const monitoringStack = new MonitoringStack(app, `${stackPrefix}-Monitoring`, {
  env: config.awsEnv,
  environment: config.environment,
  vpc: vpcStack.vpc,
  documentDb: databaseStack.documentDb,
  rdsPostgres: databaseStack.rdsPostgres,
  elastiCache: cacheStack.elastiCache,
  openSearch: searchStack.openSearch,
  tags: config.tags,
})

// Add dependencies
databaseStack.addDependency(vpcStack)
cacheStack.addDependency(vpcStack)
searchStack.addDependency(vpcStack)
monitoringStack.addDependency(databaseStack)
monitoringStack.addDependency(cacheStack)
monitoringStack.addDependency(searchStack)

// Output important values for other stacks to reference
new cdk.CfnOutput(vpcStack, 'VpcId', {
  value: vpcStack.vpc.vpcId,
  exportName: `${stackPrefix}-VpcId`,
})

new cdk.CfnOutput(databaseStack, 'DocumentDbEndpoint', {
  value: databaseStack.documentDb.clusterEndpoint.socketAddress,
  exportName: `${stackPrefix}-DocumentDbEndpoint`,
})

new cdk.CfnOutput(databaseStack, 'RdsEndpoint', {
  value: databaseStack.rdsPostgres.instanceEndpoint.socketAddress,
  exportName: `${stackPrefix}-RdsEndpoint`,
})

new cdk.CfnOutput(cacheStack, 'RedisEndpoint', {
  value: cacheStack.elastiCache.attrRedisEndpointAddress,
  exportName: `${stackPrefix}-RedisEndpoint`,
})

new cdk.CfnOutput(searchStack, 'OpenSearchEndpoint', {
  value: searchStack.openSearch.domainEndpoint,
  exportName: `${stackPrefix}-OpenSearchEndpoint`,
})
