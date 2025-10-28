"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitoAuthStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
class CognitoAuthStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stage } = props;
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
            // Email configuration
            email: cognito.UserPoolEmail.withSES({
                fromEmail: `noreply@lego-moc-instructions.com`,
                fromName: 'LEGO MOC Instructions',
                replyTo: `support@lego-moc-instructions.com`,
            }),
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
        });
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
        });
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
        });
        // IAM roles for authenticated users
        const authenticatedRole = new iam.Role(this, 'CognitoAuthenticatedRole', {
            assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
                StringEquals: {
                    'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
                },
                'ForAnyValue:StringLike': {
                    'cognito-identity.amazonaws.com:amr': 'authenticated',
                },
            }, 'sts:AssumeRoleWithWebIdentity'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
            ],
        });
        // Attach roles to identity pool
        new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
            identityPoolId: this.identityPool.ref,
            roles: {
                authenticated: authenticatedRole.roleArn,
            },
        });
        // Outputs
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: this.userPool.userPoolId,
            description: 'Cognito User Pool ID',
        });
        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: this.userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
        });
        new cdk.CfnOutput(this, 'IdentityPoolId', {
            value: this.identityPool.ref,
            description: 'Cognito Identity Pool ID',
        });
        new cdk.CfnOutput(this, 'UserPoolDomain', {
            value: `https://${this.userPool.userPoolId}.auth.us-east-1.amazoncognito.com`,
            description: 'Cognito User Pool Domain',
        });
    }
}
exports.CognitoAuthStack = CognitoAuthStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29nbml0by1hdXRoLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vY29nbml0by1hdXRoLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFrQztBQUNsQyxpRUFBa0Q7QUFHbEQseURBQTBDO0FBTzFDLE1BQWEsZ0JBQWlCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFNN0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE0QjtRQUNwRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV2QixNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsS0FBSyxDQUFBO1FBRXZCLDJCQUEyQjtRQUMzQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDNUQsWUFBWSxFQUFFLGtCQUFrQixLQUFLLEVBQUU7WUFFdkMsd0JBQXdCO1lBQ3hCLGFBQWEsRUFBRTtnQkFDYixLQUFLLEVBQUUsSUFBSTtnQkFDWCxRQUFRLEVBQUUsS0FBSztnQkFDZixLQUFLLEVBQUUsS0FBSzthQUNiO1lBRUQsMkJBQTJCO1lBQzNCLFVBQVUsRUFBRTtnQkFDVixLQUFLLEVBQUUsSUFBSTthQUNaO1lBRUQsa0JBQWtCO1lBQ2xCLGNBQWMsRUFBRTtnQkFDZCxTQUFTLEVBQUUsQ0FBQztnQkFDWixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixhQUFhLEVBQUUsSUFBSTtnQkFDbkIsY0FBYyxFQUFFLEtBQUs7YUFDdEI7WUFFRCxtQkFBbUI7WUFDbkIsZUFBZSxFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUMsVUFBVTtZQUVuRCxzQkFBc0I7WUFDdEIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO2dCQUNuQyxT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RSxzQkFBc0I7U0FDcEMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0I7WUFDM0MsV0FBVyxFQUFFLDZCQUE2QjtTQUMzQyxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3hDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUc7WUFDNUIsV0FBVyxFQUFFLDBCQUEwQjtTQUN4QyxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3hDLEtBQUssRUFBRSxXQUFXLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxtQ0FBbUM7WUFDN0UsV0FBVyxFQUFFLDBCQUEwQjtTQUN4QyxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0Y7QUEzTUQsNENBMk1DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJ1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0bydcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJ1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSdcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJ1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcblxuZXhwb3J0IGludGVyZmFjZSBDb2duaXRvQXV0aFN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHN0YWdlOiBzdHJpbmdcbn1cblxuZXhwb3J0IGNsYXNzIENvZ25pdG9BdXRoU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2xcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50OiBjb2duaXRvLlVzZXJQb29sQ2xpZW50XG4gIHB1YmxpYyByZWFkb25seSBpZGVudGl0eVBvb2w6IGNvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sXG4gIHB1YmxpYyByZWFkb25seSBhcGk6IGFwaWdhdGV3YXkuUmVzdEFwaVxuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDb2duaXRvQXV0aFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKVxuXG4gICAgY29uc3QgeyBzdGFnZSB9ID0gcHJvcHNcblxuICAgIC8vIENyZWF0ZSBDb2duaXRvIFVzZXIgUG9vbFxuICAgIHRoaXMudXNlclBvb2wgPSBuZXcgY29nbml0by5Vc2VyUG9vbCh0aGlzLCAnTGVnb01vY1VzZXJQb29sJywge1xuICAgICAgdXNlclBvb2xOYW1lOiBgbGVnby1tb2MtdXNlcnMtJHtzdGFnZX1gLFxuICAgICAgXG4gICAgICAvLyBTaWduLWluIGNvbmZpZ3VyYXRpb25cbiAgICAgIHNpZ25JbkFsaWFzZXM6IHtcbiAgICAgICAgZW1haWw6IHRydWUsXG4gICAgICAgIHVzZXJuYW1lOiBmYWxzZSxcbiAgICAgICAgcGhvbmU6IGZhbHNlLFxuICAgICAgfSxcbiAgICAgIFxuICAgICAgLy8gQXV0by12ZXJpZmllZCBhdHRyaWJ1dGVzXG4gICAgICBhdXRvVmVyaWZ5OiB7XG4gICAgICAgIGVtYWlsOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIFxuICAgICAgLy8gUGFzc3dvcmQgcG9saWN5XG4gICAgICBwYXNzd29yZFBvbGljeToge1xuICAgICAgICBtaW5MZW5ndGg6IDgsXG4gICAgICAgIHJlcXVpcmVMb3dlcmNhc2U6IHRydWUsXG4gICAgICAgIHJlcXVpcmVVcHBlcmNhc2U6IHRydWUsXG4gICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXG4gICAgICAgIHJlcXVpcmVTeW1ib2xzOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICBcbiAgICAgIC8vIEFjY291bnQgcmVjb3ZlcnlcbiAgICAgIGFjY291bnRSZWNvdmVyeTogY29nbml0by5BY2NvdW50UmVjb3ZlcnkuRU1BSUxfT05MWSxcbiAgICAgIFxuICAgICAgLy8gRW1haWwgY29uZmlndXJhdGlvblxuICAgICAgZW1haWw6IGNvZ25pdG8uVXNlclBvb2xFbWFpbC53aXRoU0VTKHtcbiAgICAgICAgZnJvbUVtYWlsOiBgbm9yZXBseUBsZWdvLW1vYy1pbnN0cnVjdGlvbnMuY29tYCxcbiAgICAgICAgZnJvbU5hbWU6ICdMRUdPIE1PQyBJbnN0cnVjdGlvbnMnLFxuICAgICAgICByZXBseVRvOiBgc3VwcG9ydEBsZWdvLW1vYy1pbnN0cnVjdGlvbnMuY29tYCxcbiAgICAgIH0pLFxuICAgICAgXG4gICAgICAvLyBTdGFuZGFyZCBhdHRyaWJ1dGVzXG4gICAgICBzdGFuZGFyZEF0dHJpYnV0ZXM6IHtcbiAgICAgICAgZW1haWw6IHtcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgICBnaXZlbk5hbWU6IHtcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgICBmYW1pbHlOYW1lOiB7XG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuICAgICAgICAgIG11dGFibGU6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgXG4gICAgICAvLyBDdXN0b20gYXR0cmlidXRlc1xuICAgICAgY3VzdG9tQXR0cmlidXRlczoge1xuICAgICAgICAnYXZhdGFyX3VybCc6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7IG11dGFibGU6IHRydWUgfSksXG4gICAgICAgICdwcmVmZXJlbmNlcyc6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7IG11dGFibGU6IHRydWUgfSksXG4gICAgICB9LFxuICAgICAgXG4gICAgICAvLyBVc2VyIHZlcmlmaWNhdGlvblxuICAgICAgdXNlclZlcmlmaWNhdGlvbjoge1xuICAgICAgICBlbWFpbFN1YmplY3Q6ICdWZXJpZnkgeW91ciBMRUdPIE1PQyBhY2NvdW50JyxcbiAgICAgICAgZW1haWxCb2R5OiAnSGVsbG8hIFBsZWFzZSB2ZXJpZnkgeW91ciBlbWFpbCBhZGRyZXNzIGJ5IGNsaWNraW5nIHRoaXMgbGluazogeyMjVmVyaWZ5IEVtYWlsIyN9JyxcbiAgICAgICAgZW1haWxTdHlsZTogY29nbml0by5WZXJpZmljYXRpb25FbWFpbFN0eWxlLkxJTkssXG4gICAgICB9LFxuICAgICAgXG4gICAgICAvLyBVc2VyIGludml0YXRpb24gKGZvciBhZG1pbi1jcmVhdGVkIHVzZXJzKVxuICAgICAgdXNlckludml0YXRpb246IHtcbiAgICAgICAgZW1haWxTdWJqZWN0OiAnV2VsY29tZSB0byBMRUdPIE1PQyBJbnN0cnVjdGlvbnMhJyxcbiAgICAgICAgZW1haWxCb2R5OiAnSGVsbG8ge3VzZXJuYW1lfSEgWW91ciB0ZW1wb3JhcnkgcGFzc3dvcmQgaXMgeyMjIyN9JyxcbiAgICAgIH0sXG4gICAgICBcbiAgICAgIC8vIERlbGV0aW9uIHByb3RlY3Rpb25cbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcbiAgICB9KVxuXG4gICAgLy8gQ3JlYXRlIFVzZXIgUG9vbCBDbGllbnQgZm9yIHdlYiBhcHBcbiAgICB0aGlzLnVzZXJQb29sQ2xpZW50ID0gbmV3IGNvZ25pdG8uVXNlclBvb2xDbGllbnQodGhpcywgJ0xlZ29Nb2NXZWJDbGllbnQnLCB7XG4gICAgICB1c2VyUG9vbDogdGhpcy51c2VyUG9vbCxcbiAgICAgIHVzZXJQb29sQ2xpZW50TmFtZTogYGxlZ28tbW9jLXdlYi1jbGllbnQtJHtzdGFnZX1gLFxuICAgICAgXG4gICAgICAvLyBPQXV0aCBjb25maWd1cmF0aW9uXG4gICAgICBvQXV0aDoge1xuICAgICAgICBmbG93czoge1xuICAgICAgICAgIGF1dGhvcml6YXRpb25Db2RlR3JhbnQ6IHRydWUsXG4gICAgICAgICAgaW1wbGljaXRDb2RlR3JhbnQ6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICBzY29wZXM6IFtcbiAgICAgICAgICBjb2duaXRvLk9BdXRoU2NvcGUuRU1BSUwsXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLk9QRU5JRCxcbiAgICAgICAgICBjb2duaXRvLk9BdXRoU2NvcGUuUFJPRklMRSxcbiAgICAgICAgXSxcbiAgICAgICAgY2FsbGJhY2tVcmxzOiBbXG4gICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMi9hdXRoL2NhbGxiYWNrJyxcbiAgICAgICAgICAnaHR0cHM6Ly9sZWdvLW1vYy1pbnN0cnVjdGlvbnMuY29tL2F1dGgvY2FsbGJhY2snLFxuICAgICAgICBdLFxuICAgICAgICBsb2dvdXRVcmxzOiBbXG4gICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMi9hdXRoL2xvZ291dCcsXG4gICAgICAgICAgJ2h0dHBzOi8vbGVnby1tb2MtaW5zdHJ1Y3Rpb25zLmNvbS9hdXRoL2xvZ291dCcsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgXG4gICAgICAvLyBTZWN1cml0eSBzZXR0aW5nc1xuICAgICAgZ2VuZXJhdGVTZWNyZXQ6IGZhbHNlLCAvLyBGb3IgcHVibGljIGNsaWVudHMgKFNQQSlcbiAgICAgIHByZXZlbnRVc2VyRXhpc3RlbmNlRXJyb3JzOiB0cnVlLFxuICAgICAgXG4gICAgICAvLyBUb2tlbiB2YWxpZGl0eVxuICAgICAgYWNjZXNzVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxuICAgICAgaWRUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXG4gICAgICByZWZyZXNoVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxuICAgICAgXG4gICAgICAvLyBTdXBwb3J0ZWQgaWRlbnRpdHkgcHJvdmlkZXJzIChHb29nbGUgd2lsbCBiZSBhZGRlZCBsYXRlcilcbiAgICAgIHN1cHBvcnRlZElkZW50aXR5UHJvdmlkZXJzOiBbXG4gICAgICAgIGNvZ25pdG8uVXNlclBvb2xDbGllbnRJZGVudGl0eVByb3ZpZGVyLkNPR05JVE8sXG4gICAgICBdLFxuICAgIH0pXG5cbiAgICAvLyBHb29nbGUgT0F1dGggUHJvdmlkZXIgKHdpbGwgYmUgY29uZmlndXJlZCBsYXRlcilcbiAgICAvLyBGb3Igbm93LCB3ZSdsbCBkZXBsb3kgd2l0aG91dCBHb29nbGUgT0F1dGggYW5kIGFkZCBpdCBsYXRlclxuICAgIC8vIGNvbnN0IGdvb2dsZVByb3ZpZGVyID0gbmV3IGNvZ25pdG8uVXNlclBvb2xJZGVudGl0eVByb3ZpZGVyR29vZ2xlKHRoaXMsICdHb29nbGVQcm92aWRlcicsIHtcbiAgICAvLyAgIHVzZXJQb29sOiB0aGlzLnVzZXJQb29sLFxuICAgIC8vICAgY2xpZW50SWQ6ICd5b3VyLWdvb2dsZS1jbGllbnQtaWQnLFxuICAgIC8vICAgY2xpZW50U2VjcmV0OiAneW91ci1nb29nbGUtY2xpZW50LXNlY3JldCcsXG4gICAgLy8gICBzY29wZXM6IFsnZW1haWwnLCAncHJvZmlsZSddLFxuICAgIC8vICAgYXR0cmlidXRlTWFwcGluZzoge1xuICAgIC8vICAgICBlbWFpbDogY29nbml0by5Qcm92aWRlckF0dHJpYnV0ZS5HT09HTEVfRU1BSUwsXG4gICAgLy8gICAgIGdpdmVuTmFtZTogY29nbml0by5Qcm92aWRlckF0dHJpYnV0ZS5HT09HTEVfR0lWRU5fTkFNRSxcbiAgICAvLyAgICAgZmFtaWx5TmFtZTogY29nbml0by5Qcm92aWRlckF0dHJpYnV0ZS5HT09HTEVfRkFNSUxZX05BTUUsXG4gICAgLy8gICAgIHByb2ZpbGVQaWN0dXJlOiBjb2duaXRvLlByb3ZpZGVyQXR0cmlidXRlLkdPT0dMRV9QSUNUVVJFLFxuICAgIC8vICAgfSxcbiAgICAvLyB9KVxuXG4gICAgLy8gdGhpcy51c2VyUG9vbENsaWVudC5ub2RlLmFkZERlcGVuZGVuY3koZ29vZ2xlUHJvdmlkZXIpXG5cbiAgICAvLyBDcmVhdGUgSWRlbnRpdHkgUG9vbCBmb3IgQVdTIHJlc291cmNlIGFjY2Vzc1xuICAgIHRoaXMuaWRlbnRpdHlQb29sID0gbmV3IGNvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sKHRoaXMsICdMZWdvTW9jSWRlbnRpdHlQb29sJywge1xuICAgICAgaWRlbnRpdHlQb29sTmFtZTogYGxlZ29fbW9jX2lkZW50aXR5XyR7c3RhZ2V9YCxcbiAgICAgIGFsbG93VW5hdXRoZW50aWNhdGVkSWRlbnRpdGllczogZmFsc2UsXG4gICAgICBjb2duaXRvSWRlbnRpdHlQcm92aWRlcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGNsaWVudElkOiB0aGlzLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICAgICAgcHJvdmlkZXJOYW1lOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sUHJvdmlkZXJOYW1lLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KVxuXG4gICAgLy8gSUFNIHJvbGVzIGZvciBhdXRoZW50aWNhdGVkIHVzZXJzXG4gICAgY29uc3QgYXV0aGVudGljYXRlZFJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0NvZ25pdG9BdXRoZW50aWNhdGVkUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5GZWRlcmF0ZWRQcmluY2lwYWwoXG4gICAgICAgICdjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb20nLFxuICAgICAgICB7XG4gICAgICAgICAgU3RyaW5nRXF1YWxzOiB7XG4gICAgICAgICAgICAnY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOmF1ZCc6IHRoaXMuaWRlbnRpdHlQb29sLnJlZixcbiAgICAgICAgICB9LFxuICAgICAgICAgICdGb3JBbnlWYWx1ZTpTdHJpbmdMaWtlJzoge1xuICAgICAgICAgICAgJ2NvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphbXInOiAnYXV0aGVudGljYXRlZCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgJ3N0czpBc3N1bWVSb2xlV2l0aFdlYklkZW50aXR5J1xuICAgICAgKSxcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvblMzUmVhZE9ubHlBY2Nlc3MnKSxcbiAgICAgIF0sXG4gICAgfSlcblxuICAgIC8vIEF0dGFjaCByb2xlcyB0byBpZGVudGl0eSBwb29sXG4gICAgbmV3IGNvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sUm9sZUF0dGFjaG1lbnQodGhpcywgJ0lkZW50aXR5UG9vbFJvbGVBdHRhY2htZW50Jywge1xuICAgICAgaWRlbnRpdHlQb29sSWQ6IHRoaXMuaWRlbnRpdHlQb29sLnJlZixcbiAgICAgIHJvbGVzOiB7XG4gICAgICAgIGF1dGhlbnRpY2F0ZWQ6IGF1dGhlbnRpY2F0ZWRSb2xlLnJvbGVBcm4sXG4gICAgICB9LFxuICAgIH0pXG5cbiAgICAvLyBPdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sSWQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBJRCcsXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbENsaWVudElkJywge1xuICAgICAgdmFsdWU6IHRoaXMudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgQ2xpZW50IElEJyxcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0lkZW50aXR5UG9vbElkJywge1xuICAgICAgdmFsdWU6IHRoaXMuaWRlbnRpdHlQb29sLnJlZixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBJZGVudGl0eSBQb29sIElEJyxcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sRG9tYWluJywge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7dGhpcy51c2VyUG9vbC51c2VyUG9vbElkfS5hdXRoLnVzLWVhc3QtMS5hbWF6b25jb2duaXRvLmNvbWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIERvbWFpbicsXG4gICAgfSlcbiAgfVxufVxuIl19