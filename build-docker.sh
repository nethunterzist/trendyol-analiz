#!/bin/bash

# ============================================
# Docker Build Script for Trendyol Dashboard
# ============================================
# Builds both backend and frontend Docker images

set -e  # Exit on error

echo "======================================"
echo "🔨 Building Trendyol Dashboard Docker Images"
echo "======================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Create data directories if they don't exist
echo ""
echo "📁 Creating data directories..."
mkdir -p data/database
mkdir -p categories
mkdir -p reports
echo "✅ Data directories created"

# Build images
echo ""
echo "🔨 Building Docker images..."
docker-compose build --no-cache

echo ""
echo "======================================"
echo "✅ Docker images built successfully!"
echo "======================================"
echo ""
echo "Next steps:"
echo "  1. Start containers: ./start-docker.sh"
echo "  2. View logs: docker-compose logs -f"
echo "  3. Stop containers: ./stop-docker.sh"
echo ""
