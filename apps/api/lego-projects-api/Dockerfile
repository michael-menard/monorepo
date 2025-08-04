FROM node:20-alpine

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

# Copy root package files for workspace setup
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all package.json files from packages directory
COPY packages/shared-image-utils/package.json ./packages/shared-image-utils/
COPY packages/shared-cache/package.json ./packages/shared-cache/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/auth/package.json ./packages/auth/
COPY packages/features/moc-instructions/package.json ./packages/features/moc-instructions/
COPY packages/features/profile/package.json ./packages/features/profile/
COPY packages/features/gallery/package.json ./packages/features/gallery/
COPY packages/features/wishlist/package.json ./packages/features/wishlist/
COPY packages/features/FileUpload/package.json ./packages/features/FileUpload/
COPY packages/features/ImageUploadModal/package.json ./packages/features/ImageUploadModal/
COPY packages/tech-radar/package.json ./packages/tech-radar/

# Copy the specific app package.json
COPY apps/api/lego-projects-api/package.json ./apps/api/lego-projects-api/

# Install dependencies with workspace linking
RUN pnpm install

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p apps/api/lego-projects-api/uploads

# Set working directory to the lego projects API
WORKDIR /app/apps/api/lego-projects-api

# Expose port
EXPOSE 3001

# Start the application
CMD ["pnpm", "dev"] 