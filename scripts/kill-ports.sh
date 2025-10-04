#!/bin/bash

# Kill Ports Script
# Utility script to kill processes running on specific ports
# Usage: ./scripts/kill-ports.sh [port1] [port2] [port3] ...
# Or: ./scripts/kill-ports.sh --app-ports (kills all application ports)

set -e

# Load port configuration
source scripts/load-ports.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Application ports (loaded from environment)
APP_PORTS=($WEB_APP_PORT $AUTH_API_PORT $LEGO_API_PORT)

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    local service_name=${2:-"Unknown Service"}
    
    echo -e "${YELLOW}🔍 Checking for processes on port ${port} (${service_name})...${NC}"
    
    # Check if lsof is available
    if ! command -v lsof &> /dev/null; then
        echo -e "${RED}❌ lsof command not available. Please install it first.${NC}"
        echo -e "${YELLOW}   macOS: brew install lsof${NC}"
        echo -e "${YELLOW}   Ubuntu/Debian: sudo apt-get install lsof${NC}"
        return 1
    fi
    
    # Find processes using the port
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ ! -z "$pids" ]; then
        echo -e "${YELLOW}⚠️  Found processes on port ${port}: ${pids}${NC}"
        echo -e "${YELLOW}🛑 Killing processes on port ${port}...${NC}"
        
        # Kill the processes
        echo "$pids" | xargs kill -9 2>/dev/null || true
        
        # Wait a moment for processes to die
        sleep 1
        
        # Verify they're gone
        local remaining=$(lsof -ti:$port 2>/dev/null || true)
        if [ -z "$remaining" ]; then
            echo -e "${GREEN}✅ Port ${port} is now free${NC}"
        else
            echo -e "${RED}❌ Some processes on port ${port} could not be killed${NC}"
            return 1
        fi
    else
        echo -e "${GREEN}✅ Port ${port} is already free${NC}"
    fi
    echo ""
}

# Function to show help
show_help() {
    echo -e "${BLUE}Kill Ports Script${NC}"
    echo ""
    echo "Usage:"
    echo "  $0 [port1] [port2] [port3] ...    Kill processes on specific ports"
    echo "  $0 --app-ports                    Kill processes on all application ports"
    echo "  $0 --help                         Show this help message"
    echo ""
    echo "Application ports:"
    echo "  $WEB_APP_PORT - Web App"
    echo "  $AUTH_API_PORT - Auth API"
    echo "  $LEGO_API_PORT - LEGO Projects API"
    echo ""
    echo "Examples:"
    echo "  $0 $WEB_APP_PORT                          Kill processes on port $WEB_APP_PORT"
    echo "  $0 $WEB_APP_PORT $AUTH_API_PORT $LEGO_API_PORT               Kill processes on multiple ports"
    echo "  $0 --app-ports                  Kill processes on all app ports"
}

# Main script logic
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ No arguments provided${NC}"
    show_help
    exit 1
fi

case "$1" in
    --help|-h)
        show_help
        exit 0
        ;;
    --app-ports)
        echo -e "${BLUE}🧹 Killing processes on all application ports...${NC}"
        echo ""
        kill_port $WEB_APP_PORT "Web App"
        kill_port $AUTH_API_PORT "Auth API"
        kill_port $LEGO_API_PORT "LEGO Projects API"
        echo -e "${GREEN}✅ All application ports cleaned${NC}"
        ;;
    *)
        echo -e "${BLUE}🧹 Killing processes on specified ports...${NC}"
        echo ""
        for port in "$@"; do
            # Validate port number
            if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
                echo -e "${RED}❌ Invalid port number: $port${NC}"
                continue
            fi
            
            # Determine service name if it's one of our known ports
            case "$port" in
                $WEB_APP_PORT) kill_port "$port" "Web App" ;;
                $AUTH_API_PORT) kill_port "$port" "Auth API" ;;
                $LEGO_API_PORT) kill_port "$port" "LEGO Projects API" ;;
                *) kill_port "$port" "Unknown Service" ;;
            esac
        done
        echo -e "${GREEN}✅ Port cleanup completed${NC}"
        ;;
esac
