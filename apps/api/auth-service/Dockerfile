# Multi-stage build for Auth Service
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@9

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy package files for dependency resolution
COPY packages/*/package.json ./packages/*/
COPY apps/api/auth-service/package.json ./apps/api/auth-service/

# Install dependencies (ignore optional dependencies like canvas)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code
COPY packages/ ./packages/
COPY shared/ ./shared/
COPY apps/api/auth-service/ ./apps/api/auth-service/

# Build packages first
RUN pnpm turbo build --filter="./packages/*"

# Build the auth service
RUN pnpm turbo build --filter="@repo/api-auth-service"

# Production stage
FROM node:20-alpine AS production

# Install pnpm
RUN npm install -g pnpm@9

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json ./packages/*/
COPY apps/api/auth-service/package.json ./apps/api/auth-service/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built application
COPY --from=base --chown=nodejs:nodejs /app/packages/*/dist ./packages/*/dist
COPY --from=base --chown=nodejs:nodejs /app/shared ./shared
COPY --from=base --chown=nodejs:nodejs /app/apps/api/auth-service/dist ./apps/api/auth-service/dist

# Copy any additional files needed at runtime
COPY --from=base --chown=nodejs:nodejs /app/apps/api/auth-service/package.json ./apps/api/auth-service/

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "apps/api/auth-service/dist/index.js"]
