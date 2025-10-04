#!/bin/bash

# Port Configuration Loader
# This script loads port configurations from environment files
# Usage: source scripts/load-ports.sh

# Function to load port configuration
load_port_config() {
    local config_loaded=false
    
    # Try to load from .env.ports.local first (user overrides)
    if [ -f ".env.ports.local" ]; then
        echo "📋 Loading port configuration from .env.ports.local..."
        set -a  # automatically export all variables
        source .env.ports.local
        set +a
        config_loaded=true
    # Fall back to .env.ports
    elif [ -f ".env.ports" ]; then
        echo "📋 Loading port configuration from .env.ports..."
        set -a  # automatically export all variables
        source .env.ports
        set +a
        config_loaded=true
    # Fall back to .env if it exists
    elif [ -f ".env" ]; then
        echo "📋 Loading port configuration from .env..."
        set -a  # automatically export all variables
        source .env
        set +a
        config_loaded=true
    fi
    
    # Set defaults if no config file was found
    if [ "$config_loaded" = false ]; then
        echo "⚠️  No port configuration file found, using defaults..."
        export WEB_APP_PORT=3002
        export AUTH_API_PORT=9300
        export LEGO_API_PORT=9000
        export DOCS_PORT=3000
        export MONGODB_PORT=27017
        export POSTGRESQL_PORT=5432
        export REDIS_PORT=6379
        export ELASTICSEARCH_PORT=9200
        export MONGO_EXPRESS_PORT=8081
        export PGADMIN_PORT=8082
    fi
    
    # Generate derived URLs if not already set
    export WEB_APP_URL=${WEB_APP_URL:-"http://localhost:${WEB_APP_PORT}"}
    export AUTH_API_URL=${AUTH_API_URL:-"http://localhost:${AUTH_API_PORT}"}
    export LEGO_API_URL=${LEGO_API_URL:-"http://localhost:${LEGO_API_PORT}"}
    export DOCS_URL=${DOCS_URL:-"http://localhost:${DOCS_PORT}"}
    export MONGODB_URL=${MONGODB_URL:-"mongodb://localhost:${MONGODB_PORT}"}
    export POSTGRESQL_URL=${POSTGRESQL_URL:-"postgresql://localhost:${POSTGRESQL_PORT}"}
    export REDIS_URL=${REDIS_URL:-"redis://localhost:${REDIS_PORT}"}
    export ELASTICSEARCH_URL=${ELASTICSEARCH_URL:-"http://localhost:${ELASTICSEARCH_PORT}"}
    export MONGO_EXPRESS_URL=${MONGO_EXPRESS_URL:-"http://localhost:${MONGO_EXPRESS_PORT}"}
    export PGADMIN_URL=${PGADMIN_URL:-"http://localhost:${PGADMIN_PORT}"}
    
    # Create port arrays for scripts
    export APP_PORTS_ARRAY=($WEB_APP_PORT $AUTH_API_PORT $LEGO_API_PORT)
    export ALL_PORTS_ARRAY=($WEB_APP_PORT $AUTH_API_PORT $LEGO_API_PORT $DOCS_PORT $MONGODB_PORT $POSTGRESQL_PORT $REDIS_PORT $ELASTICSEARCH_PORT $MONGO_EXPRESS_PORT $PGADMIN_PORT)
}

# Function to display current port configuration
show_port_config() {
    echo ""
    echo "🔧 Current Port Configuration:"
    echo "  Web App:         $WEB_APP_PORT"
    echo "  Auth API:        $AUTH_API_PORT"
    echo "  LEGO API:        $LEGO_API_PORT"
    echo "  Documentation:   $DOCS_PORT"
    echo ""
    echo "🐳 Infrastructure Ports:"
    echo "  MongoDB:         $MONGODB_PORT"
    echo "  PostgreSQL:      $POSTGRESQL_PORT"
    echo "  Redis:           $REDIS_PORT"
    echo "  Elasticsearch:   $ELASTICSEARCH_PORT"
    echo "  Mongo Express:   $MONGO_EXPRESS_PORT"
    echo "  pgAdmin:         $PGADMIN_PORT"
    echo ""
}

# Function to validate port numbers
validate_ports() {
    local invalid_ports=()
    
    for port in "${APP_PORTS_ARRAY[@]}"; do
        if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
            invalid_ports+=("$port")
        fi
    done
    
    if [ ${#invalid_ports[@]} -gt 0 ]; then
        echo "❌ Invalid port numbers detected: ${invalid_ports[*]}"
        return 1
    fi
    
    return 0
}

# Auto-load configuration when sourced
if [ "${BASH_SOURCE[0]}" != "${0}" ]; then
    # Script is being sourced
    load_port_config
    
    # Validate ports
    if ! validate_ports; then
        echo "❌ Port validation failed. Please check your port configuration."
        return 1
    fi
else
    # Script is being executed directly
    echo "Port Configuration Loader"
    echo "Usage: source scripts/load-ports.sh"
    echo ""
    echo "This script should be sourced, not executed directly."
    echo "Example: source scripts/load-ports.sh"
fi
