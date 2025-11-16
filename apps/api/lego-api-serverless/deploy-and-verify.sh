#!/bin/bash

###############################################################################
# Deploy and Verify Script for Epic 1 - Story 1.8
#
# This script automates the deployment and verification of the health check
# Lambda function and supporting infrastructure.
#
# Usage:
#   ./deploy-and-verify.sh [dev|staging|production]
#
# Default stage: dev
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Stage argument (default: dev)
STAGE="${1:-dev}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SST Infrastructure Deployment${NC}"
echo -e "${BLUE}Stage: ${STAGE}${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Step 1: Check prerequisites
echo -e "${YELLOW}[1/8] Checking prerequisites...${NC}"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}✗ Node.js >= 20 required (found: $(node -v))${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js version: $(node -v)${NC}"

# Check AWS credentials
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}✗ AWS credentials not configured${NC}"
    exit 1
fi
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")
echo -e "${GREEN}✓ AWS Account: ${AWS_ACCOUNT}${NC}"
echo -e "${GREEN}✓ AWS Region: ${AWS_REGION}${NC}"

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}✗ pnpm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ pnpm version: $(pnpm -v)${NC}\n"

# Step 2: Install dependencies
echo -e "${YELLOW}[2/8] Installing dependencies...${NC}"
pnpm install --frozen-lockfile
echo -e "${GREEN}✓ Dependencies installed${NC}\n"

# Step 3: TypeScript compilation check
echo -e "${YELLOW}[3/8] Verifying TypeScript compilation...${NC}"
pnpm check-types
echo -e "${GREEN}✓ TypeScript compilation successful${NC}\n"

# Step 4: Bootstrap SST (if needed)
echo -e "${YELLOW}[4/8] Checking SST bootstrap status...${NC}"
if aws s3 ls "s3://sst-state-${AWS_ACCOUNT}-${AWS_REGION}" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ SST already bootstrapped${NC}\n"
else
    echo -e "${YELLOW}Bootstrapping SST...${NC}"
    pnpm sst bootstrap
    echo -e "${GREEN}✓ SST bootstrap complete${NC}\n"
fi

# Step 5: Deploy infrastructure
echo -e "${YELLOW}[5/8] Deploying infrastructure to stage: ${STAGE}${NC}"
echo -e "${YELLOW}This may take 15-25 minutes for first deployment...${NC}\n"

if [ "$STAGE" == "dev" ]; then
    pnpm deploy
elif [ "$STAGE" == "staging" ]; then
    pnpm deploy:staging
elif [ "$STAGE" == "production" ]; then
    echo -e "${RED}WARNING: Deploying to PRODUCTION${NC}"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
    pnpm deploy:production
else
    pnpm sst deploy --stage "$STAGE"
fi

echo -e "\n${GREEN}✓ Deployment complete${NC}\n"

# Step 6: Extract outputs
echo -e "${YELLOW}[6/8] Extracting deployment outputs...${NC}"

# Get outputs from SST
# Note: SST v3 stores outputs differently - this is a placeholder
# You may need to adjust based on actual SST v3 output format
API_URL=$(pnpm sst outputs --stage "$STAGE" 2>/dev/null | grep apiUrl | awk '{print $2}' || echo "")

if [ -z "$API_URL" ]; then
    echo -e "${YELLOW}⚠ Could not auto-detect API URL${NC}"
    echo -e "${YELLOW}Please check outputs manually: pnpm sst outputs --stage ${STAGE}${NC}\n"
    read -p "Enter API URL: " API_URL
fi

echo -e "${GREEN}✓ API URL: ${API_URL}${NC}\n"

# Step 7: Test health endpoint
echo -e "${YELLOW}[7/8] Testing health endpoint...${NC}"
echo -e "Endpoint: ${API_URL}/health\n"

RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo -e "${BLUE}HTTP Status: ${HTTP_CODE}${NC}"
echo -e "${BLUE}Response:${NC}"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" == "200" ]; then
    STATUS=$(echo "$BODY" | jq -r '.data.status' 2>/dev/null || echo "unknown")

    if [ "$STATUS" == "healthy" ]; then
        echo -e "\n${GREEN}✓ Health check PASSED - All services healthy${NC}"
    elif [ "$STATUS" == "degraded" ]; then
        echo -e "\n${YELLOW}⚠ Health check DEGRADED - Some services down${NC}"
        echo "$BODY" | jq '.data.services' 2>/dev/null
    else
        echo -e "\n${YELLOW}⚠ Health check returned unexpected status: ${STATUS}${NC}"
    fi
elif [ "$HTTP_CODE" == "503" ]; then
    echo -e "\n${RED}✗ Health check FAILED - Critical service unavailable${NC}"
    echo "$BODY" | jq '.error' 2>/dev/null
else
    echo -e "\n${RED}✗ Unexpected HTTP status: ${HTTP_CODE}${NC}"
fi

echo ""

# Step 8: Verify CloudWatch Logs
echo -e "${YELLOW}[8/8] Checking CloudWatch Logs...${NC}"

# Find Lambda log group
LOG_GROUP="/aws/lambda/lego-api-serverless-${STAGE}-HealthCheckFunction"

if aws logs describe-log-groups --log-group-name-prefix "$LOG_GROUP" | grep -q "$LOG_GROUP"; then
    echo -e "${GREEN}✓ CloudWatch Log Group exists: ${LOG_GROUP}${NC}"

    echo -e "\n${BLUE}Recent logs (last 5 minutes):${NC}"
    aws logs tail "$LOG_GROUP" --since 5m --format short 2>/dev/null | head -n 20
else
    echo -e "${YELLOW}⚠ Could not find log group: ${LOG_GROUP}${NC}"
    echo -e "${YELLOW}Logs may not be available yet or log group name may differ${NC}"
fi

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Deployment Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Stage:${NC} ${STAGE}"
echo -e "${GREEN}API URL:${NC} ${API_URL}"
echo -e "${GREEN}Health Endpoint:${NC} ${API_URL}/health"
echo -e "${GREEN}CloudWatch Logs:${NC} ${LOG_GROUP}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Review deployment outputs: ${BLUE}pnpm sst outputs --stage ${STAGE}${NC}"
echo -e "2. Monitor logs: ${BLUE}aws logs tail ${LOG_GROUP} --follow${NC}"
echo -e "3. Run database migrations: ${BLUE}pnpm db:migrate${NC}"
echo -e "4. Open Drizzle Studio: ${BLUE}pnpm db:studio${NC}"
echo -e "5. View in SST Console: ${BLUE}pnpm sst dev${NC} then visit console URL\n"

echo -e "${GREEN}✓ Deployment and verification complete!${NC}\n"
