import * as cdk from 'aws-cdk-lib';
import * as apprunner from 'aws-cdk-lib/aws-apprunner';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface AuthServiceAppRunnerStackProps extends cdk.StackProps {
  stage: string;
  githubConnectionArn?: string;
}

export class AuthServiceAppRunnerStack extends cdk.Stack {
  public readonly serviceUrl: string;

  constructor(scope: Construct, id: string, props: AuthServiceAppRunnerStackProps) {
    super(scope, id, props);

    const { stage } = props;

    // Create IAM role for App Runner service
    const appRunnerRole = new iam.Role(this, 'AppRunnerInstanceRole', {
      assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'),
      ],
    });

    // Create GitHub connection for App Runner
    const githubConnection = new apprunner.CfnConnection(this, 'GitHubConnection', {
      connectionName: `lego-monorepo-github-${stage}`,
      providerType: 'GITHUB',
    });

    const connectionArn = githubConnection.attrConnectionArn;

    // App Runner service configuration
    const appRunnerService = new apprunner.CfnService(this, 'AuthService', {
      serviceName: `auth-service-${stage}`,
      sourceConfiguration: {
        autoDeploymentsEnabled: true,
        codeRepository: {
          repositoryUrl: 'https://github.com/michael-menard/monorepo',
          sourceCodeVersion: {
            type: 'BRANCH',
            value: 'main',
          },
          codeConfiguration: {
            configurationSource: 'REPOSITORY', // Use apprunner.yaml from repo
          },
        },
        connectionArn: connectionArn,
      },
      instanceConfiguration: {
        cpu: '0.25 vCPU',
        memory: '0.5 GB',
        instanceRoleArn: appRunnerRole.roleArn,
      },
      healthCheckConfiguration: {
        protocol: 'HTTP',
        path: '/health',
        interval: 10,
        timeout: 5,
        healthyThreshold: 1,
        unhealthyThreshold: 5,
      },
      networkConfiguration: {
        egressConfiguration: {
          egressType: 'DEFAULT', // Allow all outbound traffic
        },
      },
    });

    // Environment variables for the service
    const environmentVariables = {
      NODE_ENV: 'production',
      PORT: '3000',
      // DocumentDB connection
      MONGODB_URI: `mongodb://legouser:${cdk.SecretValue.unsafePlainText('LegoPass123!')}@docdb-cluster-dev.cluster-cjyuq5qhkzpx.us-east-1.docdb.amazonaws.com:27017/lego-auth?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false`,
      // JWT secrets
      JWT_SECRET: 'your-super-secret-jwt-key-change-in-production',
      JWT_REFRESH_SECRET: 'your-super-secret-refresh-key-change-in-production',
      // Email configuration (if needed)
      EMAIL_FROM: 'noreply@yourdomain.com',
      // CORS origins
      CORS_ORIGINS: 'http://localhost:3002,https://yourdomain.com',
    };

    // Add environment variables to the service
    if (appRunnerService.sourceConfiguration?.codeRepository?.codeConfiguration) {
      appRunnerService.sourceConfiguration.codeRepository.codeConfiguration.codeConfigurationValues = {
        runtime: 'NODEJS_20',
        buildCommand: 'npm install -g pnpm@9 && pnpm install --frozen-lockfile && pnpm turbo build --filter="./packages/*" && cd apps/api/auth-service && npm run build',
        startCommand: 'cd apps/api/auth-service && npm start',
        port: '3000',
        runtimeEnvironmentVariables: Object.entries(environmentVariables).map(([name, value]) => ({
          name,
          value,
        })),
      };
    }

    // Store the service URL
    this.serviceUrl = `https://${appRunnerService.attrServiceUrl}`;

    // Outputs
    new cdk.CfnOutput(this, 'AuthServiceUrl', {
      value: this.serviceUrl,
      description: 'Auth Service App Runner URL',
    });

    new cdk.CfnOutput(this, 'AuthServiceArn', {
      value: appRunnerService.attrServiceArn,
      description: 'Auth Service App Runner ARN',
    });
  }
}
