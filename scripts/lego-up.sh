#!/bin/bash

# LEGO App Full Stack Startup Script
# This script stands up the entire LEGO app with all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_ROOT/docker"

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

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check if pnpm is installed
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed. Please install pnpm first."
        exit 1
    fi
    
    # Check if required ports are available
    local ports=(3000 5000 5173 5432 27017 9200 5601 8081 6379)
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_warning "Port $port is already in use. This might cause conflicts."
        fi
    done
    
    print_success "Prerequisites check completed"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    # Check if .env file exists in docker directory
    if [ ! -f "$DOCKER_DIR/.env" ]; then
        print_warning ".env file not found. Creating from template..."
        cp "$DOCKER_DIR/env.docker.example" "$DOCKER_DIR/.env"
        print_warning "Please update $DOCKER_DIR/.env file with your configuration before continuing"
        print_warning "You can edit the file now and press Enter when ready, or Ctrl+C to cancel"
        read -r
    fi
    
    print_success "Environment setup completed"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Install root dependencies
    pnpm install
    
    # Install dependencies for each workspace
    pnpm --filter "lego-moc-instructions-app" install
    pnpm --filter "auth-service" install
    pnpm --filter "lego-projects-api" install
    
    print_success "Dependencies installed"
}

# Function to build Docker images
build_docker_images() {
    print_status "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build all Docker images
    docker build -t lego-moc-instructions-app:latest ./apps/web/lego-moc-instructions-app/
    docker build -t lego-auth-service:latest ./apps/api/auth-service/
    docker build -t lego-backend-api:latest ./apps/api/lego-projects-api/
    
    print_success "Docker images built successfully"
}

# Function to start development environment
start_dev_environment() {
    print_status "Starting development environment..."
    
    cd "$PROJECT_ROOT"
    
    # Start infrastructure services
    docker-compose -f "$DOCKER_DIR/docker-compose.dev.yml" up -d
    
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
start_prod_environment() {
    print_status "Starting production environment..."
    
    cd "$PROJECT_ROOT"
    
    # Start all services
    docker-compose -f "$DOCKER_DIR/docker-compose.yml" up -d
    
    print_success "Production environment started"
    print_status "Services available at:"
    echo "  - LEGO App (Frontend): http://localhost:5173"
    echo "  - Auth Service: http://localhost:5000"
    echo "  - Backend API: http://localhost:3000"
    echo "  - MongoDB Express: http://localhost:8081"
    echo "  - Kibana: http://localhost:5601"
}

# Function to start local development
start_local_development() {
    print_status "Starting local development servers..."
    
    cd "$PROJECT_ROOT"
    
    # Start local development servers using Turbo
    pnpm turbo run dev --parallel
    
    print_success "Local development servers started"
}

# Function to show status
show_status() {
    print_status "Checking service status..."
    
    cd "$PROJECT_ROOT"
    
    # Show Docker service status
    docker-compose -f "$DOCKER_DIR/docker-compose.yml" ps
    
    # Show running processes
    print_status "Running processes:"
    ps aux | grep -E "(node|vite|nodemon)" | grep -v grep || echo "No Node.js processes found"
}

# Function to show logs
show_logs() {
    local service=${1:-""}
    
    cd "$PROJECT_ROOT"
    
    if [ -z "$service" ]; then
        print_status "Showing logs for all services..."
        docker-compose -f "$DOCKER_DIR/docker-compose.yml" logs -f
    else
        print_status "Showing logs for $service..."
        docker-compose -f "$DOCKER_DIR/docker-compose.yml" logs -f "$service"
    fi
}

# Function to stop services
stop_services() {
    print_status "Stopping services..."
    
    cd "$PROJECT_ROOT"
    
    # Stop Docker services
    docker-compose -f "$DOCKER_DIR/docker-compose.yml" down
    docker-compose -f "$DOCKER_DIR/docker-compose.dev.yml" down
    
    # Kill any running Node.js processes
    pkill -f "node.*dev" || true
    pkill -f "vite" || true
    pkill -f "nodemon" || true
    
    print_success "Services stopped"
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up..."
    
    cd "$PROJECT_ROOT"
    
    # Stop and remove containers
    docker-compose -f "$DOCKER_DIR/docker-compose.yml" down -v
    docker-compose -f "$DOCKER_DIR/docker-compose.dev.yml" down -v
    
    # Remove images
    docker rmi lego-moc-instructions-app:latest lego-auth-service:latest lego-backend-api:latest 2>/dev/null || true
    
    # Remove unused volumes
    docker volume prune -f
    
    # Kill any running processes
    pkill -f "node.*dev" || true
    pkill -f "vite" || true
    pkill -f "nodemon" || true
    
    print_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "LEGO App Full Stack Startup Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev           Start development environment (infrastructure + local dev)"
    echo "  prod          Start production environment (full Docker stack)"
    echo "  local         Start local development servers only (no Docker)"
    echo "  build         Build Docker images"
    echo "  status        Show service status"
    echo "  logs [SERVICE] Show logs (all services or specific service)"
    echo "  stop          Stop all services"
    echo "  cleanup       Clean up all resources"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev        # Start development environment"
    echo "  $0 prod       # Start production environment"
    echo "  $0 logs lego-app"
    echo "  $0 status"
    echo ""
    echo "Development Workflow:"
    echo "  1. $0 dev     # Start infrastructure + local dev servers"
    echo "  2. Edit code  # Make changes to your code"
    echo "  3. $0 status  # Check service status"
    echo "  4. $0 stop    # Stop all services"
}

# Main script logic
case "${1:-help}" in
    "dev")
        check_prerequisites
        setup_environment
        install_dependencies
        build_docker_images
        start_dev_environment
        start_local_development
        print_success "Development environment is ready!"
        print_status "Access your app at: http://localhost:5173"
        ;;
    "prod")
        check_prerequisites
        setup_environment
        install_dependencies
        build_docker_images
        start_prod_environment
        print_success "Production environment is ready!"
        print_status "Access your app at: http://localhost:5173"
        ;;
    "local")
        check_prerequisites
        install_dependencies
        start_local_development
        print_success "Local development servers started!"
        ;;
    "build")
        check_prerequisites
        build_docker_images
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs $2
        ;;
    "stop")
        stop_services
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|*)
        show_help
        ;;
esac 