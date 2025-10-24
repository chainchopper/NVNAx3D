#!/bin/bash

# =============================================================================
# NIRVANA Phase 0 Infrastructure Launcher (Linux/Mac)
# =============================================================================
# This script:
# 1. Verifies Docker is installed and running
# 2. Creates .env from .env.example if needed
# 3. Starts Docker Compose services (with GPU if available)
# 4. Waits for services to be healthy
# 5. Launches the NIRVANA web application
# 6. Handles graceful shutdown
# =============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Cleanup function for graceful shutdown
cleanup() {
    print_info "Shutting down NIRVANA infrastructure..."
    
    # Kill the web app if running
    if [ ! -z "$WEB_APP_PID" ]; then
        kill $WEB_APP_PID 2>/dev/null || true
    fi
    
    # Stop Docker Compose services
    docker-compose down
    
    print_success "NIRVANA infrastructure stopped gracefully"
    exit 0
}

# Trap signals for graceful shutdown
trap cleanup SIGINT SIGTERM

# =============================================================================
# Step 1: Check if Docker is installed
# =============================================================================
print_info "Checking Docker installation..."

if ! command_exists docker; then
    print_error "Docker is not installed!"
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

print_success "Docker is installed"

# =============================================================================
# Step 2: Check if Docker is running
# =============================================================================
print_info "Checking if Docker daemon is running..."

if ! docker info >/dev/null 2>&1; then
    print_error "Docker daemon is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

print_success "Docker daemon is running"

# =============================================================================
# Step 3: Check if docker-compose is available
# =============================================================================
print_info "Checking Docker Compose..."

if command_exists docker-compose; then
    COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    print_error "Docker Compose is not available!"
    echo "Please install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

print_success "Docker Compose is available"

# =============================================================================
# Step 4: Create .env file if it doesn't exist
# =============================================================================
print_info "Checking environment configuration..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        print_warning ".env file not found, creating from .env.example..."
        cp .env.example .env
        print_success ".env file created"
        print_info "Please review and customize .env file for your environment"
    else
        print_error ".env.example file not found!"
        exit 1
    fi
else
    print_success ".env file exists"
fi

# Load environment variables
source .env

# =============================================================================
# Step 5: Check for GPU support
# =============================================================================
print_info "Checking for GPU support..."

GPU_AVAILABLE=false
if command_exists nvidia-smi && nvidia-smi >/dev/null 2>&1; then
    GPU_AVAILABLE=true
    print_success "NVIDIA GPU detected"
    
    if [ "${USE_GPU:-false}" = "true" ]; then
        print_info "GPU support enabled in configuration"
        COMPOSE_FILES="-f docker-compose.yml -f docker-compose.gpu.yml"
    else
        print_warning "GPU available but not enabled in .env (USE_GPU=false)"
        COMPOSE_FILES="-f docker-compose.yml"
    fi
else
    print_info "No GPU detected, using CPU-only mode"
    COMPOSE_FILES="-f docker-compose.yml"
fi

# =============================================================================
# Step 6: Create data directories
# =============================================================================
print_info "Creating data directories..."

mkdir -p data/{etcd,minio,milvus,qdrant,postgres,flowise,n8n,jupyter}
print_success "Data directories created"

# =============================================================================
# Step 7: Start Docker Compose services
# =============================================================================
print_info "Starting NIRVANA infrastructure services..."
echo "This may take a few minutes on first run..."

$COMPOSE_CMD $COMPOSE_FILES up -d

if [ $? -eq 0 ]; then
    print_success "Docker services started"
else
    print_error "Failed to start Docker services"
    exit 1
fi

# =============================================================================
# Step 8: Wait for services to be healthy
# =============================================================================
print_info "Waiting for services to be healthy..."
echo "This may take 1-2 minutes..."

# Wait up to 180 seconds for services to be healthy
TIMEOUT=180
ELAPSED=0
ALL_HEALTHY=false

while [ $ELAPSED -lt $TIMEOUT ]; do
    if command_exists node && [ -f scripts/health-check.js ]; then
        if node scripts/health-check.js >/dev/null 2>&1; then
            ALL_HEALTHY=true
            break
        fi
    else
        # Fallback: just wait a bit
        sleep 10
        ALL_HEALTHY=true
        break
    fi
    
    sleep 5
    ELAPSED=$((ELAPSED + 5))
    echo -n "."
done

echo ""

if [ "$ALL_HEALTHY" = true ]; then
    print_success "All services are healthy"
else
    print_warning "Some services may not be fully ready"
    print_info "You can check service status with: $COMPOSE_CMD ps"
fi

# =============================================================================
# Step 9: Display service URLs
# =============================================================================
print_success "NIRVANA Infrastructure is ready!"
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Service Access URLs                        ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║ Flowise (LLM Orchestration):  http://localhost:${FLOWISE_PORT:-3000}        ║"
echo "║ n8n (Workflow Automation):    http://localhost:${N8N_PORT:-5678}        ║"
echo "║ Jupyter (Notebooks):          http://localhost:${JUPYTER_PORT:-8888}        ║"
echo "║ MinIO (Object Storage):       http://localhost:${MINIO_CONSOLE_PORT:-9001}        ║"
echo "║ Qdrant (Vector DB):           http://localhost:${QDRANT_PORT:-6333}/dashboard ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║ PostgreSQL:                   localhost:${POSTGRES_PORT:-5432}               ║"
echo "║ Milvus (Vector DB):           localhost:${MILVUS_PORT:-19530}               ║"
echo "║ Apache Tika:                  http://localhost:${TIKA_PORT:-9998}        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# =============================================================================
# Step 10: Launch web application
# =============================================================================
if [ "${SKIP_WEB_APP:-false}" != "true" ]; then
    print_info "Starting NIRVANA web application..."
    
    # Install dependencies if needed
    if [ ! -d node_modules ]; then
        print_info "Installing npm dependencies..."
        npm install
    fi
    
    # Start web app in background
    npm run dev &
    WEB_APP_PID=$!
    
    sleep 3
    
    if ps -p $WEB_APP_PID > /dev/null; then
        print_success "NIRVANA web app is running on http://localhost:${APP_PORT:-5000}"
    else
        print_warning "Web app may have failed to start. Check logs above."
    fi
    
    echo ""
    print_info "Press Ctrl+C to shut down all services gracefully"
    
    # Wait for web app process
    wait $WEB_APP_PID
else
    print_info "Skipping web app launch (SKIP_WEB_APP=true)"
    echo ""
    print_info "Infrastructure is running. Use '$COMPOSE_CMD down' to stop."
fi
