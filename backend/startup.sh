#!/bin/bash
# Startup script for Trendyol Product Dashboard Backend
# Handles database migrations before starting the application

set -e

echo "🚀 Starting Trendyol Product Dashboard Backend..."

# Fix permissions on volume-mounted directories (Coolify mounts as root)
echo "🔧 Fixing data directory permissions..."
chown -R appuser:appuser /data 2>/dev/null || true
chmod -R 755 /data 2>/dev/null || true

# Database URL from environment
DB_URL="${DATABASE_URL:-postgresql://postgres:trendyol123@postgres:5432/trendyol_db}"
echo "📦 Database: PostgreSQL"

# Wait for PostgreSQL to be ready (in case depends_on isn't enough)
echo "⏳ Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if python -c "from sqlalchemy import create_engine; e = create_engine('$DB_URL'); e.connect()" 2>/dev/null; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   Attempt $RETRY_COUNT/$MAX_RETRIES - PostgreSQL not ready, waiting..."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ Failed to connect to PostgreSQL after $MAX_RETRIES attempts"
    exit 1
fi

# Seed categories data from bundled initial-categories if /data/categories is empty
if [ -d "/data/initial-categories" ] && [ "$(ls -A /data/initial-categories 2>/dev/null)" ]; then
    if [ -z "$(ls -A /data/categories 2>/dev/null)" ]; then
        echo "📂 Seeding categories from bundled data..."
        cp -r /data/initial-categories/* /data/categories/
        echo "✅ $(ls /data/categories | wc -l) category files copied!"
    else
        echo "📂 Categories directory already has data, skipping seed."
    fi
fi

# Fix permissions again after seeding (seeding runs as root)
echo "🔧 Final permission fix..."
chown -R appuser:appuser /data 2>/dev/null || true
chmod -R 755 /data 2>/dev/null || true

# Run migrations
echo "🔄 Running database migrations..."
alembic upgrade head
echo "✅ Migrations completed!"

# Start the FastAPI application
echo "🌐 Starting FastAPI server on port 8001..."
exec gosu appuser uvicorn main:app --host 0.0.0.0 --port 8001 --log-level info
