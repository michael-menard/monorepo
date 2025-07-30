# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy the entire monorepo for workspace dependencies
COPY . .

# Install dependencies using pnpm
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/web/lego-moc-instructions-app ./apps/web/lego-moc-instructions-app
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/package.json ./package.json

# Build the application
WORKDIR /app/apps/web/lego-moc-instructions-app
RUN corepack enable pnpm && pnpm run build

# Production image, copy all the files and run the app
FROM nginx:alpine AS runner
WORKDIR /app

# Copy the built application
COPY --from=builder /app/apps/web/lego-moc-instructions-app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY --from=builder /app/apps/web/lego-moc-instructions-app/nginx.conf /etc/nginx/nginx.conf

# Copy any additional static files
COPY --from=builder /app/apps/web/lego-moc-instructions-app/public /usr/share/nginx/html

EXPOSE 80

ENV PORT=80
ENV HOSTNAME="0.0.0.0"

CMD ["nginx", "-g", "daemon off;"] 