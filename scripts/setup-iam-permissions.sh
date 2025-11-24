#!/bin/bash

# Setup IAM Permissions for SST Deployment
# This script must be run with AWS credentials that have IAM admin permissions

set -e

echo "🔐 Setting up IAM permissions for SST deployment..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ACCOUNT_ID="213351177820"
USER_NAME="lego-moc-deployer"
POLICY_NAME="SST-Deployment-Policy"
POLICY_FILE="infrastructure/iam-policies/complete-sst-deployment-policy.json"

# Check if policy file exists
if [ ! -f "$POLICY_FILE" ]; then
    echo -e "${RED}❌ Error: Policy file not found at $POLICY_FILE${NC}"
    exit 1
fi

echo "📋 Configuration:"
echo "  AWS Account: $ACCOUNT_ID"
echo "  IAM User: $USER_NAME"
echo "  Policy Name: $POLICY_NAME"
echo ""

# Check current AWS identity
echo "🔍 Checking AWS credentials..."
CURRENT_USER=$(aws sts get-caller-identity --query 'Arn' --output text 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: No AWS credentials configured or invalid credentials${NC}"
    echo "Please run: aws configure"
    exit 1
fi

echo -e "${GREEN}✅ Authenticated as: $CURRENT_USER${NC}"
echo ""

# Check if user has IAM permissions
echo "🔍 Checking IAM permissions..."
aws iam list-users --max-items 1 > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Current credentials do not have IAM permissions${NC}"
    echo ""
    echo "You need to:"
    echo "  1. Use AWS credentials with IAM admin access, OR"
    echo "  2. Follow the manual instructions in IAM_SETUP_INSTRUCTIONS.md"
    exit 1
fi

echo -e "${GREEN}✅ IAM permissions verified${NC}"
echo ""

# Create policy
echo "📝 Creating IAM policy: $POLICY_NAME..."
POLICY_ARN=$(aws iam create-policy \
    --policy-name "$POLICY_NAME" \
    --policy-document "file://$POLICY_FILE" \
    --description "Permissions for SST serverless infrastructure deployment" \
    --query 'Policy.Arn' \
    --output text 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Policy created: $POLICY_ARN${NC}"
else
    if echo "$POLICY_ARN" | grep -q "EntityAlreadyExists"; then
        echo -e "${YELLOW}⚠️  Policy already exists, using existing policy${NC}"
        POLICY_ARN="arn:aws:iam::$ACCOUNT_ID:policy/$POLICY_NAME"
    else
        echo -e "${RED}❌ Error creating policy:${NC}"
        echo "$POLICY_ARN"
        exit 1
    fi
fi

echo ""

# Attach policy to user
echo "🔗 Attaching policy to user: $USER_NAME..."
aws iam attach-user-policy \
    --user-name "$USER_NAME" \
    --policy-arn "$POLICY_ARN" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Policy attached successfully${NC}"
else
    if echo "$OUTPUT" | grep -q "already attached"; then
        echo -e "${YELLOW}⚠️  Policy already attached${NC}"
    else
        echo -e "${RED}❌ Error attaching policy${NC}"
        exit 1
    fi
fi

echo ""

# Verify
echo "🔍 Verifying permissions..."
ATTACHED_POLICIES=$(aws iam list-attached-user-policies --user-name "$USER_NAME" --query 'AttachedPolicies[*].PolicyName' --output text)

if echo "$ATTACHED_POLICIES" | grep -q "$POLICY_NAME"; then
    echo -e "${GREEN}✅ Policy successfully attached and verified${NC}"
else
    echo -e "${RED}❌ Policy not found in user's attached policies${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Success! IAM permissions configured.${NC}"
echo ""
echo "Next steps:"
echo "  1. Deploy the infrastructure:"
echo "     cd apps/api && pnpm sst deploy --stage production"
echo ""
echo "  2. Deployment will take 20-30 minutes"
echo ""
echo "  3. After deployment, follow DEPLOYMENT_GUIDE.md for frontend configuration"
echo ""
