import * as cdk from 'aws-cdk-lib'

export interface EnvironmentConfig {
  environment: 'dev' | 'staging' | 'production'
  awsEnv: cdk.Environment
  tags: { [key: string]: string }
  
  // Database configurations
  database: {
    documentDb: {
      instanceClass: string
      instanceCount: number
      multiAz: boolean
      backupRetentionDays: number
    }
    rds: {
      instanceClass: string
      multiAz: boolean
      backupRetentionDays: number
      storageEncrypted: boolean
    }
  }
  
  // Cache configuration
  cache: {
    nodeType: string
    numCacheNodes: number
    multiAz: boolean
  }
  
  // Search configuration
  search: {
    instanceType: string
    instanceCount: number
    multiAz: boolean
    volumeSize: number
  }
  
  // Monitoring configuration
  monitoring: {
    enableDetailedMonitoring: boolean
    retentionDays: number
  }
}

export function getEnvironmentConfig(environment: string): EnvironmentConfig {
  const baseConfig = {
    awsEnv: {
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

  switch (environment) {
    case 'dev':
      return {
        ...baseConfig,
        environment: 'dev',
        database: {
          documentDb: {
            instanceClass: 'db.t3.medium',
            instanceCount: 1,
            multiAz: false,
            backupRetentionDays: 7,
          },
          rds: {
            instanceClass: 'db.t3.micro',
            multiAz: false,
            backupRetentionDays: 7,
            storageEncrypted: true,
          },
        },
        cache: {
          nodeType: 'cache.t3.micro',
          numCacheNodes: 1,
          multiAz: false,
        },
        search: {
          instanceType: 't3.small.search',
          instanceCount: 1,
          multiAz: false,
          volumeSize: 20,
        },
        monitoring: {
          enableDetailedMonitoring: false,
          retentionDays: 7,
        },
      }

    case 'staging':
      return {
        ...baseConfig,
        environment: 'staging',
        database: {
          documentDb: {
            instanceClass: 'db.r5.large',
            instanceCount: 2,
            multiAz: true,
            backupRetentionDays: 14,
          },
          rds: {
            instanceClass: 'db.t3.small',
            multiAz: true,
            backupRetentionDays: 14,
            storageEncrypted: true,
          },
        },
        cache: {
          nodeType: 'cache.t3.small',
          numCacheNodes: 2,
          multiAz: true,
        },
        search: {
          instanceType: 't3.medium.search',
          instanceCount: 2,
          multiAz: true,
          volumeSize: 50,
        },
        monitoring: {
          enableDetailedMonitoring: true,
          retentionDays: 30,
        },
      }

    case 'production':
      return {
        ...baseConfig,
        environment: 'production',
        database: {
          documentDb: {
            instanceClass: 'db.r5.xlarge',
            instanceCount: 3,
            multiAz: true,
            backupRetentionDays: 35,
          },
          rds: {
            instanceClass: 'db.r5.large',
            multiAz: true,
            backupRetentionDays: 35,
            storageEncrypted: true,
          },
        },
        cache: {
          nodeType: 'cache.r6g.large',
          numCacheNodes: 3,
          multiAz: true,
        },
        search: {
          instanceType: 'm6g.large.search',
          instanceCount: 3,
          multiAz: true,
          volumeSize: 100,
        },
        monitoring: {
          enableDetailedMonitoring: true,
          retentionDays: 90,
        },
      }

    default:
      throw new Error(`Unknown environment: ${environment}`)
  }
}
