#!/bin/bash

# ============================================
# Docker Stop Script for Trendyol Dashboard
# ============================================
# Stops and removes all containers

set -e  # Exit on error

echo "======================================"
echo "🛑 Stopping Trendyol Dashboard"
echo "======================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Stop containers
echo ""
echo "🛑 Stopping containers..."
docker-compose down

echo ""
echo "======================================"
echo "✅ Trendyol Dashboard stopped!"
echo "======================================"
echo ""
echo "Data preserved in:"
echo "  📁 ./data/database (SQLite database)"
echo "  📁 ./categories (category data)"
echo "  📁 ./reports (report files)"
echo ""
echo "Next steps:"
echo "  🚀 Start again:      ./start-docker.sh"
echo "  🔨 Rebuild images:   ./build-docker.sh"
echo "  🗑️  Clean all data:   docker-compose down -v"
echo ""
