# Multi-stage build for monorepo frontend
FROM node:18-alpine AS base

# Install system dependencies for native modules
RUN apk add --no-cache \
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

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all package.json files
COPY packages/*/package.json ./packages/
COPY packages/*/*/package.json ./packages/
COPY apps/*/package.json ./apps/

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build all workspace packages
RUN pnpm --filter "./packages/*" build

# Build the frontend app
FROM node:18-alpine AS frontend

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy built packages and app
COPY --from=base /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=base /app/packages ./packages
COPY --from=base /app/apps/web/lego-moc-instructions-app ./apps/web/lego-moc-instructions-app

# Install production dependencies
RUN pnpm install --prod

WORKDIR /app/apps/web/lego-moc-instructions-app

EXPOSE 3001

CMD ["pnpm", "dev", "--host", "0.0.0.0"] 