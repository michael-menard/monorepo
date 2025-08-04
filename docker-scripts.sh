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

# Start all services
start_all() {
    print_header "Starting All Services"
    check_docker
    check_memory
    
    print_status "Building and starting all services..."
    docker-compose up --build -d
    
    print_status "Services are starting up. This may take a few minutes..."
    print_status "You can monitor the logs with: ./docker-scripts.sh logs"
    
    echo ""
    print_status "Service URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Auth API: http://localhost:5000/api/auth"
    echo "  Lego API: http://localhost:5001"
    echo "  MongoDB Admin: http://localhost:8081"
}

# Stop all services
stop_all() {
    print_header "Stopping All Services"
    check_docker
    
    print_status "Stopping all services..."
    docker-compose down
    
    print_status "All services stopped."
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
        print_header "All Service Logs"
        docker-compose logs -f
    else
        print_header "Logs for $service"
        docker-compose logs -f "$service"
    fi
}

# Show status
show_status() {
    print_header "Service Status"
    docker-compose ps
}

# Clean up everything
clean_all() {
    print_header "Cleaning All Docker Resources"
    check_docker
    
    print_warning "This will remove all containers, networks, volumes, and images!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Stopping and removing all containers..."
        docker-compose down -v --rmi all
        
        print_status "Removing unused Docker resources..."
        docker system prune -f
        
        print_status "Cleanup complete."
    else
        print_status "Cleanup cancelled."
    fi
}

# Rebuild specific service
rebuild_service() {
    local service=$1
    
    if [ -z "$service" ]; then
        print_error "Please specify a service to rebuild"
        echo "Available services: auth-service, lego-projects-api, lego-moc-app"
        exit 1
    fi
    
    print_header "Rebuilding $service"
    check_docker
    
    print_status "Rebuilding $service..."
    docker-compose up --build -d "$service"
    
    print_status "$service rebuilt and restarted."
}

# Start only databases
start_databases() {
    print_header "Starting Databases Only"
    check_docker
    
    print_status "Starting databases..."
    docker-compose up -d mongodb postgres redis elasticsearch
    
    print_status "Databases started."
}

# Start only APIs
start_apis() {
    print_header "Starting APIs Only"
    check_docker
    
    print_status "Starting APIs..."
    docker-compose up -d auth-service lego-projects-api
    
    print_status "APIs started."
}

# Start only frontend
start_frontend() {
    print_header "Starting Frontend Only"
    check_docker
    
    print_status "Starting frontend..."
    docker-compose up -d lego-moc-app
    
    print_status "Frontend started."
}

# Show help
show_help() {
    print_header "Docker Management Script"
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start           Start all services"
    echo "  stop            Stop all services"
    echo "  restart         Restart all services"
    echo "  logs [service]  Show logs (all or specific service)"
    echo "  status          Show service status"
    echo "  clean           Clean all Docker resources"
    echo "  rebuild <service> Rebuild specific service"
    echo "  databases       Start only databases"
    echo "  apis            Start only APIs"
    echo "  frontend        Start only frontend"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 logs lego-moc-app"
    echo "  $0 rebuild auth-service"
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
    apis)
        start_apis
        ;;
    frontend)
        start_frontend
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