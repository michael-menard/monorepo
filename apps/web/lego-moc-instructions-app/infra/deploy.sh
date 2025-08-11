#!/bin/bash

# =============================================================================
# Lego MOC Instructions App - Infrastructure Deployment Script
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INFRA_DIR="$SCRIPT_DIR"

# Default values
STAGE="dev"
REGION="us-east-1"
PROFILE="default"
VERBOSE=false
DRY_RUN=false
FORCE=false

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

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS] COMMAND

Commands:
    deploy      Deploy infrastructure
    remove      Remove infrastructure
    info        Show deployment information
    logs        Show function logs
    validate    Validate configuration
    build       Build functions
    clean       Clean build artifacts

Options:
    -s, --stage STAGE     Deployment stage (dev|staging|prod) [default: dev]
    -r, --region REGION   AWS region [default: us-east-1]
    -p, --profile PROFILE AWS profile [default: default]
    -v, --verbose         Enable verbose output
    -d, --dry-run         Show what would be deployed without actually deploying
    -f, --force           Force deployment without confirmation
    -h, --help            Show this help message

Examples:
    $0 deploy -s dev
    $0 deploy -s prod -f
    $0 remove -s dev
    $0 info -s staging
    $0 logs -s prod

EOF
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Serverless Framework is installed
    if ! command -v serverless &> /dev/null; then
        print_error "Serverless Framework is not installed. Please install it first: npm install -g serverless"
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity --profile "$PROFILE" &> /dev/null; then
        print_error "AWS credentials not configured for profile '$PROFILE'. Please run 'aws configure' first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to validate configuration
validate_configuration() {
    print_status "Validating configuration..."
    
    # Check if serverless.yml exists
    if [[ ! -f "$INFRA_DIR/serverless.yml" ]]; then
        print_error "serverless.yml not found in $INFRA_DIR"
        exit 1
    fi
    
    # Check if package.json exists
    if [[ ! -f "$INFRA_DIR/package.json" ]]; then
        print_error "package.json not found in $INFRA_DIR"
        exit 1
    fi
    
    # Validate stage
    case "$STAGE" in
        dev|staging|prod)
            ;;
        *)
            print_error "Invalid stage: $STAGE. Must be one of: dev, staging, prod"
            exit 1
            ;;
    esac
    
    print_success "Configuration validation passed"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    cd "$INFRA_DIR"
    
    if [[ ! -d "node_modules" ]]; then
        npm install
        print_success "Dependencies installed"
    else
        print_status "Dependencies already installed, skipping..."
    fi
}

# Function to build functions
build_functions() {
    print_status "Building Lambda functions..."
    
    cd "$INFRA_DIR"
    
    if [[ -f "webpack.config.js" ]]; then
        npm run build
        print_success "Functions built successfully"
    else
        print_warning "No webpack.config.js found, skipping build step"
    fi
}

# Function to validate deployment
validate_deployment() {
    print_status "Validating deployment configuration..."
    
    cd "$INFRA_DIR"
    
    if [[ "$DRY_RUN" == true ]]; then
        serverless package --dryrun --stage "$STAGE" --region "$REGION" --verbose
    else
        serverless package --dryrun --stage "$STAGE" --region "$REGION"
    fi
    
    print_success "Deployment validation passed"
}

# Function to deploy infrastructure
deploy_infrastructure() {
    print_status "Deploying infrastructure to $STAGE stage in $REGION region..."
    
    cd "$INFRA_DIR"
    
    # Build functions first
    build_functions
    
    # Deploy with serverless
    local deploy_cmd="serverless deploy --stage $STAGE --region $REGION"
    
    if [[ "$VERBOSE" == true ]]; then
        deploy_cmd="$deploy_cmd --verbose"
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        print_warning "DRY RUN MODE - No actual deployment will occur"
        serverless deploy --dryrun --stage "$STAGE" --region "$REGION" --verbose
    else
        eval "$deploy_cmd"
        print_success "Infrastructure deployed successfully"
    fi
}

# Function to remove infrastructure
remove_infrastructure() {
    print_status "Removing infrastructure from $STAGE stage in $REGION region..."
    
    if [[ "$FORCE" != true ]]; then
        echo -n "Are you sure you want to remove all infrastructure for stage '$STAGE'? (y/N): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            print_warning "Removal cancelled"
            exit 0
        fi
    fi
    
    cd "$INFRA_DIR"
    
    local remove_cmd="serverless remove --stage $STAGE --region $REGION"
    
    if [[ "$VERBOSE" == true ]]; then
        remove_cmd="$remove_cmd --verbose"
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        print_warning "DRY RUN MODE - No actual removal will occur"
        serverless remove --dryrun --stage "$STAGE" --region "$REGION" --verbose
    else
        eval "$remove_cmd"
        print_success "Infrastructure removed successfully"
    fi
}

# Function to show deployment info
show_info() {
    print_status "Showing deployment information for $STAGE stage..."
    
    cd "$INFRA_DIR"
    
    serverless info --stage "$STAGE" --region "$REGION"
}

# Function to show logs
show_logs() {
    print_status "Showing function logs for $STAGE stage..."
    
    cd "$INFRA_DIR"
    
    serverless logs --stage "$STAGE" --region "$REGION" --tail
}

# Function to clean build artifacts
clean_artifacts() {
    print_status "Cleaning build artifacts..."
    
    cd "$INFRA_DIR"
    
    # Remove node_modules if it exists
    if [[ -d "node_modules" ]]; then
        rm -rf node_modules
        print_status "Removed node_modules"
    fi
    
    # Remove .serverless directory if it exists
    if [[ -d ".serverless" ]]; then
        rm -rf .serverless
        print_status "Removed .serverless directory"
    fi
    
    # Remove dist directory if it exists
    if [[ -d "dist" ]]; then
        rm -rf dist
        print_status "Removed dist directory"
    fi
    
    # Remove package-lock.json if it exists
    if [[ -f "package-lock.json" ]]; then
        rm package-lock.json
        print_status "Removed package-lock.json"
    fi
    
    print_success "Cleanup completed"
}

# Function to show deployment summary
show_deployment_summary() {
    print_status "Deployment Summary:"
    echo "  Stage: $STAGE"
    echo "  Region: $REGION"
    echo "  Profile: $PROFILE"
    echo "  Verbose: $VERBOSE"
    echo "  Dry Run: $DRY_RUN"
    echo "  Force: $FORCE"
    echo ""
}

# Main script logic
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -s|--stage)
                STAGE="$2"
                shift 2
                ;;
            -r|--region)
                REGION="$2"
                shift 2
                ;;
            -p|--profile)
                PROFILE="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            deploy|remove|info|logs|validate|build|clean)
                COMMAND="$1"
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Check if command is provided
    if [[ -z "$COMMAND" ]]; then
        print_error "No command specified"
        show_usage
        exit 1
    fi
    
    # Show deployment summary
    show_deployment_summary
    
    # Execute command
    case "$COMMAND" in
        deploy)
            check_prerequisites
            validate_configuration
            install_dependencies
            validate_deployment
            deploy_infrastructure
            ;;
        remove)
            check_prerequisites
            validate_configuration
            remove_infrastructure
            ;;
        info)
            check_prerequisites
            validate_configuration
            show_info
            ;;
        logs)
            check_prerequisites
            validate_configuration
            show_logs
            ;;
        validate)
            check_prerequisites
            validate_configuration
            validate_deployment
            ;;
        build)
            check_prerequisites
            validate_configuration
            install_dependencies
            build_functions
            ;;
        clean)
            clean_artifacts
            ;;
        *)
            print_error "Unknown command: $COMMAND"
            show_usage
            exit 1
            ;;
    esac
    
    print_success "Command '$COMMAND' completed successfully"
}

# Run main function with all arguments
main "$@" 