#!/usr/bin/env bash
#
# get-kb-token.sh
#
# Fetches a Cognito ID token for the KB HTTP server (EXKB).
#
# Intended to be run on the operator's laptop, wrapped by a Claude Code MCP
# server entry that passes the resulting token in the Authorization header.
#
# Usage:
#   ./scripts/get-kb-token.sh
#
# Required env vars:
#   KB_COGNITO_USER_POOL_ID - Pool ID of the lego-moc-users pool
#   KB_COGNITO_CLIENT_ID    - App client ID of the kb-admin-client
#   KB_COGNITO_USERNAME     - Your Cognito username (email)
#   KB_COGNITO_PASSWORD     - Your Cognito password (use a keychain wrapper
#                             in practice — this script does not persist it)
#   KB_COGNITO_REGION       - AWS region (default: us-east-1)
#
# Requires: aws CLI, jq

set -euo pipefail

: "${KB_COGNITO_USER_POOL_ID:?KB_COGNITO_USER_POOL_ID is required}"
: "${KB_COGNITO_CLIENT_ID:?KB_COGNITO_CLIENT_ID is required}"
: "${KB_COGNITO_USERNAME:?KB_COGNITO_USERNAME is required}"
: "${KB_COGNITO_PASSWORD:?KB_COGNITO_PASSWORD is required}"

REGION="${KB_COGNITO_REGION:-us-east-1}"

response=$(aws cognito-idp initiate-auth \
  --region "$REGION" \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id "$KB_COGNITO_CLIENT_ID" \
  --auth-parameters "USERNAME=$KB_COGNITO_USERNAME,PASSWORD=$KB_COGNITO_PASSWORD" \
  --output json)

id_token=$(printf '%s' "$response" | jq -r '.AuthenticationResult.IdToken')

if [ -z "$id_token" ] || [ "$id_token" = "null" ]; then
  echo "Failed to fetch ID token. Full response:" >&2
  printf '%s\n' "$response" >&2
  exit 1
fi

printf '%s' "$id_token"
