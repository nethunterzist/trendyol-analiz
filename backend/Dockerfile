FROM python:3.11-slim

# Metadata
LABEL maintainer="Trendyol Product Dashboard"
LABEL description="FastAPI backend for Trendyol product analytics"

WORKDIR /app

# Install system dependencies
# - libpq-dev: PostgreSQL client library for psycopg2
# - curl: Health check and debugging
RUN apt-get update && apt-get install -y \
    libpq-dev \
    curl \
    gosu \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (Docker layer caching)
# Build context is repo root, so path is backend/
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code from backend/
COPY backend/ .

# Copy categories data (bundled into image for Coolify deployment)
COPY categories/ /data/initial-categories/

# Create data directories with proper permissions
RUN mkdir -p /data/categories /data/reports /data/logs && \
    chmod -R 755 /data

# Make startup script executable (before switching to non-root user)
RUN chmod +x startup.sh

# Create non-root user for security
RUN useradd -m -u 1001 appuser && \
    chown -R appuser:appuser /app /data

# Expose backend port
EXPOSE 8001

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:8001/health || exit 1

# Environment variables (can be overridden at runtime)
ENV PYTHONUNBUFFERED=1 \
    DATABASE_URL=postgresql://postgres:trendyol123@postgres:5432/trendyol_db \
    CATEGORIES_DIR=/data/categories \
    REPORTS_DIR=/data/reports

# Start with migration script
CMD ["./startup.sh"]
