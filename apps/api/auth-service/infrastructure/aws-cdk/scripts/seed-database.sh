#!/bin/bash

# Seed Auth Service Database
# This script seeds the database with initial users (can be run independently)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${ENVIRONMENT:-dev}
CLEAR_USERS=${CLEAR_USERS:-false}
VERBOSE=${VERBOSE:-true}
FORCE_SEED=${FORCE_SEED:-false}

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
        print_error "Could not retrieve DocumentDB endpoint from CloudFormation"
        print_error "Make sure the Auth Service stack is deployed first"
        exit 1
    fi
    
    # Get database credentials from Secrets Manager
    SECRET_ARN=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query 'Stacks[0].Outputs[?OutputKey==`DatabaseSecretArn`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$SECRET_ARN" ]; then
        print_error "Could not retrieve database secret ARN from CloudFormation"
        exit 1
    fi
    
    # Get credentials from Secrets Manager
    DB_CREDENTIALS=$(aws secretsmanager get-secret-value \
        --secret-id "$SECRET_ARN" \
        --query 'SecretString' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$DB_CREDENTIALS" ]; then
        print_error "Could not retrieve database credentials from Secrets Manager"
        exit 1
    fi
    
    # Parse credentials
    DB_USERNAME=$(echo "$DB_CREDENTIALS" | jq -r '.username')
    DB_PASSWORD=$(echo "$DB_CREDENTIALS" | jq -r '.password')
    
    if [ "$DB_USERNAME" = "null" ] || [ "$DB_PASSWORD" = "null" ]; then
        print_error "Could not parse database credentials"
        exit 1
    fi
    
    # Construct MongoDB URI
    export MONGO_URI="mongodb://${DB_USERNAME}:${DB_PASSWORD}@${DB_ENDPOINT}:27017/auth-app?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
    
    print_success "Retrieved DocumentDB connection details"
    return 0
}

# Function to check if database needs seeding
needs_seeding() {
    print_status "Checking if database needs seeding..."
    
    # Try to connect and count existing users
    local user_count
    user_count=$(timeout 30 mongosh "$MONGO_URI" --quiet --eval "db.users.countDocuments({})" 2>/dev/null || echo "0")
    
    if [ "$user_count" = "0" ] || [ -z "$user_count" ]; then
        print_status "Database is empty - seeding needed"
        return 0
    else
        print_status "Database already has $user_count users"
        if [ "$CLEAR_USERS" = "true" ] || [ "$FORCE_SEED" = "true" ]; then
            print_status "Force seeding enabled - will clear and reseed"
            return 0
        else
            print_warning "Database already has users. Use --clear or --force to reseed"
            return 1
        fi
    fi
}

# Function to seed the database
seed_database() {
    print_status "Seeding database with initial users..."
    
    # Navigate to auth service directory
    cd ../../../  # Go back to auth-service root
    
    # Set up environment variables for seeding
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
        exit 1
    fi
    
    print_success "Database seeded successfully"
    return 0
}

# Function to print seeding summary
print_summary() {
    echo ""
    echo "=========================================="
    echo "👥 DATABASE SEEDING SUMMARY"
    echo "=========================================="
    echo "Environment: $ENVIRONMENT"
    echo "DocumentDB Endpoint: $DB_ENDPOINT"
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
    echo "=========================================="
}

# Main execution
main() {
    echo "👥 Auth Service Database Seeding"
    echo "Environment: $ENVIRONMENT"
    echo "Clear Users: $CLEAR_USERS"
    echo "Force Seed: $FORCE_SEED"
    echo ""
    
    # Get database connection details
    get_db_connection
    
    # Check if seeding is needed
    if needs_seeding; then
        seed_database
        print_summary
        print_success "Database seeding completed successfully! 🎉"
    else
        print_success "Database seeding skipped - users already exist"
        echo ""
        echo "💡 To force seeding anyway:"
        echo "   $0 --clear    # Clear existing users and reseed"
        echo "   $0 --force    # Force seed (may create duplicates)"
    fi
}

# Help function
show_help() {
    echo "Auth Service Database Seeding"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Target environment (dev, staging, production)"
    echo "  -c, --clear              Clear existing users before seeding"
    echo "  -f, --force              Force seeding even if users exist"
    echo "  -q, --quiet              Suppress verbose output"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  ENVIRONMENT              Target environment (default: dev)"
    echo "  CLEAR_USERS              Clear users before seeding (default: false)"
    echo "  FORCE_SEED               Force seeding (default: false)"
    echo "  VERBOSE                  Verbose output (default: true)"
    echo ""
    echo "Examples:"
    echo "  $0                       # Seed dev database (if empty)"
    echo "  $0 -e staging            # Seed staging database"
    echo "  $0 -c                    # Clear and reseed dev database"
    echo "  $0 -f                    # Force seed (may create duplicates)"
    echo "  $0 -e production -c      # Clear and seed production database"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -c|--clear)
            CLEAR_USERS=true
            shift
            ;;
        -f|--force)
            FORCE_SEED=true
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
