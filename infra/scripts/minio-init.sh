#!/bin/sh
# MinIO Bucket Initialization Script
#
# This script runs after MinIO starts to create the default bucket.
# It is idempotent - running multiple times is safe.

set -e

echo "MinIO initialization: Configuring local alias..."
mc alias set local http://localhost:9000 minioadmin minioadmin

echo "MinIO initialization: Creating workflow-artifacts bucket..."
if mc ls local/workflow-artifacts >/dev/null 2>&1; then
  echo "MinIO initialization: Bucket 'workflow-artifacts' already exists, skipping."
else
  mc mb local/workflow-artifacts
  echo "MinIO initialization: Bucket 'workflow-artifacts' created successfully."
fi

echo "MinIO initialization: Complete."
