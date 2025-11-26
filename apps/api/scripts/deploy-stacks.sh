#!/bin/bash
# Deploy LEGO API Serverless Stacks
#
# This script orchestrates the deployment of all serverless stacks in the correct order.
# Each stack can also be deployed independently by running serverless directly.
#
# Usage:
#   ./scripts/deploy-stacks.sh [options] [command]
#
# Commands:
#   all           Deploy all stacks (default)
#   infrastructure Deploy only infrastructure stacks
#   functions     Deploy only function stacks
#   <stack-name>  Deploy a specific stack (e.g., database, gallery)
#
# Options:
#   --stage       Stage to deploy (default: dev)
#   --parallel    Deploy independent stacks in parallel
#   --dry-run     Show what would be deployed without deploying
#   --verbose     Show detailed output
#
# Examples:
#   ./scripts/deploy-stacks.sh --stage dev all
#   ./scripts/deploy-stacks.sh --stage staging infrastructure
#   ./scripts/deploy-stacks.sh --stage dev database
#   ./scripts/deploy-stacks.sh --stage dev gallery --parallel

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
STAGE="dev"
COMMAND="all"
PARALLEL=false
DRY_RUN=false
VERBOSE=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACKS_DIR="$(dirname "$SCRIPT_DIR")/stacks"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --stage)
      STAGE="$2"
      shift 2
      ;;
    --parallel)
      PARALLEL=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    -h|--help)
      head -30 "$0" | tail -28
      exit 0
      ;;
    *)
      COMMAND="$1"
      shift
      ;;
  esac
done

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Deploy a single stack
deploy_stack() {
  local stack_path="$1"
  local stack_name="$2"

  log_info "Deploying $stack_name..."

  if [ "$DRY_RUN" = true ]; then
    echo "  Would run: pnpm serverless deploy --config $stack_path --stage $STAGE"
    return 0
  fi

  local cmd="pnpm serverless deploy --config $stack_path --stage $STAGE"
  if [ "$VERBOSE" = true ]; then
    $cmd
  else
    $cmd 2>&1 | grep -E "(Deploying|Service|Stack|Error|Warning|endpoints)" || true
  fi

  log_success "$stack_name deployed successfully"
}

# Deploy multiple stacks in parallel
deploy_parallel() {
  local stacks=("$@")
  local pids=()

  for stack in "${stacks[@]}"; do
    local stack_path="${STACKS_DIR}/${stack}"
    local stack_name=$(basename "$stack" .yml)

    if [ "$DRY_RUN" = true ]; then
      echo "  Would run (parallel): pnpm serverless deploy --config $stack_path --stage $STAGE"
    else
      log_info "Starting parallel deployment of $stack_name..."
      pnpm serverless deploy --config "$stack_path" --stage "$STAGE" &
      pids+=($!)
    fi
  done

  # Wait for all parallel deployments
  if [ "$DRY_RUN" = false ]; then
    for pid in "${pids[@]}"; do
      wait $pid || { log_error "A parallel deployment failed"; exit 1; }
    done
    log_success "All parallel deployments completed"
  fi
}

# Infrastructure stacks in dependency order
INFRA_STACKS_LAYER1=(
  "infrastructure/network.yml"
)

INFRA_STACKS_LAYER2=(
  "infrastructure/security.yml"
  "infrastructure/storage.yml"
  "infrastructure/auth.yml"
  "infrastructure/realtime.yml"
)

INFRA_STACKS_LAYER3=(
  "infrastructure/database.yml"
  "infrastructure/search.yml"
)

# Function stacks (all depend on infrastructure)
FUNCTION_STACKS=(
  "functions/health.yml"
  "functions/gallery.yml"
  "functions/moc-instructions.yml"
  "functions/wishlist.yml"
  "functions/parts-lists.yml"
  "functions/websocket.yml"
)

# Monitoring stack (deploy last)
MONITORING_STACK="infrastructure/monitoring.yml"

# Deploy infrastructure stacks
deploy_infrastructure() {
  log_info "=== Deploying Infrastructure Stacks ==="

  # Layer 1: Network (foundation)
  log_info "Layer 1: Network"
  deploy_stack "${STACKS_DIR}/infrastructure/network.yml" "network"

  # Layer 2: Security, Storage, Auth, Realtime (depend on network)
  log_info "Layer 2: Security, Storage, Auth, Realtime"
  if [ "$PARALLEL" = true ]; then
    deploy_parallel "${INFRA_STACKS_LAYER2[@]}"
  else
    for stack in "${INFRA_STACKS_LAYER2[@]}"; do
      deploy_stack "${STACKS_DIR}/${stack}" "$(basename "$stack" .yml)"
    done
  fi

  # Layer 3: Database, Search (depend on network + security)
  log_info "Layer 3: Database, Search"
  if [ "$PARALLEL" = true ]; then
    deploy_parallel "${INFRA_STACKS_LAYER3[@]}"
  else
    for stack in "${INFRA_STACKS_LAYER3[@]}"; do
      deploy_stack "${STACKS_DIR}/${stack}" "$(basename "$stack" .yml)"
    done
  fi

  log_success "=== Infrastructure deployment complete ==="
}

# Deploy function stacks
deploy_functions() {
  log_info "=== Deploying Function Stacks ==="

  if [ "$PARALLEL" = true ]; then
    deploy_parallel "${FUNCTION_STACKS[@]}"
  else
    for stack in "${FUNCTION_STACKS[@]}"; do
      deploy_stack "${STACKS_DIR}/${stack}" "$(basename "$stack" .yml)"
    done
  fi

  log_success "=== Function deployment complete ==="
}

# Deploy monitoring stack
deploy_monitoring() {
  log_info "=== Deploying Monitoring Stack ==="
  deploy_stack "${STACKS_DIR}/${MONITORING_STACK}" "monitoring"
  log_success "=== Monitoring deployment complete ==="
}

# Deploy a single named stack
deploy_single() {
  local name="$1"
  local found=false

  # Check infrastructure stacks
  for stack in "${INFRA_STACKS_LAYER1[@]}" "${INFRA_STACKS_LAYER2[@]}" "${INFRA_STACKS_LAYER3[@]}"; do
    if [[ "$(basename "$stack" .yml)" == "$name" ]]; then
      deploy_stack "${STACKS_DIR}/${stack}" "$name"
      found=true
      break
    fi
  done

  # Check function stacks
  if [ "$found" = false ]; then
    for stack in "${FUNCTION_STACKS[@]}"; do
      if [[ "$(basename "$stack" .yml)" == "$name" ]]; then
        deploy_stack "${STACKS_DIR}/${stack}" "$name"
        found=true
        break
      fi
    done
  fi

  # Check monitoring
  if [ "$found" = false ] && [ "$name" = "monitoring" ]; then
    deploy_stack "${STACKS_DIR}/${MONITORING_STACK}" "monitoring"
    found=true
  fi

  if [ "$found" = false ]; then
    log_error "Unknown stack: $name"
    log_info "Available stacks: network, security, storage, auth, realtime, database, search, health, gallery, moc-instructions, wishlist, parts-lists, websocket, monitoring"
    exit 1
  fi
}

# Main execution
log_info "LEGO API Stack Deployment"
log_info "Stage: $STAGE"
log_info "Command: $COMMAND"
log_info "Parallel: $PARALLEL"
log_info "Dry run: $DRY_RUN"
echo ""

case "$COMMAND" in
  all)
    deploy_infrastructure
    deploy_functions
    deploy_monitoring
    ;;
  infrastructure|infra)
    deploy_infrastructure
    ;;
  functions|funcs)
    deploy_functions
    ;;
  monitoring)
    deploy_monitoring
    ;;
  *)
    deploy_single "$COMMAND"
    ;;
esac

echo ""
log_success "Deployment complete!"
