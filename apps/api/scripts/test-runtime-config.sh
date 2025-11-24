#!/bin/bash

# Test Runtime Configuration Infrastructure
# Story 1.1: Runtime Configuration Infrastructure Setup
#
# This script tests the deployed runtime configuration infrastructure:
# - S3 bucket accessibility
# - Config file structure and validation
# - CORS configuration
# - Cache-Control headers

set -e

# Configuration
STAGE=${1:-dev}
BUCKET_NAME="lego-runtime-config-${STAGE}"
CONFIG_URL="https://${BUCKET_NAME}.s3.amazonaws.com/config.json"
TEMP_FILE="/tmp/runtime-config-test.json"

echo "🧪 Testing Runtime Configuration Infrastructure for stage: ${STAGE}"
echo "📍 Bucket: ${BUCKET_NAME}"
echo "🔗 Config URL: ${CONFIG_URL}"
echo ""

# Test 1: Check if S3 bucket exists
echo "1️⃣ Testing S3 bucket existence..."
if aws s3 ls "s3://${BUCKET_NAME}" > /dev/null 2>&1; then
    echo "✅ S3 bucket exists: ${BUCKET_NAME}"
else
    echo "❌ S3 bucket not found: ${BUCKET_NAME}"
    echo "💡 Run: sst deploy --stage ${STAGE}"
    exit 1
fi

# Test 2: Download config file and check accessibility
echo ""
echo "2️⃣ Testing config file accessibility..."
if curl -s -f -o "${TEMP_FILE}" "${CONFIG_URL}"; then
    echo "✅ Config file is accessible"
else
    echo "❌ Config file is not accessible"
    echo "💡 Check bucket policy and public read permissions"
    exit 1
fi

# Test 3: Validate JSON structure
echo ""
echo "3️⃣ Testing JSON structure..."
if jq empty "${TEMP_FILE}" 2>/dev/null; then
    echo "✅ Config file contains valid JSON"
else
    echo "❌ Config file contains invalid JSON"
    cat "${TEMP_FILE}"
    exit 1
fi

# Test 4: Check required fields
echo ""
echo "4️⃣ Testing required configuration fields..."
REQUIRED_FIELDS=("apiBaseUrl" "useServerless" "cognitoConfig")
MISSING_FIELDS=()

for field in "${REQUIRED_FIELDS[@]}"; do
    if jq -e ".${field}" "${TEMP_FILE}" > /dev/null 2>&1; then
        echo "✅ Field present: ${field}"
    else
        echo "❌ Field missing: ${field}"
        MISSING_FIELDS+=("${field}")
    fi
done

# Check nested cognitoConfig fields
COGNITO_FIELDS=("userPoolId" "clientId" "region")
for field in "${COGNITO_FIELDS[@]}"; do
    if jq -e ".cognitoConfig.${field}" "${TEMP_FILE}" > /dev/null 2>&1; then
        echo "✅ Cognito field present: ${field}"
    else
        echo "❌ Cognito field missing: ${field}"
        MISSING_FIELDS+=("cognitoConfig.${field}")
    fi
done

if [ ${#MISSING_FIELDS[@]} -gt 0 ]; then
    echo "❌ Configuration validation failed"
    exit 1
fi

# Test 5: Check Cache-Control headers
echo ""
echo "5️⃣ Testing Cache-Control headers..."
CACHE_CONTROL=$(curl -s -I "${CONFIG_URL}" | grep -i "cache-control" | tr -d '\r')
if [[ "${CACHE_CONTROL}" == *"max-age=60"* ]]; then
    echo "✅ Cache-Control header correct: ${CACHE_CONTROL}"
else
    echo "❌ Cache-Control header incorrect or missing"
    echo "Expected: Cache-Control: max-age=60"
    echo "Actual: ${CACHE_CONTROL}"
fi

# Test 6: Check Content-Type header
echo ""
echo "6️⃣ Testing Content-Type header..."
CONTENT_TYPE=$(curl -s -I "${CONFIG_URL}" | grep -i "content-type" | tr -d '\r')
if [[ "${CONTENT_TYPE}" == *"application/json"* ]]; then
    echo "✅ Content-Type header correct: ${CONTENT_TYPE}"
else
    echo "❌ Content-Type header incorrect"
    echo "Expected: Content-Type: application/json"
    echo "Actual: ${CONTENT_TYPE}"
fi

# Test 7: Test CORS configuration (requires a frontend origin)
echo ""
echo "7️⃣ Testing CORS configuration..."
FRONTEND_ORIGIN="http://localhost:3002"
CORS_RESPONSE=$(curl -s -I -H "Origin: ${FRONTEND_ORIGIN}" -H "Access-Control-Request-Method: GET" -X OPTIONS "${CONFIG_URL}" 2>/dev/null || echo "CORS_FAILED")

if [[ "${CORS_RESPONSE}" != "CORS_FAILED" ]]; then
    ACCESS_CONTROL_ORIGIN=$(echo "${CORS_RESPONSE}" | grep -i "access-control-allow-origin" | tr -d '\r')
    if [[ "${ACCESS_CONTROL_ORIGIN}" == *"${FRONTEND_ORIGIN}"* ]] || [[ "${ACCESS_CONTROL_ORIGIN}" == *"*"* ]]; then
        echo "✅ CORS configuration allows frontend origin"
    else
        echo "⚠️ CORS configuration may not allow frontend origin"
        echo "Response: ${ACCESS_CONTROL_ORIGIN}"
    fi
else
    echo "⚠️ CORS preflight request failed (this may be expected for S3)"
fi

# Test 8: Display configuration content
echo ""
echo "8️⃣ Configuration content:"
echo "$(jq '.' "${TEMP_FILE}")"

# Cleanup
rm -f "${TEMP_FILE}"

echo ""
echo "🎉 Runtime configuration infrastructure test completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Verify frontend can fetch and parse the configuration"
echo "   2. Test API switching functionality"
echo "   3. Monitor configuration fetch success rates"
echo "   4. Set up CloudWatch alarms for S3 errors"
