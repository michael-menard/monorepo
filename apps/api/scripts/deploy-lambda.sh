#!/bin/bash
set -e

# Deploy Individual Lambda Function
# This script packages and deploys a single Lambda function to AWS
# Usage: ./deploy-lambda.sh <function-name> <stage> [region]
#
# Examples:
#   ./deploy-lambda.sh GalleryUploadImage dev
#   ./deploy-lambda.sh Health production us-east-1

FUNCTION_NAME=$1
STAGE=${2:-dev}
REGION=${3:-us-east-1}

if [ -z "$FUNCTION_NAME" ]; then
  echo "Error: Function name is required"
  echo "Usage: ./deploy-lambda.sh <function-name> <stage> [region]"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "Deploying Lambda Function"
echo "Function: $FUNCTION_NAME"
echo "Stage: $STAGE"
echo "Region: $REGION"
echo "=========================================="

# Import function mapping (using Node.js to parse TypeScript)
FUNCTION_CONFIG=$(node -e "
const fs = require('fs');
const path = require('path');

// Read the mapping file
const mappingFile = path.join('$API_ROOT', 'layers', 'lambda-layer-mapping.ts');
const content = fs.readFileSync(mappingFile, 'utf-8');

// Extract the LAMBDA_FUNCTIONS array (simple regex parsing)
const match = content.match(/export const LAMBDA_FUNCTIONS[^=]*=\s*(\[[\s\S]*?\n\])/);
if (!match) {
  console.error('Could not parse lambda-layer-mapping.ts');
  process.exit(1);
}

// Poor man's TypeScript to JSON conversion
let functionsArray = match[1]
  .replace(/\/\/.*$/gm, '') // Remove comments
  .replace(/'/g, '\"')      // Single to double quotes
  .replace(/,(\s*[}\]])/g, '\$1'); // Remove trailing commas

try {
  const functions = eval('(' + functionsArray + ')');
  const func = functions.find(f => f.name === '$FUNCTION_NAME');

  if (!func) {
    console.error('Function $FUNCTION_NAME not found in mapping');
    process.exit(1);
  }

  console.log(JSON.stringify(func));
} catch (e) {
  console.error('Error parsing function config:', e.message);
  process.exit(1);
}
")

if [ -z "$FUNCTION_CONFIG" ]; then
  echo "Error: Could not find configuration for $FUNCTION_NAME"
  exit 1
fi

# Parse function configuration
HANDLER=$(echo "$FUNCTION_CONFIG" | jq -r '.handler')
DOMAIN=$(echo "$FUNCTION_CONFIG" | jq -r '.domain')
MEMORY=$(echo "$FUNCTION_CONFIG" | jq -r '.memory // 512')
TIMEOUT=$(echo "$FUNCTION_CONFIG" | jq -r '.timeout // 30')
LAYERS_JSON=$(echo "$FUNCTION_CONFIG" | jq -r '.layers')

echo ""
echo "Function Configuration:"
echo "  Handler: $HANDLER"
echo "  Domain: $DOMAIN"
echo "  Memory: ${MEMORY}MB"
echo "  Timeout: ${TIMEOUT}s"
echo "  Layers: $LAYERS_JSON"
echo ""

# Determine layer ARNs
LAYER_ARNS=()

for layer_type in $(echo "$LAYERS_JSON" | jq -r '.[]'); do
  ARN_FILE="$API_ROOT/layers/${layer_type}-layer/layer-arn-${STAGE}.txt"

  if [ ! -f "$ARN_FILE" ]; then
    echo "Error: Layer ARN file not found: $ARN_FILE"
    echo "Run: ./layers/build-and-deploy-layers.sh $STAGE $REGION"
    exit 1
  fi

  ARN=$(cat "$ARN_FILE" | tr -d '\n\r')
  LAYER_ARNS+=("$ARN")
  echo "  Using layer: $ARN"
done

echo ""

# Build the deployment package
echo "Building deployment package..."

BUILD_DIR="$API_ROOT/.build/$FUNCTION_NAME"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy handler file and its dependencies
HANDLER_PATH="$API_ROOT/${HANDLER%.handler}.ts"
HANDLER_DIR=$(dirname "$HANDLER_PATH")

if [ ! -f "$HANDLER_PATH" ]; then
  echo "Error: Handler not found at $HANDLER_PATH"
  exit 1
fi

# Use esbuild to bundle the function with all dependencies
# This creates a single JS file with everything except layer dependencies
echo "  Bundling with esbuild..."

cd "$API_ROOT"

npx esbuild "$HANDLER_PATH" \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=esm \
  --outfile="$BUILD_DIR/index.mjs" \
  --external:@aws-sdk/* \
  --external:zod \
  --external:uuid \
  --external:drizzle-orm \
  --external:pg \
  --external:redis \
  --external:@opensearch-project/opensearch \
  --external:sharp \
  --external:csv-parser \
  --external:xmldom \
  --external:aws-jwt-verify \
  --external:aws-xray-sdk-core \
  --external:aws-embedded-metrics \
  --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);"

# Create deployment package
echo "  Creating ZIP archive..."
cd "$BUILD_DIR"
zip -q -r "../${FUNCTION_NAME}.zip" .

PACKAGE_SIZE=$(du -h "$API_ROOT/.build/${FUNCTION_NAME}.zip" | cut -f1)
echo "  Package size: $PACKAGE_SIZE"

# Deploy to AWS Lambda
echo ""
echo "Deploying to AWS Lambda..."

AWS_FUNCTION_NAME="lego-api-${FUNCTION_NAME}-${STAGE}"

# Check if function exists
if aws lambda get-function --function-name "$AWS_FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "  Updating existing function: $AWS_FUNCTION_NAME"

  # Update function code
  aws lambda update-function-code \
    --function-name "$AWS_FUNCTION_NAME" \
    --zip-file "fileb://$API_ROOT/.build/${FUNCTION_NAME}.zip" \
    --region "$REGION" \
    --output json > /dev/null

  # Wait for update to complete
  echo "  Waiting for update to complete..."
  aws lambda wait function-updated \
    --function-name "$AWS_FUNCTION_NAME" \
    --region "$REGION"

  # Update function configuration if needed
  LAYER_ARGS=""
  for arn in "${LAYER_ARNS[@]}"; do
    LAYER_ARGS="$LAYER_ARGS $arn"
  done

  if [ -n "$LAYER_ARGS" ]; then
    aws lambda update-function-configuration \
      --function-name "$AWS_FUNCTION_NAME" \
      --layers $LAYER_ARGS \
      --memory-size "$MEMORY" \
      --timeout "$TIMEOUT" \
      --region "$REGION" \
      --output json > /dev/null

    echo "  Waiting for configuration update..."
    aws lambda wait function-updated \
      --function-name "$AWS_FUNCTION_NAME" \
      --region "$REGION"
  fi

else
  echo "  Creating new function: $AWS_FUNCTION_NAME"

  # Get IAM role ARN (assuming it exists)
  ROLE_ARN=$(aws iam get-role --role-name "lego-api-lambda-role-${STAGE}" --query 'Role.Arn' --output text 2>/dev/null || echo "")

  if [ -z "$ROLE_ARN" ]; then
    echo "Error: IAM role not found. Please create 'lego-api-lambda-role-${STAGE}' first."
    exit 1
  fi

  # Build layer arguments
  LAYER_ARGS=""
  for arn in "${LAYER_ARNS[@]}"; do
    LAYER_ARGS="$LAYER_ARGS --layers $arn"
  done

  aws lambda create-function \
    --function-name "$AWS_FUNCTION_NAME" \
    --runtime nodejs20.x \
    --role "$ROLE_ARN" \
    --handler index.handler \
    --zip-file "fileb://$API_ROOT/.build/${FUNCTION_NAME}.zip" \
    --memory-size "$MEMORY" \
    --timeout "$TIMEOUT" \
    $LAYER_ARGS \
    --region "$REGION" \
    --environment "Variables={STAGE=$STAGE,NODE_ENV=production}" \
    --output json > /dev/null
fi

# Publish new version
echo "  Publishing new version..."
VERSION_OUTPUT=$(aws lambda publish-version \
  --function-name "$AWS_FUNCTION_NAME" \
  --region "$REGION" \
  --output json)

VERSION=$(echo "$VERSION_OUTPUT" | jq -r '.Version')
CODE_SIZE=$(echo "$VERSION_OUTPUT" | jq -r '.CodeSize')

echo ""
echo "=========================================="
echo "✅ Deployment Successful!"
echo "=========================================="
echo "Function: $AWS_FUNCTION_NAME"
echo "Version: $VERSION"
echo "Code Size: $(($CODE_SIZE / 1024))KB"
echo "Region: $REGION"
echo ""
echo "Function ARN:"
echo "$(echo "$VERSION_OUTPUT" | jq -r '.FunctionArn')"
echo ""

# Cleanup
rm -rf "$BUILD_DIR"
rm -f "$API_ROOT/.build/${FUNCTION_NAME}.zip"
