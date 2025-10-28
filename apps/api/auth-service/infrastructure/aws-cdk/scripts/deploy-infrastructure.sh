#!/bin/bash

# Deploy Auth Service Infrastructure Only
# This script deploys the CDK stack without any application code changes or seeding

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${ENVIRONMENT:-dev}

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if AWS CLI is configured
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi

    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi

    print_success "AWS CLI is configured"
}

# Function to check if CDK is installed
check_cdk() {
    if ! command -v cdk &> /dev/null; then
        print_error "AWS CDK is not installed. Please install it first: npm install -g aws-cdk"
        exit 1
    fi

    print_success "AWS CDK is available"
}

# Function to build the CDK project
build_cdk() {
    print_status "Building CDK project..."
    
    if ! npm run build; then
        print_error "Failed to build CDK project"
        exit 1
    fi
    
    print_success "CDK project built successfully"
}

# Function to deploy the stack
deploy_stack() {
    print_status "Deploying Auth Service infrastructure to environment: $ENVIRONMENT"
    
    # Set environment variable for CDK
    export ENVIRONMENT=$ENVIRONMENT
    
    if ! npx cdk deploy --require-approval never; then
        print_error "Failed to deploy Auth Service stack"
        exit 1
    fi
    
    print_success "Auth Service infrastructure deployed successfully"
}

# Function to print deployment summary
print_summary() {
    echo ""
    echo "=========================================="
    echo "🏗️ INFRASTRUCTURE DEPLOYMENT SUMMARY"
    echo "=========================================="
    echo "Environment: $ENVIRONMENT"
    echo "Stack Name: AuthServiceStack${ENVIRONMENT^}"
    echo ""
    echo "📋 What was deployed:"
    echo "  • ECS Cluster and Service"
    echo "  • Application Load Balancer"
    echo "  • DocumentDB Cluster"
    echo "  • Security Groups and Networking"
    echo "  • IAM Roles and Policies"
    echo "  • ECR Repository"
    echo ""
    echo "⚠️  Note: This was an infrastructure-only deployment."
    echo "   Application code deployment and database seeding are separate steps."
    echo ""
    echo "🔄 Next steps:"
    echo "  • Deploy application code: ./deploy-code.sh"
    echo "  • Seed database: ./seed-database.sh"
    echo "  • Or do both: ./deploy-with-seeding.sh"
    echo "=========================================="
}

# Main execution
main() {
    echo "🏗️ Auth Service Infrastructure Deployment"
    echo "Environment: $ENVIRONMENT"
    echo ""
    
    # Pre-flight checks
    check_aws_cli
    check_cdk
    
    # Build and deploy infrastructure only
    build_cdk
    deploy_stack
    
    # Summary
    print_summary
    
    print_success "Infrastructure deployment completed successfully! 🎉"
}

# Help function
show_help() {
    echo "Auth Service Infrastructure Deployment"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Deployment environment (dev, staging, production)"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  ENVIRONMENT              Deployment environment (default: dev)"
    echo ""
    echo "Examples:"
    echo "  $0                       # Deploy infrastructure to dev"
    echo "  $0 -e staging            # Deploy infrastructure to staging"
    echo "  $0 -e production         # Deploy infrastructure to production"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main
