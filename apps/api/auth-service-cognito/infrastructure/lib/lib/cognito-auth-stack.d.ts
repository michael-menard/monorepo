import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
export interface CognitoAuthStackProps extends cdk.StackProps {
    stage: string;
}
export declare class CognitoAuthStack extends cdk.Stack {
    readonly userPool: cognito.UserPool;
    readonly userPoolClient: cognito.UserPoolClient;
    readonly identityPool: cognito.CfnIdentityPool;
    readonly api: apigateway.RestApi;
    constructor(scope: Construct, id: string, props: CognitoAuthStackProps);
}
