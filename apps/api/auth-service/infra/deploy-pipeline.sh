#!/bin/bash

# Auth Service CodePipeline Deployment Script
# Usage: ./deploy-pipeline.sh [environment] [stack-name]

set -e

# Default values
ENVIRONMENT=${1:-dev}
STACK_NAME=${2:-auth-service-pipeline-stack}
TEMPLATE_FILE="codepipeline-cloudformation.yml"
REGION=${AWS_REGION:-us-east-1}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials are not configured. Please run 'aws configure' first."
    exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    print_error "Invalid environment. Must be dev, staging, or prod."
    exit 1
fi

print_status "Deploying Auth Service CI/CD Pipeline..."
print_status "Environment: $ENVIRONMENT"
print_status "Stack Name: $STACK_NAME"
print_status "Region: $REGION"
print_status "Template: $TEMPLATE_FILE"

# Check if template file exists
if [[ ! -f "$TEMPLATE_FILE" ]]; then
    print_error "Template file $TEMPLATE_FILE not found!"
    exit 1
fi

# Prompt for required parameters
print_status "Please provide the following parameters:"

read -p "GitHub Owner (e.g., your-username): " GITHUB_OWNER
if [[ -z "$GITHUB_OWNER" ]]; then
    print_error "GitHub Owner is required."
    exit 1
fi

read -p "GitHub Repository (e.g., react-constructs): " GITHUB_REPO
if [[ -z "$GITHUB_REPO" ]]; then
    print_error "GitHub Repository is required."
    exit 1
fi

read -p "GitHub Branch (default: main): " GITHUB_BRANCH
GITHUB_BRANCH=${GITHUB_BRANCH:-main}

read -p "GitHub Personal Access Token: " GITHUB_TOKEN
if [[ -z "$GITHUB_TOKEN" ]]; then
    print_error "GitHub Personal Access Token is required."
    exit 1
fi

read -p "S3 Artifact Bucket Name (e.g., auth-service-artifacts-${ENVIRONMENT}): " ARTIFACT_BUCKET
if [[ -z "$ARTIFACT_BUCKET" ]]; then
    ARTIFACT_BUCKET="auth-service-artifacts-${ENVIRONMENT}"
fi

read -p "Notification Email: " NOTIFICATION_EMAIL
if [[ -z "$NOTIFICATION_EMAIL" ]]; then
    print_error "Notification Email is required."
    exit 1
fi

# Create parameters file
PARAMS_FILE="pipeline-params-${ENVIRONMENT}.json"

cat > "$PARAMS_FILE" << EOF
{
  "Parameters": {
    "Environment": "$ENVIRONMENT",
    "ProjectName": "auth-service",
    "GitHubOwner": "$GITHUB_OWNER",
    "GitHubRepo": "$GITHUB_REPO",
    "GitHubBranch": "$GITHUB_BRANCH",
    "GitHubToken": "$GITHUB_TOKEN",
    "ArtifactBucketName": "$ARTIFACT_BUCKET",
    "NotificationEmail": "$NOTIFICATION_EMAIL"
  }
}
EOF

print_status "Created parameters file: $PARAMS_FILE"

# Check if stack exists
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &> /dev/null; then
    print_status "Stack $STACK_NAME exists. Updating..."
    OPERATION="update-stack"
else
    print_status "Stack $STACK_NAME does not exist. Creating..."
    OPERATION="create-stack"
fi

# Deploy the stack
aws cloudformation $OPERATION \
    --stack-name "$STACK_NAME" \
    --template-body file://"$TEMPLATE_FILE" \
    --parameters file://"$PARAMS_FILE" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "$REGION" \
    --tags Key=Environment,Value="$ENVIRONMENT" Key=Project,Value=auth-service

if [[ $? -eq 0 ]]; then
    print_success "Stack $OPERATION initiated successfully!"
    
    if [[ "$OPERATION" == "create-stack" ]]; then
        print_status "Waiting for stack creation to complete..."
        aws cloudformation wait stack-create-complete \
            --stack-name "$STACK_NAME" \
            --region "$REGION"
    else
        print_status "Waiting for stack update to complete..."
        aws cloudformation wait stack-update-complete \
            --stack-name "$STACK_NAME" \
            --region "$REGION"
    fi
    
    print_success "Pipeline deployment completed successfully!"
    
    # Get stack outputs
    print_status "Stack outputs:"
    aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs' \
        --output table
    
    # Get pipeline URL
    PIPELINE_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`PipelineUrl`].OutputValue' \
        --output text)
    
    if [[ "$PIPELINE_URL" != "None" ]]; then
        print_success "Pipeline URL: $PIPELINE_URL"
    fi
    
    # Get build project name
    BUILD_PROJECT=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`BuildProjectName`].OutputValue' \
        --output text)
    
    if [[ "$BUILD_PROJECT" != "None" ]]; then
        print_success "Build Project: $BUILD_PROJECT"
    fi
    
    print_status "Next steps:"
    echo "  1. Configure GitHub webhook (if not using CodeStar connections)"
    echo "  2. Test the pipeline by pushing to the monitored branch"
    echo "  3. Monitor the pipeline in the AWS Console"
    echo "  4. Check email notifications for pipeline status"
    
else
    print_error "Stack $OPERATION failed!"
    exit 1
fi

# Clean up parameters file (remove sensitive data)
rm -f "$PARAMS_FILE"

print_success "Pipeline deployment completed successfully!" 