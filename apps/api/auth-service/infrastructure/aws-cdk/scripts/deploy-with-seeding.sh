#!/bin/bash

# Deploy Auth Service with Database Seeding
# This script deploys the Auth Service stack and then seeds the database with initial users

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${ENVIRONMENT:-dev}
SKIP_SEEDING=${SKIP_SEEDING:-false}
CLEAR_USERS=${CLEAR_USERS:-false}
VERBOSE=${VERBOSE:-true}

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
    print_status "Deploying Auth Service stack to environment: $ENVIRONMENT"
    
    # Set environment variable for CDK
    export ENVIRONMENT=$ENVIRONMENT
    
    if ! npx cdk deploy --require-approval never; then
        print_error "Failed to deploy Auth Service stack"
        exit 1
    fi
    
    print_success "Auth Service stack deployed successfully"
}

# Function to get DocumentDB connection details from CloudFormation
get_db_connection() {
    print_status "Retrieving DocumentDB connection details..."
    
    local stack_name="AuthServiceStack${ENVIRONMENT^}"  # Capitalize first letter
    
    # Get DocumentDB endpoint
    DB_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$DB_ENDPOINT" ]; then
        print_warning "Could not retrieve DocumentDB endpoint from CloudFormation"
        print_warning "Seeding will be skipped"
        return 1
    fi
    
    # Get database credentials from Secrets Manager
    SECRET_ARN=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query 'Stacks[0].Outputs[?OutputKey==`DatabaseSecretArn`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$SECRET_ARN" ]; then
        print_warning "Could not retrieve database secret ARN from CloudFormation"
        print_warning "Seeding will be skipped"
        return 1
    fi
    
    # Get credentials from Secrets Manager
    DB_CREDENTIALS=$(aws secretsmanager get-secret-value \
        --secret-id "$SECRET_ARN" \
        --query 'SecretString' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$DB_CREDENTIALS" ]; then
        print_warning "Could not retrieve database credentials from Secrets Manager"
        print_warning "Seeding will be skipped"
        return 1
    fi
    
    # Parse credentials
    DB_USERNAME=$(echo "$DB_CREDENTIALS" | jq -r '.username')
    DB_PASSWORD=$(echo "$DB_CREDENTIALS" | jq -r '.password')
    
    if [ "$DB_USERNAME" = "null" ] || [ "$DB_PASSWORD" = "null" ]; then
        print_warning "Could not parse database credentials"
        print_warning "Seeding will be skipped"
        return 1
    fi
    
    print_success "Retrieved DocumentDB connection details"
    return 0
}

# Function to wait for DocumentDB to be ready
wait_for_db() {
    print_status "Waiting for DocumentDB to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        print_status "Checking DocumentDB status (attempt $attempt/$max_attempts)..."
        
        # Try to connect to DocumentDB (this will fail if not ready)
        if timeout 10 bash -c "echo > /dev/tcp/${DB_ENDPOINT}/27017" 2>/dev/null; then
            print_success "DocumentDB is ready"
            return 0
        fi
        
        print_status "DocumentDB not ready yet, waiting 30 seconds..."
        sleep 30
        ((attempt++))
    done
    
    print_warning "DocumentDB did not become ready within expected time"
    print_warning "Seeding will be attempted anyway"
    return 0
}

# Function to check if database needs seeding
needs_seeding() {
    print_status "Checking if database needs seeding..."

    # Try to connect and count existing users
    local user_count
    user_count=$(timeout 30 mongosh "$MONGO_URI" --quiet --eval "db.users.countDocuments({})" 2>/dev/null || echo "0")

    if [ "$user_count" = "0" ] || [ -z "$user_count" ]; then
        print_status "Database is empty or unreachable - seeding needed"
        return 0
    else
        print_status "Database already has $user_count users"
        if [ "$CLEAR_USERS" = "true" ]; then
            print_status "CLEAR_USERS=true - will clear and reseed"
            return 0
        else
            print_status "Seeding not needed (use CLEAR_USERS=true to force reseed)"
            return 1
        fi
    fi
}

# Function to seed the database
seed_database() {
    if [ "$SKIP_SEEDING" = "true" ]; then
        print_status "Seeding skipped (SKIP_SEEDING=true)"
        return 0
    fi

    # Check if seeding is actually needed
    if ! needs_seeding; then
        print_success "Database seeding skipped - users already exist"
        return 0
    fi

    print_status "Seeding database with initial users..."
    
    # Navigate to auth service directory
    cd ../../../  # Go back to auth-service root
    
    # Set up environment variables for seeding
    export MONGO_URI="mongodb://${DB_USERNAME}:${DB_PASSWORD}@${DB_ENDPOINT}:27017/auth-app?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
    export USE_AWS_SERVICES=true
    
    # Prepare seeding options
    local seed_options=""
    if [ "$CLEAR_USERS" = "true" ]; then
        seed_options="$seed_options --clear"
    fi
    
    if [ "$VERBOSE" = "false" ]; then
        seed_options="$seed_options --quiet"
    fi
    
    # Run the seeder
    if ! npx tsx scripts/seed-users.ts $seed_options; then
        print_error "Failed to seed database"
        return 1
    fi
    
    print_success "Database seeded successfully"
    return 0
}

# Function to print deployment summary
print_summary() {
    echo ""
    echo "=========================================="
    echo "🎉 DEPLOYMENT SUMMARY"
    echo "=========================================="
    echo "Environment: $ENVIRONMENT"
    echo "Stack Name: AuthServiceStack${ENVIRONMENT^}"
    
    if [ -n "$DB_ENDPOINT" ]; then
        echo "DocumentDB Endpoint: $DB_ENDPOINT"
    fi
    
    if [ "$SKIP_SEEDING" = "false" ]; then
        echo ""
        echo "👥 SEEDED USERS:"
        echo "  • Test Users:"
        echo "    - test@example.com / TestPassword123!"
        echo "    - admin@example.com / AdminPassword123!"
        echo "  • South Park Characters:"
        echo "    - stan.marsh@southpark.co / SouthPark123!"
        echo "    - kyle.broflovski@southpark.co / SouthPark123!"
        echo "    - eric.cartman@southpark.co / SouthPark123!"
        echo "    - kenny.mccormick@southpark.co / SouthPark123!"
        echo "    - And many more..."
        echo ""
        echo "💡 You can now test authentication with any of these users!"
    fi
    
    echo "=========================================="
}

# Main execution
main() {
    echo "🚀 Auth Service Deployment with Database Seeding"
    echo "Environment: $ENVIRONMENT"
    echo "Skip Seeding: $SKIP_SEEDING"
    echo "Clear Users: $CLEAR_USERS"
    echo ""
    
    # Pre-flight checks
    check_aws_cli
    check_cdk
    
    # Build and deploy
    build_cdk
    deploy_stack
    
    # Database seeding
    if get_db_connection; then
        wait_for_db
        seed_database
    else
        print_warning "Skipping database seeding due to connection issues"
    fi
    
    # Summary
    print_summary
    
    print_success "Deployment completed successfully! 🎉"
}

# Help function
show_help() {
    echo "Auth Service Deployment with Database Seeding"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Deployment environment (dev, staging, production)"
    echo "  -s, --skip-seeding       Skip database seeding"
    echo "  -c, --clear-users        Clear existing users before seeding"
    echo "  -q, --quiet              Suppress verbose output"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  ENVIRONMENT              Deployment environment (default: dev)"
    echo "  SKIP_SEEDING             Skip seeding (default: false)"
    echo "  CLEAR_USERS              Clear users before seeding (default: false)"
    echo "  VERBOSE                  Verbose output (default: true)"
    echo ""
    echo "Examples:"
    echo "  $0                       # Deploy to dev with seeding"
    echo "  $0 -e staging            # Deploy to staging"
    echo "  $0 -s                    # Deploy without seeding"
    echo "  $0 -c                    # Deploy and clear existing users"
    echo "  $0 -e production -s      # Deploy to production without seeding"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--skip-seeding)
            SKIP_SEEDING=true
            shift
            ;;
        -c|--clear-users)
            CLEAR_USERS=true
            shift
            ;;
        -q|--quiet)
            VERBOSE=false
            shift
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
