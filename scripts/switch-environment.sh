#!/bin/bash

# Environment Switching Script
# Helps developers switch between local Docker and AWS services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to update environment variable in .env file
update_env_var() {
    local var_name="$1"
    local var_value="$2"
    local comment_prefix="$3"
    
    if grep -q "^${comment_prefix}${var_name}=" "$ENV_FILE"; then
        # Variable exists (possibly commented), update it
        sed -i.bak "s|^${comment_prefix}${var_name}=.*|${var_name}=${var_value}|" "$ENV_FILE"
    elif grep -q "^${var_name}=" "$ENV_FILE"; then
        # Variable exists uncommented, update it
        sed -i.bak "s|^${var_name}=.*|${var_name}=${var_value}|" "$ENV_FILE"
    else
        # Variable doesn't exist, add it
        echo "${var_name}=${var_value}" >> "$ENV_FILE"
    fi
}

# Function to comment/uncomment environment variable
toggle_env_var() {
    local var_name="$1"
    local should_comment="$2"
    
    if [ "$should_comment" = "true" ]; then
        # Comment the variable
        sed -i.bak "s|^${var_name}=|# ${var_name}=|" "$ENV_FILE"
    else
        # Uncomment the variable
        sed -i.bak "s|^# ${var_name}=|${var_name}=|" "$ENV_FILE"
    fi
}

# Function to get AWS Load Balancer DNS names
get_aws_endpoints() {
    local environment="${1:-dev}"
    
    print_info "Fetching AWS Load Balancer endpoints for environment: $environment"
    
    # Get Auth Service Load Balancer DNS
    local auth_lb_dns
    auth_lb_dns=$(aws cloudformation describe-stacks \
        --stack-name "AuthServiceStack${environment^}" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    # Get LEGO Projects API Load Balancer DNS
    local lego_lb_dns
    lego_lb_dns=$(aws cloudformation describe-stacks \
        --stack-name "LegoApiStack${environment^}" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$auth_lb_dns" ] && [ -n "$lego_lb_dns" ]; then
        echo "https://$lego_lb_dns"
        echo "https://$auth_lb_dns/api/auth"
    else
        print_warning "Could not fetch AWS endpoints. Using placeholder URLs."
        echo "https://lego-api-${environment}-alb.us-east-1.elb.amazonaws.com"
        echo "https://auth-service-${environment}-alb.us-east-1.elb.amazonaws.com/api/auth"
    fi
}

# Function to switch to local mode
switch_to_local() {
    print_info "Switching to LOCAL development mode..."
    
    # Update main configuration
    update_env_var "USE_AWS_SERVICES" "false"
    update_env_var "NODE_ENV" "development"
    
    # Comment out AWS frontend variables
    toggle_env_var "VITE_USE_AWS_SERVICES" "true"
    toggle_env_var "VITE_API_BASE_URL" "true"
    toggle_env_var "VITE_AUTH_API_URL" "true"
    toggle_env_var "VITE_ENVIRONMENT" "true"
    
    # Comment out AWS backend variables
    toggle_env_var "MONGODB_URI" "true"
    toggle_env_var "MONGODB_TLS_CA_FILE" "true"
    toggle_env_var "REDIS_HOST" "true"
    toggle_env_var "REDIS_PORT" "true"
    toggle_env_var "OPENSEARCH_ENDPOINT" "true"
    toggle_env_var "OPENSEARCH_DISABLED" "true"
    
    print_status "Switched to LOCAL mode"
    print_info "Services will use Docker containers:"
    print_info "  - PostgreSQL: localhost:5432"
    print_info "  - MongoDB: localhost:27017"
    print_info "  - Redis: localhost:6379"
    print_info "  - Frontend: http://localhost:3002"
    print_info ""
    print_info "Start services with: pnpm dev"
}

# Function to switch to AWS mode
switch_to_aws() {
    local environment="${1:-dev}"
    
    print_info "Switching to AWS mode for environment: $environment"
    
    # Get AWS endpoints
    local endpoints
    endpoints=($(get_aws_endpoints "$environment"))
    local api_url="${endpoints[0]}"
    local auth_url="${endpoints[1]}"
    
    # Update main configuration
    update_env_var "USE_AWS_SERVICES" "true"
    update_env_var "NODE_ENV" "development"
    
    # Update frontend AWS variables
    update_env_var "VITE_USE_AWS_SERVICES" "true"
    update_env_var "VITE_API_BASE_URL" "$api_url"
    update_env_var "VITE_AUTH_API_URL" "$auth_url"
    update_env_var "VITE_ENVIRONMENT" "$environment"
    
    # Uncomment AWS frontend variables
    toggle_env_var "VITE_USE_AWS_SERVICES" "false"
    toggle_env_var "VITE_API_BASE_URL" "false"
    toggle_env_var "VITE_AUTH_API_URL" "false"
    toggle_env_var "VITE_ENVIRONMENT" "false"
    
    # Enable AWS backend services
    update_env_var "OPENSEARCH_DISABLED" "true"
    toggle_env_var "OPENSEARCH_DISABLED" "false"
    
    print_status "Switched to AWS mode for environment: $environment"
    print_info "Services will use AWS infrastructure:"
    print_info "  - API: $api_url"
    print_info "  - Auth: $auth_url"
    print_info "  - Frontend: http://localhost:3002 (local dev server)"
    print_info ""
    print_warning "Make sure AWS services are deployed and accessible!"
    print_info "Start frontend with: pnpm dev:web"
}

# Function to show current status
show_status() {
    print_info "Current Environment Configuration:"
    echo ""
    
    local use_aws_services
    use_aws_services=$(grep "^USE_AWS_SERVICES=" "$ENV_FILE" | cut -d'=' -f2 || echo "false")
    
    local vite_use_aws
    vite_use_aws=$(grep "^VITE_USE_AWS_SERVICES=" "$ENV_FILE" | cut -d'=' -f2 2>/dev/null || echo "false")
    
    if [ "$use_aws_services" = "true" ] || [ "$vite_use_aws" = "true" ]; then
        print_status "Mode: AWS Services"
        
        local api_url
        api_url=$(grep "^VITE_API_BASE_URL=" "$ENV_FILE" | cut -d'=' -f2- 2>/dev/null || echo "Not configured")
        
        local auth_url
        auth_url=$(grep "^VITE_AUTH_API_URL=" "$ENV_FILE" | cut -d'=' -f2- 2>/dev/null || echo "Not configured")
        
        echo "  API URL: $api_url"
        echo "  Auth URL: $auth_url"
    else
        print_status "Mode: Local Development"
        echo "  Using Docker containers for all services"
    fi
    
    echo ""
}

# Main script logic
case "${1:-}" in
    "local")
        switch_to_local
        ;;
    "aws")
        switch_to_aws "${2:-dev}"
        ;;
    "status")
        show_status
        ;;
    *)
        echo "Environment Switching Script"
        echo ""
        echo "Usage: $0 <command> [environment]"
        echo ""
        echo "Commands:"
        echo "  local           Switch to local Docker development mode"
        echo "  aws [env]       Switch to AWS services mode (default: dev)"
        echo "  status          Show current environment configuration"
        echo ""
        echo "Examples:"
        echo "  $0 local                    # Use local Docker services"
        echo "  $0 aws dev                  # Use AWS dev environment"
        echo "  $0 aws production           # Use AWS production environment"
        echo "  $0 status                   # Show current configuration"
        echo ""
        exit 1
        ;;
esac

# Clean up backup files
rm -f "$ENV_FILE.bak"

print_status "Environment switch complete!"
print_info "Restart your development servers to apply changes."
