#!/usr/bin/env node
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
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const cognito_auth_stack_1 = require("../lib/cognito-auth-stack");
const app = new cdk.App();
// Get environment from context or default to 'dev'
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev';
// Stack naming
const stackPrefix = `LegoMoc-${environment}`;
// Common props for all stacks
const commonProps = {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    tags: {
        Project: 'LegoMocInstructions',
        Environment: environment,
        Service: 'Auth',
        ManagedBy: 'CDK',
    },
};
// Create Cognito Auth Stack
const cognitoAuthStack = new cognito_auth_stack_1.CognitoAuthStack(app, `${stackPrefix}-CognitoAuth`, {
    ...commonProps,
    stage: environment,
});
// Console output
console.log(`🚀 Deploying Cognito Auth Stack: ${stackPrefix}-CognitoAuth`);
console.log(`📍 Environment: ${environment}`);
console.log(`🌍 Region: ${commonProps.env.region}`);
console.log(`🔐 Account: ${commonProps.env.account}`);
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYmluL2FwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1Q0FBb0M7QUFDcEMsaURBQWtDO0FBQ2xDLGtFQUE0RDtBQUU1RCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtBQUV6QixtREFBbUQ7QUFDbkQsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLElBQUksS0FBSyxDQUFBO0FBRTdGLGVBQWU7QUFDZixNQUFNLFdBQVcsR0FBRyxXQUFXLFdBQVcsRUFBRSxDQUFBO0FBRTVDLDhCQUE4QjtBQUM5QixNQUFNLFdBQVcsR0FBRztJQUNsQixHQUFHLEVBQUU7UUFDSCxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7UUFDeEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksV0FBVztLQUN0RDtJQUNELElBQUksRUFBRTtRQUNKLE9BQU8sRUFBRSxxQkFBcUI7UUFDOUIsV0FBVyxFQUFFLFdBQVc7UUFDeEIsT0FBTyxFQUFFLE1BQU07UUFDZixTQUFTLEVBQUUsS0FBSztLQUNqQjtDQUNGLENBQUE7QUFFRCw0QkFBNEI7QUFDNUIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLHFDQUFnQixDQUFDLEdBQUcsRUFBRSxHQUFHLFdBQVcsY0FBYyxFQUFFO0lBQy9FLEdBQUcsV0FBVztJQUNkLEtBQUssRUFBRSxXQUFXO0NBQ25CLENBQUMsQ0FBQTtBQUVGLGlCQUFpQjtBQUNqQixPQUFPLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxXQUFXLGNBQWMsQ0FBQyxDQUFBO0FBQzFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLFdBQVcsRUFBRSxDQUFDLENBQUE7QUFDN0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtBQUNuRCxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO0FBRXJELEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbmltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJ1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJ1xuaW1wb3J0IHsgQ29nbml0b0F1dGhTdGFjayB9IGZyb20gJy4uL2xpYi9jb2duaXRvLWF1dGgtc3RhY2snXG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKClcblxuLy8gR2V0IGVudmlyb25tZW50IGZyb20gY29udGV4dCBvciBkZWZhdWx0IHRvICdkZXYnXG5jb25zdCBlbnZpcm9ubWVudCA9IGFwcC5ub2RlLnRyeUdldENvbnRleHQoJ2Vudmlyb25tZW50JykgfHwgcHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgfHwgJ2RldidcblxuLy8gU3RhY2sgbmFtaW5nXG5jb25zdCBzdGFja1ByZWZpeCA9IGBMZWdvTW9jLSR7ZW52aXJvbm1lbnR9YFxuXG4vLyBDb21tb24gcHJvcHMgZm9yIGFsbCBzdGFja3NcbmNvbnN0IGNvbW1vblByb3BzID0ge1xuICBlbnY6IHtcbiAgICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxuICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxuICB9LFxuICB0YWdzOiB7XG4gICAgUHJvamVjdDogJ0xlZ29Nb2NJbnN0cnVjdGlvbnMnLFxuICAgIEVudmlyb25tZW50OiBlbnZpcm9ubWVudCxcbiAgICBTZXJ2aWNlOiAnQXV0aCcsXG4gICAgTWFuYWdlZEJ5OiAnQ0RLJyxcbiAgfSxcbn1cblxuLy8gQ3JlYXRlIENvZ25pdG8gQXV0aCBTdGFja1xuY29uc3QgY29nbml0b0F1dGhTdGFjayA9IG5ldyBDb2duaXRvQXV0aFN0YWNrKGFwcCwgYCR7c3RhY2tQcmVmaXh9LUNvZ25pdG9BdXRoYCwge1xuICAuLi5jb21tb25Qcm9wcyxcbiAgc3RhZ2U6IGVudmlyb25tZW50LFxufSlcblxuLy8gQ29uc29sZSBvdXRwdXRcbmNvbnNvbGUubG9nKGDwn5qAIERlcGxveWluZyBDb2duaXRvIEF1dGggU3RhY2s6ICR7c3RhY2tQcmVmaXh9LUNvZ25pdG9BdXRoYClcbmNvbnNvbGUubG9nKGDwn5ONIEVudmlyb25tZW50OiAke2Vudmlyb25tZW50fWApXG5jb25zb2xlLmxvZyhg8J+MjSBSZWdpb246ICR7Y29tbW9uUHJvcHMuZW52LnJlZ2lvbn1gKVxuY29uc29sZS5sb2coYPCflJAgQWNjb3VudDogJHtjb21tb25Qcm9wcy5lbnYuYWNjb3VudH1gKVxuXG5hcHAuc3ludGgoKVxuIl19