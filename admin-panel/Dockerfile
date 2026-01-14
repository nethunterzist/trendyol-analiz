# ============================================
# Stage 1: Build React Application with Vite
# ============================================
FROM node:18-alpine AS builder

# Metadata
LABEL maintainer="Trendyol Product Dashboard"
LABEL description="React frontend build stage"

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies (with clean npm cache)
RUN npm ci --legacy-peer-deps && \
    npm cache clean --force

# Copy source code
COPY . .

# Build argument for API URL (baked into production build)
ARG VITE_API_URL=http://localhost:8001
ENV VITE_API_URL=$VITE_API_URL

# Build production bundle
# Output: /app/dist directory with optimized static assets
RUN npm run build

# ============================================
# Stage 2: Serve with Nginx
# ============================================
FROM nginx:1.25-alpine

# Metadata
LABEL maintainer="Trendyol Product Dashboard"
LABEL description="React frontend production server"

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for web traffic
EXPOSE 80

# Health check configuration
# Checks if nginx is responding to HTTP requests
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Run nginx in foreground (required for Docker)
CMD ["nginx", "-g", "daemon off;"]
