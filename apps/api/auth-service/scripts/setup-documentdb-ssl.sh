#!/bin/bash

# Setup DocumentDB SSL Certificate
# This script downloads the RDS CA certificate required for DocumentDB connections

set -e

echo "🔐 Setting up DocumentDB SSL certificate..."

# Create certs directory if it doesn't exist
mkdir -p /opt/certs

# Download the RDS CA certificate bundle
echo "📥 Downloading RDS CA certificate bundle..."
curl -o /opt/certs/rds-ca-2019-root.pem https://s3.amazonaws.com/rds-downloads/rds-ca-2019-root.pem

# Verify the certificate was downloaded
if [ -f "/opt/certs/rds-ca-2019-root.pem" ]; then
    echo "✅ RDS CA certificate downloaded successfully"
    echo "📍 Certificate location: /opt/certs/rds-ca-2019-root.pem"
    
    # Set appropriate permissions
    chmod 644 /opt/certs/rds-ca-2019-root.pem
    
    # Display certificate info
    echo "📋 Certificate information:"
    openssl x509 -in /opt/certs/rds-ca-2019-root.pem -text -noout | head -20
else
    echo "❌ Failed to download RDS CA certificate"
    exit 1
fi

echo "🎉 DocumentDB SSL setup complete!"
echo ""
echo "💡 Usage:"
echo "   Set MONGODB_TLS_CA_FILE=/opt/certs/rds-ca-2019-root.pem in your environment"
echo "   The auth service will automatically use this certificate for DocumentDB connections"
