#!/bin/bash

# Test Environment Configuration Script
# This script helps you test the environment configuration locally

set -e

ENVIRONMENT=${1:-staging}
ENV_FILE=".github/environments/${ENVIRONMENT}.env"

echo "🧪 Testing Environment Configuration"
echo "=================================="
echo "Environment: $ENVIRONMENT"
echo "Config file: $ENV_FILE"
echo ""

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file not found: $ENV_FILE"
    echo ""
    echo "Available environments:"
    ls -1 .github/environments/*.env 2>/dev/null | sed 's|.github/environments/||g' | sed 's|.env||g' || echo "No environment files found"
    exit 1
fi

echo "📋 Environment Configuration:"
echo "----------------------------"

# Load and display environment variables
set -a  # automatically export all variables
source "$ENV_FILE"
set +a  # stop automatically exporting

# Display key configuration values
echo "Frontend Infrastructure:"
echo "  S3_BUCKET_NAME: $S3_BUCKET_NAME"
echo "  CLOUDFRONT_DISTRIBUTION_ID: $CLOUDFRONT_DISTRIBUTION_ID"
echo "  FRONTEND_URL: $FRONTEND_URL"
echo ""

echo "API Configuration:"
echo "  VITE_AUTH_API_URL: $VITE_AUTH_API_URL"
echo "  VITE_LEGO_API_URL: $VITE_LEGO_API_URL"
echo "  VITE_API_URL: $VITE_API_URL"
echo ""

echo "Build Configuration:"
echo "  VITE_ENVIRONMENT: $VITE_ENVIRONMENT"
echo "  NODE_ENV: $NODE_ENV"
echo ""

echo "AWS Configuration:"
echo "  AWS_REGION: $AWS_REGION"
echo "  CDK_DEFAULT_REGION: $CDK_DEFAULT_REGION"
echo ""

# Validate required variables
echo "🔍 Validation:"
echo "-------------"

ERRORS=0

if [ -z "$S3_BUCKET_NAME" ]; then
    echo "❌ S3_BUCKET_NAME is not set"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ S3_BUCKET_NAME is set"
fi

if [ -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo "❌ CLOUDFRONT_DISTRIBUTION_ID is not set"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ CLOUDFRONT_DISTRIBUTION_ID is set"
fi

if [ -z "$FRONTEND_URL" ]; then
    echo "❌ FRONTEND_URL is not set"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ FRONTEND_URL is set"
fi

if [ -z "$VITE_ENVIRONMENT" ]; then
    echo "❌ VITE_ENVIRONMENT is not set"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ VITE_ENVIRONMENT is set"
fi

echo ""

if [ $ERRORS -eq 0 ]; then
    echo "🎉 All required environment variables are set!"
    echo ""
    echo "🚀 You can now run the deployment workflow with this environment."
else
    echo "❌ Found $ERRORS error(s) in environment configuration."
    echo "Please fix the issues above before deploying."
    exit 1
fi
