#!/bin/bash

# Start Full Development Environment
# This is the SINGLE entry point for starting the complete development environment.
# It starts all services needed for development:
# - Docker infrastructure services (MongoDB, PostgreSQL, Redis, Elasticsearch)
# - Auth API service
# - LEGO Projects API service
# - LEGO MOC Instructions web app
#
# Usage: ./scripts/start-full-dev.sh
# Or via npm: pnpm dev or pnpm start

set -e  # Exit on any error

echo "🚀 Starting Full Development Environment..."
echo ""

# Load environment configuration
if [ -f ".env" ]; then
    set -a  # automatically export all variables
    source .env
    set +a
    echo "📋 Loaded environment configuration from .env"
else
    echo "⚠️  No .env file found, using defaults..."
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local service_name=$2

    echo -e "${YELLOW}🔍 Checking for processes on port ${port} (${service_name})...${NC}"

    # Check if lsof is available
    if ! command -v lsof &> /dev/null; then
        echo -e "${RED}❌ lsof command not available, cannot check port ${port}${NC}"
        echo ""
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
        fi
    else
        echo -e "${GREEN}✅ Port ${port} is already free${NC}"
    fi
    echo ""
}

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping all development servers...${NC}"
    
    # Kill background processes
    if [ ! -z "$AUTH_PID" ]; then
        kill $AUTH_PID 2>/dev/null || true
    fi
    if [ ! -z "$LEGO_API_PID" ]; then
        kill $LEGO_API_PID 2>/dev/null || true
    fi
    if [ ! -z "$WEB_APP_PID" ]; then
        kill $WEB_APP_PID 2>/dev/null || true
    fi
    
    # Stop Docker services
    echo -e "${BLUE}🐳 Stopping Docker infrastructure services...${NC}"
    docker-compose -f docker-compose.dev.yml down
    
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM EXIT

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if lsof is available (needed for port killing)
if ! command -v lsof &> /dev/null; then
    echo -e "${YELLOW}⚠️  lsof command not found. Port cleanup will be skipped.${NC}"
    echo -e "${YELLOW}   To install lsof on macOS: brew install lsof${NC}"
    echo -e "${YELLOW}   To install lsof on Ubuntu/Debian: sudo apt-get install lsof${NC}"
    echo ""
    SKIP_PORT_CLEANUP=true
else
    SKIP_PORT_CLEANUP=false
fi

# Step 0: Kill any processes running on our application ports
if [ "$SKIP_PORT_CLEANUP" = false ]; then
    echo -e "${BLUE}🧹 Cleaning up ports for application services...${NC}"
    kill_port $FRONTEND_PORT "Frontend"
    kill_port $AUTH_SERVICE_PORT "Auth Service"
    kill_port $LEGO_API_PORT "LEGO Projects API"
else
    echo -e "${YELLOW}⏭️  Skipping port cleanup (lsof not available)${NC}"
    echo ""
fi

# Step 1: Start Docker infrastructure services
echo -e "${BLUE}🐳 Starting Docker infrastructure services...${NC}"
echo "   - MongoDB (port $MONGODB_PORT)"
echo "   - PostgreSQL (port $POSTGRESQL_PORT)"
echo "   - Redis (port $REDIS_PORT)"
echo "   - Elasticsearch (port $ELASTICSEARCH_PORT)"
echo "   - Mongo Express (port $MONGO_EXPRESS_PORT)"
echo "   - pgAdmin (port $PGADMIN_PORT)"
echo ""

docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for infrastructure services to be ready...${NC}"
sleep 10

# Check service health
echo -e "${BLUE}🔍 Checking service health...${NC}"
docker-compose -f docker-compose.dev.yml ps

echo ""

# Step 2: Start Auth API service
echo -e "${GREEN}🔐 Starting Auth Service (port $AUTH_SERVICE_PORT)...${NC}"
cd apps/api/auth-service
pnpm dev > ../../../logs/auth-service.log 2>&1 &
AUTH_PID=$!
cd ../../..

# Wait for auth service to start
sleep 5

# Test auth service
if curl -s http://localhost:$AUTH_SERVICE_PORT/api/auth/csrf > /dev/null; then
    echo -e "${GREEN}✅ Auth service is running on http://localhost:$AUTH_SERVICE_PORT${NC}"
else
    echo -e "${YELLOW}⚠️  Auth service may still be starting...${NC}"
fi

echo ""

# Step 3: Start LEGO Projects API service
echo -e "${BLUE}🧱 Starting LEGO Projects API service (port $LEGO_API_PORT)...${NC}"
cd apps/api/lego-projects-api
pnpm dev > ../../../logs/lego-projects-api.log 2>&1 &
LEGO_API_PID=$!
cd ../../..

# Wait for LEGO API to start
sleep 5

echo ""

# Step 4: Start Web Application
echo -e "${YELLOW}🌐 Starting LEGO MOC Instructions web app...${NC}"
cd apps/web/lego-moc-instructions-app
pnpm dev &
WEB_APP_PID=$!
cd ../../..

# Wait for web app to start
sleep 8

echo ""
echo -e "${GREEN}🎉 Full Development Environment Started!${NC}"
echo ""
echo -e "${BLUE}📋 Service URLs:${NC}"
echo "   🌐 Frontend:             http://localhost:$FRONTEND_PORT (or check terminal output)"
echo "   🔐 Auth Service:         http://localhost:$AUTH_SERVICE_PORT/api"
echo "   🧱 LEGO Projects API:    http://localhost:$LEGO_API_PORT/api (if running)"
echo ""
echo -e "${BLUE}📊 Infrastructure Services:${NC}"
echo "   🍃 MongoDB:              mongodb://localhost:$MONGODB_PORT"
echo "   🐘 PostgreSQL:           postgresql://localhost:$POSTGRESQL_PORT"
echo "   🔴 Redis:                redis://localhost:$REDIS_PORT"
echo "   🔍 Elasticsearch:        http://localhost:$ELASTICSEARCH_PORT"
echo "   🌿 Mongo Express:        http://localhost:$MONGO_EXPRESS_PORT"
echo "   🐘 pgAdmin:              http://localhost:$PGADMIN_PORT"
echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo "   📄 Auth Service:         tail -f logs/auth-service.log"
echo "   📄 LEGO Projects API:    tail -f logs/lego-projects-api.log"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "   • Run tests: pnpm test:e2e:auth"
echo "   • Check service status: docker-compose -f docker-compose.dev.yml ps"
echo "   • View logs: docker-compose -f docker-compose.dev.yml logs -f"
echo ""
echo -e "${RED}Press Ctrl+C to stop all services${NC}"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs

# Wait for background processes and show their status
while true; do
    sleep 30
    
    # Check if processes are still running
    if ! kill -0 $AUTH_PID 2>/dev/null; then
        echo -e "${RED}❌ Auth service stopped unexpectedly${NC}"
        echo "Check logs: cat logs/auth-service.log"
    fi
    
    if ! kill -0 $WEB_APP_PID 2>/dev/null; then
        echo -e "${RED}❌ Web app stopped unexpectedly${NC}"
    fi
    
    # Optional: Check if LEGO API is running (it might fail due to missing dependencies)
    if [ ! -z "$LEGO_API_PID" ] && ! kill -0 $LEGO_API_PID 2>/dev/null; then
        echo -e "${YELLOW}⚠️  LEGO Projects API stopped (this is expected if dependencies are missing)${NC}"
        LEGO_API_PID=""  # Don't check again
    fi
done
