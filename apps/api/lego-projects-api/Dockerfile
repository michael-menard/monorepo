# Multi-stage build for LEGO Projects API
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@9

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy package files for dependency resolution
COPY packages/*/package.json ./packages/*/
COPY apps/api/lego-projects-api/package.json ./apps/api/lego-projects-api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY apps/api/lego-projects-api/ ./apps/api/lego-projects-api/

# Build packages first
RUN pnpm turbo build --filter="./packages/*"

# Build the LEGO projects API
RUN pnpm turbo build --filter="lego-projects-api"

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
COPY apps/api/lego-projects-api/package.json ./apps/api/lego-projects-api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=base --chown=nodejs:nodejs /app/packages/*/dist ./packages/*/dist
COPY --from=base --chown=nodejs:nodejs /app/apps/api/lego-projects-api/dist ./apps/api/lego-projects-api/dist

# Copy database migrations and other runtime files
COPY --from=base --chown=nodejs:nodejs /app/apps/api/lego-projects-api/src/db/migrations ./apps/api/lego-projects-api/src/db/migrations
COPY --from=base --chown=nodejs:nodejs /app/apps/api/lego-projects-api/drizzle.config.ts ./apps/api/lego-projects-api/
COPY --from=base --chown=nodejs:nodejs /app/apps/api/lego-projects-api/package.json ./apps/api/lego-projects-api/

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "apps/api/lego-projects-api/dist/index.js"]
