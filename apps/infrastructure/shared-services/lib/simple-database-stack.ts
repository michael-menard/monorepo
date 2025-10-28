import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from 'constructs'

export interface SimpleDatabaseStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'production'
  vpcId: string
  isolatedSubnetIds: string[]
}

export class SimpleDatabaseStack extends cdk.Stack {
  public readonly rdsPostgres: rds.DatabaseInstance
  public readonly rdsSecret: secretsmanager.Secret

  constructor(scope: Construct, id: string, props: SimpleDatabaseStackProps) {
    super(scope, id, props)

    const { environment, vpcId, isolatedSubnetIds } = props

    // Import VPC
    const vpc = ec2.Vpc.fromVpcAttributes(this, 'ImportedVpc', {
      vpcId,
      availabilityZones: ['us-east-1a', 'us-east-1b'],
      isolatedSubnetIds,
    })

    // Create database security group
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for RDS PostgreSQL',
      allowAllOutbound: false,
    })

    // Allow inbound connections from private subnets (where applications will run)
    dbSecurityGroup.addIngressRule(
      ec2.Peer.ipv4('10.0.2.0/24'), // Private subnet 1
      ec2.Port.tcp(5432),
      'PostgreSQL access from private subnet 1'
    )
    
    dbSecurityGroup.addIngressRule(
      ec2.Peer.ipv4('10.0.3.0/24'), // Private subnet 2
      ec2.Port.tcp(5432),
      'PostgreSQL access from private subnet 2'
    )

    // Create database subnet group
    const dbSubnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      vpc,
      description: 'Subnet group for RDS PostgreSQL',
      vpcSubnets: {
        subnets: vpc.isolatedSubnets,
      },
    })

    // Create secret for database credentials
    this.rdsSecret = new secretsmanager.Secret(this, 'RdsSecret', {
      description: 'RDS PostgreSQL credentials for LEGO Projects API',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\\'',
      },
    })

    // Environment-specific configuration
    const config = this.getConfig(environment)

    // Create RDS PostgreSQL instance
    this.rdsPostgres = new rds.DatabaseInstance(this, 'PostgresInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        config.instanceSize
      ),
      vpc,
      vpcSubnets: {
        subnets: vpc.isolatedSubnets,
      },
      securityGroups: [dbSecurityGroup],
      subnetGroup: dbSubnetGroup,
      
      // Database configuration
      databaseName: 'lego_projects',
      credentials: rds.Credentials.fromSecret(this.rdsSecret),
      
      // Storage
      allocatedStorage: config.allocatedStorage,
      maxAllocatedStorage: config.maxAllocatedStorage,
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,
      
      // Backup configuration
      backupRetention: cdk.Duration.days(config.backupRetentionDays),
      preferredBackupWindow: '03:00-04:00',
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      
      // Multi-AZ for high availability
      multiAz: config.multiAz,
      
      // Deletion protection for production
      deletionProtection: environment === 'production',
      
      // Performance Insights
      enablePerformanceInsights: environment !== 'dev',
      performanceInsightRetention: environment !== 'dev'
        ? (environment === 'production'
          ? rds.PerformanceInsightRetention.LONG_TERM
          : rds.PerformanceInsightRetention.DEFAULT)
        : undefined,
      
      // CloudWatch logs
      cloudwatchLogsExports: ['postgresql'],
      cloudwatchLogsRetention: cdk.aws_logs.RetentionDays.ONE_MONTH,
      
      // Monitoring
      monitoringInterval: environment === 'dev' ? undefined : cdk.Duration.seconds(60),
    })

    // Output connection information
    new cdk.CfnOutput(this, 'RdsEndpoint', {
      value: this.rdsPostgres.instanceEndpoint.socketAddress,
      exportName: `${id}-RdsEndpoint`,
      description: 'RDS PostgreSQL endpoint',
    })

    new cdk.CfnOutput(this, 'RdsSecretArn', {
      value: this.rdsSecret.secretArn,
      exportName: `${id}-RdsSecretArn`,
      description: 'RDS credentials secret ARN',
    })

    new cdk.CfnOutput(this, 'DatabaseSecurityGroupId', {
      value: dbSecurityGroup.securityGroupId,
      exportName: `${id}-DatabaseSecurityGroupId`,
      description: 'Database security group ID',
    })
  }

  private getConfig(environment: string) {
    const configs = {
      dev: {
        instanceSize: ec2.InstanceSize.MICRO,
        allocatedStorage: 20,
        maxAllocatedStorage: 100,
        backupRetentionDays: 7,
        multiAz: false,
      },
      staging: {
        instanceSize: ec2.InstanceSize.SMALL,
        allocatedStorage: 50,
        maxAllocatedStorage: 200,
        backupRetentionDays: 14,
        multiAz: true,
      },
      production: {
        instanceSize: ec2.InstanceSize.LARGE,
        allocatedStorage: 100,
        maxAllocatedStorage: 500,
        backupRetentionDays: 35,
        multiAz: true,
      },
    }
    return configs[environment as keyof typeof configs]
  }
}
