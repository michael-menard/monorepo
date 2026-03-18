# Bun + Hono API Service
FROM oven/bun:1-deps AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json ./
RUN bun install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Add non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

USER appuser

EXPOSE 3004

CMD ["bun", "run", "src/index.ts"]
