#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="lego-moc"

# Help text
show_help() {
    echo "Usage: $0 <environment> [stack] [--delete]"
    echo ""
    echo "Arguments:"
    echo "  environment    dev, staging, or production"
    echo "  stack          Optional: cognito, image-cdn, frontend-hosting, or all (default: all)"
    echo "  --delete       Delete stacks instead of deploying"
    echo ""
    echo "Examples:"
    echo "  $0 dev                    # Deploy all stacks to dev"
    echo "  $0 dev cognito            # Deploy only cognito stack to dev"
    echo "  $0 production --delete    # Delete all production stacks"
    echo ""
}

# Validate environment
validate_env() {
    case $1 in
        dev|staging|production)
            return 0
            ;;
        *)
            echo -e "${RED}Error: Invalid environment '$1'. Must be dev, staging, or production.${NC}"
            exit 1
            ;;
    esac
}

# Deploy a single stack
deploy_stack() {
    local env=$1
    local stack=$2
    local stack_name="${PROJECT_NAME}-${stack}-${env}"
    local template_path="./${stack}/template.yaml"

    if [[ ! -f "$template_path" ]]; then
        echo -e "${RED}Error: Template not found: $template_path${NC}"
        return 1
    fi

    echo -e "${YELLOW}Deploying ${stack_name}...${NC}"

    # Build parameters based on environment
    local params="Environment=${env}"

    # Add production-specific parameters
    if [[ "$env" == "production" ]]; then
        case $stack in
            cognito)
                params="${params} CallbackUrls=https://lego-moc-instructions.com/auth/callback"
                params="${params} LogoutUrls=https://lego-moc-instructions.com/auth/logout"
                ;;
        esac
    fi

    aws cloudformation deploy \
        --template-file "$template_path" \
        --stack-name "$stack_name" \
        --parameter-overrides $params \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$REGION" \
        --no-fail-on-empty-changeset

    echo -e "${GREEN}✓ Deployed ${stack_name}${NC}"

    # Show outputs
    echo ""
    echo "Stack outputs:"
    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
        --output table \
        --region "$REGION" 2>/dev/null || true
    echo ""
}

# Delete a single stack
delete_stack() {
    local env=$1
    local stack=$2
    local stack_name="${PROJECT_NAME}-${stack}-${env}"

    echo -e "${YELLOW}Deleting ${stack_name}...${NC}"

    # Check if stack exists
    if ! aws cloudformation describe-stacks --stack-name "$stack_name" --region "$REGION" &>/dev/null; then
        echo -e "${YELLOW}Stack ${stack_name} does not exist, skipping.${NC}"
        return 0
    fi

    # Warning for production
    if [[ "$env" == "production" ]]; then
        echo -e "${RED}WARNING: You are about to delete a PRODUCTION stack!${NC}"
        read -p "Type 'yes' to confirm: " confirm
        if [[ "$confirm" != "yes" ]]; then
            echo "Aborted."
            return 1
        fi
    fi

    aws cloudformation delete-stack \
        --stack-name "$stack_name" \
        --region "$REGION"

    echo "Waiting for stack deletion..."
    aws cloudformation wait stack-delete-complete \
        --stack-name "$stack_name" \
        --region "$REGION"

    echo -e "${GREEN}✓ Deleted ${stack_name}${NC}"
}

# Main script
main() {
    local env=""
    local stack="all"
    local delete=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_help
                exit 0
                ;;
            --delete)
                delete=true
                shift
                ;;
            dev|staging|production)
                env=$1
                shift
                ;;
            cognito|image-cdn|frontend-hosting|monitoring|all)
                stack=$1
                shift
                ;;
            *)
                echo -e "${RED}Unknown argument: $1${NC}"
                show_help
                exit 1
                ;;
        esac
    done

    # Validate environment
    if [[ -z "$env" ]]; then
        echo -e "${RED}Error: Environment is required.${NC}"
        show_help
        exit 1
    fi

    validate_env "$env"

    # Change to infra directory
    cd "$(dirname "$0")"

    # Define stack order
    local stacks=()
    if [[ "$stack" == "all" ]]; then
        stacks=("cognito" "image-cdn" "frontend-hosting")
    else
        stacks=("$stack")
    fi

    # Execute
    if $delete; then
        # Delete in reverse order
        for ((i=${#stacks[@]}-1; i>=0; i--)); do
            delete_stack "$env" "${stacks[$i]}"
        done
    else
        for s in "${stacks[@]}"; do
            deploy_stack "$env" "$s"
        done
    fi

    echo ""
    echo -e "${GREEN}Done!${NC}"
}

main "$@"
