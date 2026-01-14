#!/bin/bash

# ============================================
# Docker Start Script for Trendyol Dashboard
# ============================================
# Starts all services defined in docker-compose.yml

set -e  # Exit on error

echo "======================================"
echo "🚀 Starting Trendyol Dashboard"
echo "======================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if images exist
if ! docker images | grep -q "trendyol"; then
    echo "⚠️  Warning: Docker images not found. Building images first..."
    ./build-docker.sh
fi

# Start containers
echo ""
echo "🚀 Starting containers..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check service health
echo ""
echo "🔍 Checking service health..."

# Check backend health
backend_status=$(docker-compose ps backend | grep "healthy" || echo "not healthy")
if [[ "$backend_status" == *"healthy"* ]]; then
    echo "✅ Backend: healthy"
else
    echo "⚠️  Backend: starting..."
fi

# Check frontend health
frontend_status=$(docker-compose ps frontend | grep "healthy" || echo "not healthy")
if [[ "$frontend_status" == *"healthy"* ]]; then
    echo "✅ Frontend: healthy"
else
    echo "⚠️  Frontend: starting..."
fi

echo ""
echo "======================================"
echo "✅ Trendyol Dashboard is running!"
echo "======================================"
echo ""
echo "Access URLs:"
echo "  🌐 Frontend:  http://localhost:8080"
echo "  🔧 Backend:   http://localhost:8001"
echo "  📚 API Docs:  http://localhost:8001/docs"
echo ""
echo "Management:"
echo "  📊 View logs:   docker-compose logs -f"
echo "  🛑 Stop:        ./stop-docker.sh"
echo "  🔄 Restart:     docker-compose restart"
echo ""
