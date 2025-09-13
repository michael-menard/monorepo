#!/bin/bash

# Docker management scripts for Lego MOC Instructions App

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check available memory
check_memory() {
    local required_memory=4096  # 4GB in MB
    local available_memory=$(docker system df --format "table {{.TotalCount}}" | tail -n 1 | tr -d ' ')
    
    if [ "$available_memory" -lt "$required_memory" ]; then
        print_warning "Low memory available. Elasticsearch requires at least 4GB of RAM."
        print_warning "Consider reducing Elasticsearch memory in docker-compose.yml"
    fi
}

# Start all external services
start_all() {
    print_header "Starting External Services"
    check_docker
    check_memory

    print_status "Starting external services (databases, search, admin tools)..."
    docker-compose -f docker-compose.dev.yml up -d

    print_status "External services are starting up. This may take a few minutes..."
    print_status "You can monitor the logs with: ./docker-scripts.sh logs"

    echo ""
    print_status "External Service URLs:"
    echo "  MongoDB: mongodb://localhost:27017"
    echo "  PostgreSQL: postgresql://localhost:5432"
    echo "  Redis: redis://localhost:6379"
    echo "  Elasticsearch: http://localhost:9200"
    echo "  MongoDB Admin: http://localhost:8081"
    echo "  pgAdmin: http://localhost:8082"
    echo ""
    print_status "Next Steps:"
    echo "  1. Start applications natively: pnpm dev"
    echo "  2. Or start specific apps:"
    echo "     - Frontend: cd apps/web/lego-moc-instructions-app && pnpm dev"
    echo "     - Auth API: cd apps/api/auth-service && pnpm dev"
    echo "     - LEGO API: cd apps/api/lego-projects-api && pnpm dev"
}

# Stop all external services
stop_all() {
    print_header "Stopping External Services"
    check_docker

    print_status "Stopping external services..."
    docker-compose -f docker-compose.dev.yml down

    print_status "External services stopped."
    print_status "Note: Application services should be stopped manually (Ctrl+C in their terminals)"
}

# Restart all services
restart_all() {
    print_header "Restarting All Services"
    stop_all
    start_all
}

# Show logs
show_logs() {
    local service=${1:-""}

    if [ -z "$service" ]; then
        print_header "All External Service Logs"
        docker-compose -f docker-compose.dev.yml logs -f
    else
        print_header "Logs for $service"
        docker-compose -f docker-compose.dev.yml logs -f "$service"
    fi
}

# Show status
show_status() {
    print_header "External Service Status"
    docker-compose -f docker-compose.dev.yml ps
}

# Clean up everything
clean_all() {
    print_header "Cleaning External Service Docker Resources"
    check_docker

    print_warning "This will remove all external service containers, networks, volumes, and images!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Stopping and removing external service containers..."
        docker-compose -f docker-compose.dev.yml down -v --rmi all

        print_status "Removing unused Docker resources..."
        docker system prune -f

        print_status "Cleanup complete."
    else
        print_status "Cleanup cancelled."
    fi
}

# Rebuild specific external service
rebuild_service() {
    local service=$1

    if [ -z "$service" ]; then
        print_error "Please specify an external service to rebuild"
        echo "Available services: mongodb, postgres, redis, elasticsearch, mongo-express, pgadmin"
        exit 1
    fi

    print_header "Rebuilding $service"
    check_docker

    print_status "Rebuilding $service..."
    docker-compose -f docker-compose.dev.yml up --build -d "$service"

    print_status "$service rebuilt and restarted."
}

# Start only databases
start_databases() {
    print_header "Starting Databases Only"
    check_docker

    print_status "Starting databases..."
    docker-compose -f docker-compose.dev.yml up -d mongodb postgres redis

    print_status "Databases started."
    echo "  MongoDB: mongodb://localhost:27017"
    echo "  PostgreSQL: postgresql://localhost:5432"
    echo "  Redis: redis://localhost:6379"
}

# Start only search services
start_search() {
    print_header "Starting Search Services Only"
    check_docker

    print_status "Starting search services..."
    docker-compose -f docker-compose.dev.yml up -d elasticsearch

    print_status "Search services started."
    echo "  Elasticsearch: http://localhost:9200"
}

# Start only admin tools
start_admin() {
    print_header "Starting Admin Tools Only"
    check_docker

    print_status "Starting admin tools..."
    docker-compose -f docker-compose.dev.yml up -d mongo-express pgadmin

    print_status "Admin tools started."
    echo "  MongoDB Admin: http://localhost:8081"
    echo "  pgAdmin: http://localhost:8082"
}

# Show help
show_help() {
    print_header "External Services Management Script"
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start           Start all external services"
    echo "  stop            Stop all external services"
    echo "  restart         Restart all external services"
    echo "  logs [service]  Show logs (all or specific service)"
    echo "  status          Show service status"
    echo "  clean           Clean all Docker resources"
    echo "  rebuild <service> Rebuild specific service"
    echo "  databases       Start only databases (MongoDB, PostgreSQL, Redis)"
    echo "  search          Start only search services (Elasticsearch)"
    echo "  admin           Start only admin tools (Mongo Express, pgAdmin)"
    echo "  help            Show this help message"
    echo ""
    echo "Available Services:"
    echo "  mongodb, postgres, redis, elasticsearch, mongo-express, pgadmin"
    echo ""
    echo "Examples:"
    echo "  $0 start                    # Start all external services"
    echo "  $0 databases                # Start only databases"
    echo "  $0 logs mongodb             # Show MongoDB logs"
    echo "  $0 rebuild elasticsearch    # Rebuild Elasticsearch"
    echo ""
    echo "Note: Application services (frontend, APIs) should be run natively:"
    echo "  pnpm dev                    # Start all applications"
    echo "  cd apps/api/auth-service && pnpm dev    # Start auth service"
}

# Main script logic
case "${1:-help}" in
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        restart_all
        ;;
    logs)
        show_logs "$2"
        ;;
    status)
        show_status
        ;;
    clean)
        clean_all
        ;;
    rebuild)
        rebuild_service "$2"
        ;;
    databases)
        start_databases
        ;;
    search)
        start_search
        ;;
    admin)
        start_admin
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac 