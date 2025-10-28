import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as docdb from 'aws-cdk-lib/aws-docdb'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from 'constructs'
// import { EnvironmentConfig } from '../environments/config'

export interface DatabaseStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'production'
  vpc: ec2.Vpc
}

export class DatabaseStack extends cdk.Stack {
  public readonly documentDb: docdb.DatabaseCluster
  public readonly rdsPostgres: rds.DatabaseInstance
  public readonly documentDbSecret: secretsmanager.Secret
  public readonly rdsSecret: secretsmanager.Secret

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props)

    const { environment, vpc } = props
    
    // Import environment config
    const config = this.getEnvironmentConfig(environment)

    // Import security group
    const dbSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'DatabaseSecurityGroup',
      cdk.Fn.importValue(`${this.node.id.replace('-Database', '-Vpc')}-DatabaseSecurityGroupId`)
    )

    // Create database subnet group
    const dbSubnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      vpc,
      description: 'Subnet group for databases',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    })

    // Create DocumentDB subnet group
    const docDbSubnetGroup = new docdb.SubnetGroup(this, 'DocumentDbSubnetGroup', {
      vpc,
      description: 'Subnet group for DocumentDB',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    })

    // Create secrets for database credentials
    this.documentDbSecret = new secretsmanager.Secret(this, 'DocumentDbSecret', {
      description: 'DocumentDB credentials for Auth Service',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\\'',
      },
    })

    this.rdsSecret = new secretsmanager.Secret(this, 'RdsSecret', {
      description: 'RDS PostgreSQL credentials for LEGO Projects API',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\\'',
      },
    })

    // Create DocumentDB cluster (MongoDB-compatible)
    this.documentDb = new docdb.DatabaseCluster(this, 'DocumentDbCluster', {
      masterUser: {
        username: 'admin',
        password: this.documentDbSecret.secretValueFromJson('password'),
      },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MEDIUM
      ),
      instances: config.database.documentDb.instanceCount,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroup: dbSecurityGroup,
      subnetGroup: docDbSubnetGroup,
      
      // Backup configuration
      backupRetention: cdk.Duration.days(config.database.documentDb.backupRetentionDays),
      preferredBackupWindow: '03:00-04:00',
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      
      // Security
      storageEncrypted: true,
      
      // Deletion protection for production
      deletionProtection: environment === 'production',
      
      // CloudWatch logs
      cloudwatchLogsExports: ['audit'],
      cloudwatchLogsRetention: cdk.aws_logs.RetentionDays.ONE_MONTH,
    })

    // Create RDS PostgreSQL instance
    this.rdsPostgres = new rds.DatabaseInstance(this, 'PostgresInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      subnetGroup: dbSubnetGroup,
      
      // Database configuration
      databaseName: 'lego_projects',
      credentials: rds.Credentials.fromSecret(this.rdsSecret),
      
      // Storage
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageType: rds.StorageType.GP3,
      storageEncrypted: config.database.rds.storageEncrypted,
      
      // Backup configuration
      backupRetention: cdk.Duration.days(config.database.rds.backupRetentionDays),
      preferredBackupWindow: '03:00-04:00',
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      
      // Multi-AZ for high availability
      multiAz: config.database.rds.multiAz,
      
      // Deletion protection for production
      deletionProtection: environment === 'production',
      
      // Performance Insights
      enablePerformanceInsights: environment !== 'dev',
      performanceInsightRetention: environment === 'production' 
        ? rds.PerformanceInsightRetention.LONG_TERM 
        : rds.PerformanceInsightRetention.DEFAULT,
      
      // CloudWatch logs
      cloudwatchLogsExports: ['postgresql'],
      cloudwatchLogsRetention: cdk.aws_logs.RetentionDays.ONE_MONTH,
      
      // Monitoring
      monitoringInterval: environment === 'dev' ? undefined : cdk.Duration.seconds(60),
    })

    // Create read replica for production
    if (environment === 'production') {
      new rds.DatabaseInstanceReadReplica(this, 'PostgresReadReplica', {
        sourceDatabaseInstance: this.rdsPostgres,
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.T3,
          ec2.InstanceSize.MICRO
        ),
        vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        securityGroups: [dbSecurityGroup],
        
        // Performance Insights
        enablePerformanceInsights: true,
        performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
      })
    }

    // Output connection information
    new cdk.CfnOutput(this, 'DocumentDbEndpoint', {
      value: this.documentDb.clusterEndpoint.socketAddress,
      description: 'DocumentDB cluster endpoint',
    })

    new cdk.CfnOutput(this, 'DocumentDbSecretArn', {
      value: this.documentDbSecret.secretArn,
      description: 'DocumentDB credentials secret ARN',
    })

    new cdk.CfnOutput(this, 'RdsEndpoint', {
      value: this.rdsPostgres.instanceEndpoint.socketAddress,
      description: 'RDS PostgreSQL endpoint',
    })

    new cdk.CfnOutput(this, 'RdsSecretArn', {
      value: this.rdsSecret.secretArn,
      description: 'RDS credentials secret ARN',
    })
  }

  private getEnvironmentConfig(environment: string) {
    // This is a simplified version - in practice, import from config
    const configs = {
      dev: {
        documentDb: { instanceCount: 1, backupRetentionDays: 7 },
        rds: { multiAz: false, backupRetentionDays: 7, storageEncrypted: true },
      },
      staging: {
        documentDb: { instanceCount: 2, backupRetentionDays: 14 },
        rds: { multiAz: true, backupRetentionDays: 14, storageEncrypted: true },
      },
      production: {
        documentDb: { instanceCount: 3, backupRetentionDays: 35 },
        rds: { multiAz: true, backupRetentionDays: 35, storageEncrypted: true },
      },
    }
    return configs[environment as keyof typeof configs]
  }
}
