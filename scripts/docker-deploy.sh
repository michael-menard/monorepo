#!/bin/bash

# LEGO App Docker Deployment Script
# This script provides comprehensive Docker deployment functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="lego-app"
AUTH_SERVICE_NAME="lego-auth-service"
BACKEND_API_NAME="lego-backend-api"
LEGO_APP_NAME="lego-moc-instructions-app"
DOCKER_REGISTRY=""
ENVIRONMENT=${1:-development}
DOCKER_DIR="docker"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to build Docker images
build_images() {
    print_status "Building Docker images..."
    
    # Build Auth Service
    print_status "Building Auth Service..."
    docker build -t ${AUTH_SERVICE_NAME}:latest ./apps/api/auth-service/
    print_success "Auth Service image built successfully"
    
    # Build Backend API
    print_status "Building Backend API..."
    docker build -t ${BACKEND_API_NAME}:latest ./apps/api/lego-projects-api/
    print_success "Backend API image built successfully"
    
    # Build LEGO App (Frontend)
    print_status "Building LEGO App (Frontend)..."
    docker build -t ${LEGO_APP_NAME}:latest ./apps/web/lego-moc-instructions-app/
    print_success "LEGO App image built successfully"
    
    print_success "All images built successfully"
}

# Function to start development environment
start_dev() {
    print_status "Starting development environment..."
    
    # Check if docker directory exists
    if [ ! -d "$DOCKER_DIR" ]; then
        print_error "Docker directory not found: $DOCKER_DIR"
        exit 1
    fi
    
    # Start only the infrastructure services
    docker-compose -f $DOCKER_DIR/docker-compose.dev.yml up -d
    
    print_success "Development infrastructure started"
    print_status "Services available at:"
    echo "  - MongoDB: localhost:27017"
    echo "  - MongoDB Express: http://localhost:8081"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - Elasticsearch: http://localhost:9200"
    echo "  - Kibana: http://localhost:5601"
    echo "  - Redis: localhost:6379"
}

# Function to start production environment
start_prod() {
    print_status "Starting production environment..."
    
    # Check if docker directory exists
    if [ ! -d "$DOCKER_DIR" ]; then
        print_error "Docker directory not found: $DOCKER_DIR"
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f "$DOCKER_DIR/.env" ]; then
        print_warning ".env file not found. Creating from template..."
        cp $DOCKER_DIR/env.docker.example $DOCKER_DIR/.env
        print_warning "Please update $DOCKER_DIR/.env file with your configuration before continuing"
        exit 1
    fi
    
    # Start all services
    docker-compose -f $DOCKER_DIR/docker-compose.yml up -d
    
    print_success "Production environment started"
    print_status "Services available at:"
    echo "  - LEGO App (Frontend): http://localhost:5173"
    echo "  - Auth Service: http://localhost:5000"
    echo "  - Backend API: http://localhost:3000"
    echo "  - MongoDB Express: http://localhost:8081"
    echo "  - Kibana: http://localhost:5601"
}

# Function to deploy to Docker Swarm
deploy_swarm() {
    print_status "Deploying to Docker Swarm..."
    
    # Check if docker directory exists
    if [ ! -d "$DOCKER_DIR" ]; then
        print_error "Docker directory not found: $DOCKER_DIR"
        exit 1
    fi
    
    # Check if swarm is initialized
    if ! docker info | grep -q "Swarm: active"; then
        print_status "Initializing Docker Swarm..."
        docker swarm init
    fi
    
    # Deploy the stack
    docker stack deploy -c $DOCKER_DIR/docker-stack.yml ${PROJECT_NAME}
    
    print_success "Stack deployed successfully"
    print_status "Check service status with: docker service ls"
}

# Function to stop services
stop_services() {
    print_status "Stopping services..."
    
    if [ "$ENVIRONMENT" = "development" ]; then
        docker-compose -f $DOCKER_DIR/docker-compose.dev.yml down
    else
        docker-compose -f $DOCKER_DIR/docker-compose.yml down
    fi
    
    print_success "Services stopped"
}

# Function to stop swarm stack
stop_swarm() {
    print_status "Removing swarm stack..."
    docker stack rm ${PROJECT_NAME}
    print_success "Swarm stack removed"
}

# Function to show logs
show_logs() {
    local service=${1:-""}
    
    if [ -z "$service" ]; then
        print_status "Showing logs for all services..."
        if [ "$ENVIRONMENT" = "development" ]; then
            docker-compose -f $DOCKER_DIR/docker-compose.dev.yml logs -f
        else
            docker-compose -f $DOCKER_DIR/docker-compose.yml logs -f
        fi
    else
        print_status "Showing logs for $service..."
        if [ "$ENVIRONMENT" = "development" ]; then
            docker-compose -f $DOCKER_DIR/docker-compose.dev.yml logs -f $service
        else
            docker-compose -f $DOCKER_DIR/docker-compose.yml logs -f $service
        fi
    fi
}

# Function to show status
show_status() {
    print_status "Service status:"
    
    if [ "$ENVIRONMENT" = "development" ]; then
        docker-compose -f $DOCKER_DIR/docker-compose.dev.yml ps
    else
        docker-compose -f $DOCKER_DIR/docker-compose.yml ps
    fi
}

# Function to clean up
cleanup() {
    print_status "Cleaning up Docker resources..."
    
    # Stop and remove containers
    if [ "$ENVIRONMENT" = "development" ]; then
        docker-compose -f $DOCKER_DIR/docker-compose.dev.yml down -v
    else
        docker-compose -f $DOCKER_DIR/docker-compose.yml down -v
    fi
    
    # Remove images
    docker rmi ${AUTH_SERVICE_NAME}:latest ${BACKEND_API_NAME}:latest ${LEGO_APP_NAME}:latest 2>/dev/null || true
    
    # Remove unused volumes
    docker volume prune -f
    
    print_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "LEGO App Docker Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND] [ENVIRONMENT]"
    echo ""
    echo "Commands:"
    echo "  build           Build Docker images"
    echo "  dev             Start development environment (infrastructure only)"
    echo "  prod            Start production environment"
    echo "  swarm           Deploy to Docker Swarm"
    echo "  stop            Stop services"
    echo "  stop-swarm      Remove swarm stack"
    echo "  logs [SERVICE]  Show logs (all services or specific service)"
    echo "  status          Show service status"
    echo "  cleanup         Clean up Docker resources"
    echo "  help            Show this help message"
    echo ""
    echo "Environments:"
    echo "  development     Use development configuration (default)"
    echo "  production      Use production configuration"
    echo ""
    echo "Examples:"
    echo "  $0 build"
    echo "  $0 dev"
    echo "  $0 prod production"
    echo "  $0 logs lego-app"
    echo ""
    echo "Docker files are located in: $DOCKER_DIR/"
    echo ""
    echo "Services:"
    echo "  - lego-app (Frontend): LEGO MOC Instructions App"
    echo "  - auth-service: Authentication service"
    echo "  - backend-api: Backend API (LEGO Projects API)"
}

# Main script logic
case "${1:-help}" in
    "build")
        check_docker
        build_images
        ;;
    "dev")
        check_docker
        start_dev
        ;;
    "prod")
        check_docker
        build_images
        start_prod
        ;;
    "swarm")
        check_docker
        build_images
        deploy_swarm
        ;;
    "stop")
        stop_services
        ;;
    "stop-swarm")
        stop_swarm
        ;;
    "logs")
        show_logs $2
        ;;
    "status")
        show_status
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|*)
        show_help
        ;;
esac 