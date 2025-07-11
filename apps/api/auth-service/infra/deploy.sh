#!/bin/bash

# Auth Service CloudFormation Deployment Script
# Usage: ./deploy.sh [environment] [stack-name]

set -e

# Default values
ENVIRONMENT=${1:-dev}
STACK_NAME=${2:-auth-service-stack}
TEMPLATE_FILE="auth-service-cloudformation.yml"
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

print_status "Deploying Auth Service infrastructure..."
print_status "Environment: $ENVIRONMENT"
print_status "Stack Name: $STACK_NAME"
print_status "Region: $REGION"
print_status "Template: $TEMPLATE_FILE"

# Check if template file exists
if [[ ! -f "$TEMPLATE_FILE" ]]; then
    print_error "Template file $TEMPLATE_FILE not found!"
    exit 1
fi

# Create parameters file for the environment
PARAMS_FILE="params-$ENVIRONMENT.json"

case $ENVIRONMENT in
    dev)
        cat > "$PARAMS_FILE" << EOF
{
  "Parameters": {
    "Environment": "dev",
    "ProjectName": "auth-service",
    "DomainName": "",
    "CertificateArn": ""
  }
}
EOF
        ;;
    staging)
        cat > "$PARAMS_FILE" << EOF
{
  "Parameters": {
    "Environment": "staging",
    "ProjectName": "auth-service",
    "DomainName": "",
    "CertificateArn": ""
  }
}
EOF
        ;;
    prod)
        cat > "$PARAMS_FILE" << EOF
{
  "Parameters": {
    "Environment": "prod",
    "ProjectName": "auth-service",
    "DomainName": "",
    "CertificateArn": ""
  }
}
EOF
        ;;
esac

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
    
    print_success "Stack deployment completed successfully!"
    
    # Get stack outputs
    print_status "Stack outputs:"
    aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs' \
        --output table
    
    # Get API Gateway URL
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
        --output text)
    
    if [[ "$API_URL" != "None" ]]; then
        print_success "API Gateway URL: $API_URL"
        print_status "Test endpoints:"
        echo "  Health Check: $API_URL/health"
        echo "  Signup: $API_URL/signup"
        echo "  Login: $API_URL/login"
    fi
    
else
    print_error "Stack $OPERATION failed!"
    exit 1
fi

# Clean up parameters file
rm -f "$PARAMS_FILE"

print_success "Deployment completed successfully!" 