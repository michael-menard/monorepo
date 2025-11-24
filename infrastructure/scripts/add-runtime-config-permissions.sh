#!/bin/bash

# Add Runtime Configuration S3 Permissions
# Story 1.1: Runtime Configuration Infrastructure Setup
#
# This script adds the necessary S3 and CloudFormation permissions
# to the lego-moc-deployer user for deploying runtime configuration infrastructure.

set -e

USER_NAME="lego-moc-deployer"
ACCOUNT_ID="213351177820"

# Policy options
MINIMAL_POLICY_NAME="RuntimeConfigS3Policy"
MINIMAL_POLICY_FILE="infrastructure/iam-policies/runtime-config-s3-policy.json"
COMPLETE_POLICY_NAME="CompleteSSTDeploymentPolicy"
COMPLETE_POLICY_FILE="infrastructure/iam-policies/complete-sst-deployment-policy.json"

# Default to minimal policy
POLICY_NAME="${MINIMAL_POLICY_NAME}"
POLICY_FILE="${MINIMAL_POLICY_FILE}"

# Check command line arguments
if [ "$1" = "--complete" ]; then
    POLICY_NAME="${COMPLETE_POLICY_NAME}"
    POLICY_FILE="${COMPLETE_POLICY_FILE}"
    echo "🚀 Using COMPLETE SST deployment policy (broader permissions)"
else
    echo "🔒 Using MINIMAL runtime configuration policy (limited permissions)"
    echo "💡 Use --complete flag for full SST infrastructure deployment"
fi

echo "🔐 Adding Runtime Configuration S3 Permissions"
echo "👤 User: ${USER_NAME}"
echo "📋 Policy: ${POLICY_NAME}"
echo "📁 Policy File: ${POLICY_FILE}"
echo ""

# Check if policy file exists
if [ ! -f "${POLICY_FILE}" ]; then
    echo "❌ Policy file not found: ${POLICY_FILE}"
    echo "💡 Make sure you're running this from the repository root"
    exit 1
fi

# Check if user exists
echo "1️⃣ Checking if user exists..."
if aws iam get-user --user-name "${USER_NAME}" > /dev/null 2>&1; then
    echo "✅ User exists: ${USER_NAME}"
else
    echo "❌ User not found: ${USER_NAME}"
    echo "💡 Create the user first or check the user name"
    exit 1
fi

# Create the policy
echo ""
echo "2️⃣ Creating IAM policy..."
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"

# Check if policy already exists
if aws iam get-policy --policy-arn "${POLICY_ARN}" > /dev/null 2>&1; then
    echo "⚠️ Policy already exists: ${POLICY_NAME}"
    echo "🔄 Updating policy with new version..."
    
    # Create a new policy version
    aws iam create-policy-version \
        --policy-arn "${POLICY_ARN}" \
        --policy-document "file://${POLICY_FILE}" \
        --set-as-default
    
    echo "✅ Policy updated: ${POLICY_NAME}"
else
    # Create new policy
    aws iam create-policy \
        --policy-name "${POLICY_NAME}" \
        --policy-document "file://${POLICY_FILE}" \
        --description "S3 and CloudFormation permissions for runtime configuration infrastructure"
    
    echo "✅ Policy created: ${POLICY_NAME}"
fi

# Attach policy to user
echo ""
echo "3️⃣ Attaching policy to user..."
if aws iam attach-user-policy \
    --user-name "${USER_NAME}" \
    --policy-arn "${POLICY_ARN}"; then
    echo "✅ Policy attached to user: ${USER_NAME}"
else
    echo "⚠️ Policy may already be attached to user"
fi

# Verify permissions
echo ""
echo "4️⃣ Verifying permissions..."
echo "📋 Attached policies for user ${USER_NAME}:"
aws iam list-attached-user-policies --user-name "${USER_NAME}" --output table

echo ""
echo "🎉 AWS permissions added successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Test S3 access: aws s3 ls"
echo "   2. Deploy infrastructure: cd apps/api/lego-api-serverless && npx sst deploy --stage dev"
echo "   3. Test configuration: ./scripts/test-runtime-config.sh dev"
echo ""
if [ "$1" = "--complete" ]; then
    echo "🔒 Security Note:"
    echo "   COMPLETE policy grants broad permissions for full SST infrastructure deployment."
    echo "   Includes VPC, RDS, OpenSearch, Lambda, API Gateway, Cognito, CloudWatch, and more."
    echo "   Use this for initial deployment, then consider switching to minimal policy."
else
    echo "🔒 Security Note:"
    echo "   MINIMAL policy grants limited permissions for runtime configuration only."
    echo "   For full SST infrastructure deployment, use: $0 --complete"
fi
