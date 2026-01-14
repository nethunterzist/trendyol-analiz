#!/bin/bash
# Startup script for Trendyol Product Dashboard Backend
# Handles database migrations before starting the application

set -e

echo "🚀 Starting Trendyol Product Dashboard Backend..."

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

# Run migrations
echo "🔄 Running database migrations..."
alembic upgrade head
echo "✅ Migrations completed!"

# Start the FastAPI application
echo "🌐 Starting FastAPI server on port 8001..."
exec uvicorn main:app --host 0.0.0.0 --port 8001 --log-level info
