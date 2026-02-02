#!/bin/bash
#
# UAT Preflight Check Script
#
# Verifies that the environment is configured for real end-to-end testing
# with NO MOCKING before UAT tests can run.
#
# Reference: plans/stories/ADR-LOG.md → ADR-005
#
# Usage:
#   ./scripts/uat-preflight.sh [options]
#
# Options:
#   --env-file <path>    Path to .env file (default: apps/web/main-app/.env.development)
#   --api-url <url>      Override API URL (default: read from env file)
#   --verbose            Show detailed output
#   --help               Show this help
#
# Exit codes:
#   0 - All preconditions passed
#   1 - MSW is enabled (mocking detected)
#   2 - API health check failed
#   3 - Cognito check failed
#   4 - Configuration error

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Defaults
ENV_FILE="apps/web/main-app/.env.development"
API_URL=""
VERBOSE=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        --api-url)
            API_URL="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            head -30 "$0" | tail -25
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 4
            ;;
    esac
done

cd "$PROJECT_ROOT"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}           UAT Preflight Check (ADR-005)                   ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Track failures
FAILED=0

# ─────────────────────────────────────────────────────────────────────────────
# Check 1: MSW Disabled
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[1/3] Checking MSW configuration...${NC}"

MSW_VALUE=""
if [ -f "$ENV_FILE" ]; then
    MSW_VALUE=$(grep "^VITE_ENABLE_MSW=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "")
fi

# Also check for env var override
if [ -n "$VITE_ENABLE_MSW" ]; then
    MSW_VALUE="$VITE_ENABLE_MSW"
fi

if [ "$MSW_VALUE" = "true" ] || [ "$MSW_VALUE" = "1" ]; then
    echo -e "${RED}      ✗ FAIL: MSW is enabled (VITE_ENABLE_MSW=$MSW_VALUE)${NC}"
    echo ""
    echo -e "${RED}      UAT requires real services - mocking defeats the purpose.${NC}"
    echo ""
    echo "      To fix:"
    echo "        1. Edit $ENV_FILE"
    echo "        2. Set VITE_ENABLE_MSW=false (or remove the line)"
    echo "        3. Re-run this check"
    echo ""
    FAILED=1
else
    if [ -z "$MSW_VALUE" ]; then
        echo -e "${GREEN}      ✓ PASS: VITE_ENABLE_MSW not set (defaults to false)${NC}"
    else
        echo -e "${GREEN}      ✓ PASS: VITE_ENABLE_MSW=$MSW_VALUE${NC}"
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Check 2: API Reachable
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[2/3] Checking API health...${NC}"

# Get API URL from env file if not overridden
if [ -z "$API_URL" ] && [ -f "$ENV_FILE" ]; then
    API_URL=$(grep "^VITE_SERVERLESS_API_BASE_URL=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "")
fi

# Default to localhost backend if not set or same-origin
if [ -z "$API_URL" ] || [ "$API_URL" = "http://localhost:3002" ] || [ "$API_URL" = "/" ]; then
    API_URL="http://localhost:3001"
fi

HEALTH_URL="${API_URL}/health"
$VERBOSE && echo "      Checking: $HEALTH_URL"

if curl -sf "$HEALTH_URL" --max-time 5 > /dev/null 2>&1; then
    echo -e "${GREEN}      ✓ PASS: API responding at $HEALTH_URL${NC}"
else
    echo -e "${RED}      ✗ FAIL: API not reachable at $HEALTH_URL${NC}"
    echo ""
    echo "      To fix:"
    echo "        1. Start the backend: pnpm --filter lego-api dev"
    echo "        2. Or check VITE_SERVERLESS_API_BASE_URL in $ENV_FILE"
    echo "        3. Verify the API is running on the expected port"
    echo ""
    if [ $FAILED -eq 0 ]; then
        FAILED=2
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Check 3: Cognito Reachable
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[3/3] Checking Cognito connectivity...${NC}"

POOL_ID=""
REGION="us-east-1"

if [ -f "$ENV_FILE" ]; then
    POOL_ID=$(grep "^VITE_AWS_USER_POOL_ID=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "")
    REGION_FROM_FILE=$(grep "^VITE_AWS_REGION=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "")
    if [ -n "$REGION_FROM_FILE" ]; then
        REGION="$REGION_FROM_FILE"
    fi
fi

if [ -z "$POOL_ID" ]; then
    echo -e "${RED}      ✗ FAIL: VITE_AWS_USER_POOL_ID not found in $ENV_FILE${NC}"
    echo ""
    echo "      To fix:"
    echo "        1. Add VITE_AWS_USER_POOL_ID=<pool-id> to $ENV_FILE"
    echo ""
    if [ $FAILED -eq 0 ]; then
        FAILED=3
    fi
else
    JWKS_URL="https://cognito-idp.${REGION}.amazonaws.com/${POOL_ID}/.well-known/jwks.json"
    $VERBOSE && echo "      Checking: $JWKS_URL"

    JWKS_RESPONSE=$(curl -sf "$JWKS_URL" --max-time 5 2>/dev/null || echo "")

    if [ -n "$JWKS_RESPONSE" ] && echo "$JWKS_RESPONSE" | grep -q '"keys"'; then
        KEY_COUNT=$(echo "$JWKS_RESPONSE" | grep -o '"kid"' | wc -l | tr -d ' ')
        echo -e "${GREEN}      ✓ PASS: Cognito pool reachable ($KEY_COUNT keys found)${NC}"
        $VERBOSE && echo "      Pool ID: $POOL_ID"
        $VERBOSE && echo "      Region: $REGION"
    else
        echo -e "${RED}      ✗ FAIL: Cognito pool not reachable${NC}"
        echo ""
        echo "      Pool ID: $POOL_ID"
        echo "      Region: $REGION"
        echo "      JWKS URL: $JWKS_URL"
        echo ""
        echo "      To fix:"
        echo "        1. Verify VITE_AWS_USER_POOL_ID is correct"
        echo "        2. Check your network/VPN connection"
        echo "        3. Ensure the Cognito pool exists in $REGION"
        echo ""
        if [ $FAILED -eq 0 ]; then
            FAILED=3
        fi
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}  ✓ ALL PRECONDITIONS PASSED - UAT may proceed${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}  ✗ PRECONDITION CHECK FAILED - UAT BLOCKED${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${RED}UAT cannot run with mocked or unreachable services.${NC}"
    echo "The purpose of UAT is to test the REAL end-to-end flow."
    echo ""
    echo "Reference: plans/stories/ADR-LOG.md → ADR-005"
    echo ""
    exit $FAILED
fi
