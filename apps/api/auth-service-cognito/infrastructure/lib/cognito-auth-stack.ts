import * as cdk from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

export interface CognitoAuthStackProps extends cdk.StackProps {
  stage: string
}

export class CognitoAuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool
  public readonly userPoolClient: cognito.UserPoolClient
  public readonly identityPool: cognito.CfnIdentityPool
  public readonly api: apigateway.RestApi

  constructor(scope: Construct, id: string, props: CognitoAuthStackProps) {
    super(scope, id, props)

    const { stage } = props

    // Create Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'LegoMocUserPool', {
      userPoolName: `lego-moc-users-${stage}`,
      
      // Sign-in configuration
      signInAliases: {
        email: true,
        username: false,
        phone: false,
      },
      
      // Auto-verified attributes
      autoVerify: {
        email: true,
      },
      
      // Password policy
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      
      // Account recovery
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      
      // Email configuration - using Cognito's built-in email service
      // TODO: Switch to SES when ready for production
      email: cognito.UserPoolEmail.withCognito(),
      
      // Standard attributes
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: false,
          mutable: true,
        },
      },
      
      // Custom attributes
      customAttributes: {
        'avatar_url': new cognito.StringAttribute({ mutable: true }),
        'preferences': new cognito.StringAttribute({ mutable: true }),
      },
      
      // User verification
      userVerification: {
        emailSubject: 'Verify your LEGO MOC account',
        emailBody: 'Hello! Please verify your email address by clicking this link: {##Verify Email##}',
        emailStyle: cognito.VerificationEmailStyle.LINK,
      },
      
      // User invitation (for admin-created users)
      userInvitation: {
        emailSubject: 'Welcome to LEGO MOC Instructions!',
        emailBody: 'Hello {username}! Your temporary password is {####}',
      },
      
      // Deletion protection
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    // Create User Pool Client for web app
    this.userPoolClient = new cognito.UserPoolClient(this, 'LegoMocWebClient', {
      userPool: this.userPool,
      userPoolClientName: `lego-moc-web-client-${stage}`,
      
      // OAuth configuration
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          'http://localhost:3002/auth/callback',
          'https://lego-moc-instructions.com/auth/callback',
        ],
        logoutUrls: [
          'http://localhost:3002/auth/logout',
          'https://lego-moc-instructions.com/auth/logout',
        ],
      },
      
      // Security settings
      generateSecret: false, // For public clients (SPA)
      preventUserExistenceErrors: true,
      
      // Token validity
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
      
      // Supported identity providers (Google will be added later)
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
    })

    // Google OAuth Provider (will be configured later)
    // For now, we'll deploy without Google OAuth and add it later
    // const googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleProvider', {
    //   userPool: this.userPool,
    //   clientId: 'your-google-client-id',
    //   clientSecret: 'your-google-client-secret',
    //   scopes: ['email', 'profile'],
    //   attributeMapping: {
    //     email: cognito.ProviderAttribute.GOOGLE_EMAIL,
    //     givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
    //     familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
    //     profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
    //   },
    // })

    // this.userPoolClient.node.addDependency(googleProvider)

    // Create Identity Pool for AWS resource access
    this.identityPool = new cognito.CfnIdentityPool(this, 'LegoMocIdentityPool', {
      identityPoolName: `lego_moc_identity_${stage}`,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    })

    // IAM roles for authenticated users
    const authenticatedRole = new iam.Role(this, 'CognitoAuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
      ],
    })

    // Attach roles to identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
      },
    })

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    })

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    })

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: this.identityPool.ref,
      description: 'Cognito Identity Pool ID',
    })

    new cdk.CfnOutput(this, 'UserPoolDomain', {
      value: `https://${this.userPool.userPoolId}.auth.us-east-1.amazoncognito.com`,
      description: 'Cognito User Pool Domain',
    })
  }
}
