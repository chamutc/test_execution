#!/bin/bash

# 🚀 Resource Scheduler - React App Startup Script
# This script starts both backend and React frontend

echo "🚀 Starting Resource Scheduler React Application..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if Node.js is installed
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"
    else
        print_error "Node.js is not installed. Please install Node.js 16+ first."
        exit 1
    fi
}

# Check if npm is installed
check_npm() {
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm is installed: $NPM_VERSION"
    else
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
}

# Install dependencies if needed
install_dependencies() {
    if [ ! -d "node_modules" ]; then
        print_status "Installing backend dependencies..."
        npm install
    fi
    
    if [ ! -d "frontend/node_modules" ]; then
        print_status "Installing frontend dependencies..."
        cd frontend && npm install && cd ..
    fi
    
    print_success "All dependencies are installed"
}

# Start applications
start_applications() {
    print_status "Starting applications..."
    
    # Check if concurrently is available
    if command -v npx &> /dev/null && npm list concurrently &> /dev/null; then
        print_status "Starting both backend and frontend with concurrently..."
        npm run dev-all
    else
        print_warning "Concurrently not found. Please start applications manually:"
        echo ""
        echo "Terminal 1: npm start              # Backend (port 3000)"
        echo "Terminal 2: npm run frontend      # React Frontend (port 3001)"
        echo ""
        echo "Or install concurrently: npm install concurrently --save-dev"
        echo "Then run: npm run dev-all"
    fi
}

# Main function
main() {
    echo "🚀 Resource Scheduler React Setup"
    echo "=================================="
    
    # Run checks
    check_node
    check_npm
    install_dependencies
    
    echo ""
    echo "📋 Application URLs:"
    echo "- React Frontend:  http://localhost:3001"
    echo "- Backend API:     http://localhost:3000/api"
    echo "- Original Frontend: http://localhost:3000"
    echo ""
    
    start_applications
}

# Run main function
main
