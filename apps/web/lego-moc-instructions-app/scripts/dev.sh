#!/bin/bash

# Web App Development Script
# Loads port configuration and starts Vite with the correct port

# Load port configuration from root
source ../../../scripts/load-ports.sh

# Export Vite-specific environment variables
export VITE_WEB_APP_PORT=$WEB_APP_PORT
export VITE_AUTH_API_PORT=$AUTH_API_PORT
export VITE_LEGO_API_PORT=$LEGO_API_PORT

# Start Vite with the configured port
echo "🌐 Starting Web App on port $WEB_APP_PORT..."
vite --port $WEB_APP_PORT
