# Multi-stage Dockerfile for Auth Service with Security Hardening
# Build stage - Install dependencies and build the application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Install build dependencies for native packages (like canvas)
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Copy package files for dependency resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/auth-service/package.json ./apps/api/auth-service/

# Install all dependencies first (needed for monorepo workspace resolution)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Change to the service directory and build there with proper node_modules resolution
WORKDIR /app/apps/api/auth-service
RUN pnpm build

# Create a clean production installation
RUN rm -rf node_modules
RUN pnpm install --prod --no-frozen-lockfile

# Go back to root for remaining commands
WORKDIR /app

# Remove build dependencies to reduce image size
RUN apk del .build-deps

# Runtime stage - Create optimized production image
FROM node:18-alpine

# Install security updates and required tools for health checks
RUN apk update && apk upgrade && \
    apk add --no-cache wget && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy production dependencies and built application from builder stage
COPY --from=builder --chown=appuser:appgroup /app/apps/api/auth-service/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/apps/api/auth-service/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/apps/api/auth-service/package.json ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=9000
ENV NODE_OPTIONS="--enable-source-maps"

# Remove unnecessary packages and clean up
RUN apk del --purge && \
    rm -rf /tmp/* /var/tmp/* /var/cache/apk/*

# Expose port (documentation only, doesn't actually publish)
EXPOSE 9000

# Switch to non-root user for security
USER appuser

# Add health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9000/api/auth/health || exit 1

# Start the service
CMD ["node", "dist/index.js"]
