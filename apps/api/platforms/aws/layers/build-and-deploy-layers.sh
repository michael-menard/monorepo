#!/bin/bash
set -e

# Lambda Layers Build and Deployment Script
# This script builds and deploys all three Lambda layers to AWS
# Usage: ./build-and-deploy-layers.sh [stage] [region]
#   stage: dev|staging|production (default: dev)
#   region: AWS region (default: us-east-1)

STAGE=${1:-dev}
REGION=${2:-us-east-1}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Building and Deploying Lambda Layers"
echo "Stage: $STAGE"
echo "Region: $REGION"
echo "=========================================="

# Function to build a layer
build_layer() {
  local layer_name=$1
  local layer_dir="$SCRIPT_DIR/$layer_name"

  echo ""
  echo "Building $layer_name..."

  # Remove existing build artifacts
  rm -rf "$layer_dir/nodejs/node_modules"
  rm -f "$layer_dir/${layer_name}.zip"

  # Install dependencies in nodejs directory (Lambda layer format)
  cd "$layer_dir"
  pnpm install --prod --no-optional --prefix nodejs

  # Create zip file
  cd "$layer_dir"
  zip -r "${layer_name}.zip" nodejs -x "*.DS_Store" "nodejs/package.json" "nodejs/pnpm-lock.yaml"

  echo "✓ Built $layer_name ($(du -h "${layer_name}.zip" | cut -f1))"
}

# Function to deploy a layer
deploy_layer() {
  local layer_name=$1
  local description=$2
  local layer_dir="$SCRIPT_DIR/$layer_name"

  echo ""
  echo "Deploying $layer_name to $REGION..."

  # Publish layer version
  local output=$(aws lambda publish-layer-version \
    --layer-name "lego-api-${layer_name}-${STAGE}" \
    --description "$description" \
    --zip-file "fileb://${layer_dir}/${layer_name}.zip" \
    --compatible-runtimes nodejs20.x \
    --region "$REGION" \
    --output json)

  local layer_arn=$(echo "$output" | grep -o '"LayerVersionArn": "[^"]*' | cut -d'"' -f4)
  local version=$(echo "$output" | grep -o '"Version": [0-9]*' | cut -d' ' -f2)

  echo "✓ Deployed $layer_name"
  echo "  ARN: $layer_arn"
  echo "  Version: $version"

  # Save ARN to file for use in sst.config.ts
  echo "$layer_arn" > "$layer_dir/layer-arn-${STAGE}.txt"
}

# Build all layers
build_layer "minimal-layer"
build_layer "standard-layer"
build_layer "processing-layer"

# Deploy all layers
deploy_layer "minimal-layer" "Minimal dependencies: zod, uuid, AWS SDK S3"
deploy_layer "standard-layer" "Standard dependencies: Drizzle, PostgreSQL, Redis, OpenSearch"
deploy_layer "processing-layer" "Processing dependencies: Sharp, CSV parser, XML parser"

echo ""
echo "=========================================="
echo "✓ All layers built and deployed successfully!"
echo "=========================================="
echo ""
echo "Layer ARNs saved to:"
echo "  - minimal-layer/layer-arn-${STAGE}.txt"
echo "  - standard-layer/layer-arn-${STAGE}.txt"
echo "  - processing-layer/layer-arn-${STAGE}.txt"
echo ""
echo "Next steps:"
echo "  1. Update sst.config.ts to use these layer ARNs"
echo "  2. Set environment variables or use the ARN files in your configuration"
echo ""
