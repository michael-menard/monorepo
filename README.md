# LEGO MOC Platform Monorepo

A comprehensive monorepo for the LEGO MOC (My Own Creation) platform, featuring web applications, API services, and shared packages for building, managing, and sharing LEGO instructions with automated testing and quality assurance.

## 🏗️ Architecture Overview

This monorepo is organized into a modern, scalable architecture with clear separation of concerns:

```
Monorepo/
├── apps/                    # Applications
│   ├── api/                # Backend API services
│   │   ├── auth-service/   # Authentication service
│   │   └── lego-projects-api/ # Main API service
│   └── web/                # Frontend applications
│       ├── lego-moc-instructions-app/ # Main web app
│       └── lego-moc-docs/  # Documentation site
├── packages/               # Shared packages
│   ├── auth/              # Authentication components
│   ├── ui/                # Base UI components
│   ├── shared/            # Core utilities
│   ├── cache/            # Caching utilities
│   ├── shared-image-utils/ # Image processing
│   ├── tech-radar/        # Technology radar
│   └── features/          # Feature packages
│       ├── FileUpload/    # File upload components
│       ├── gallery/       # Gallery components
│       ├── ImageUploadModal/ # Image upload modal
│       ├── moc-instructions/ # MOC instruction components
│       ├── profile/       # User profile components
│       ├── shared/        # Feature-specific utilities
│       └── wishlist/      # Wishlist components
└── docs/                  # Documentation
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **pnpm** 8+
- **Git**
- **Docker** & **Docker Compose** (for external services only)

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd Monorepo
```

2. **Install dependencies:**
```bash
pnpm install
```

3. **Set up environment variables:**
```bash
# Copy main environment file (includes port configuration)
cp .env.example .env

# Copy service-specific environment files
cp apps/api/auth-service/.env.example apps/api/auth-service/.env
cp apps/api/lego-projects-api/.env.example apps/api/lego-projects-api/.env
cp apps/web/lego-moc-instructions-app/env.example apps/web/lego-moc-instructions-app/.env.local

# Optional: Create local port overrides
cp .env.ports .env.ports.local
# Edit .env.ports.local to customize ports for your setup
```

4. **Start development services:**
```bash
# Start external services (databases, search, admin tools)
pnpm dev:infra

# Start all applications natively
pnpm dev
```

5. **Access the applications:**
- **Main Web App**: http://localhost:3002
- **Documentation**: http://localhost:3000
- **Auth API**: http://localhost:9300
- **Main API**: http://localhost:9000

### 🔧 Troubleshooting

#### Port Conflicts
If you encounter port conflicts, the development script automatically cleans up ports before starting. You can also manually clean ports:

```bash
# Kill processes on all application ports
pnpm kill-ports

# Kill processes on specific ports
pnpm kill-port 3002
./scripts/kill-ports.sh 9300 9000

# Check what's running on a port (macOS/Linux)
lsof -ti:3002
```

#### Port Configuration
The monorepo uses centralized port configuration through environment variables:

- **Default ports** are defined in `.env.ports`
- **Local overrides** can be set in `.env.ports.local` (gitignored)
- **Environment variables** are used throughout the system:
  - `WEB_APP_PORT=3002` - Frontend application
  - `AUTH_API_PORT=9300` - Authentication service
  - `LEGO_API_PORT=9000` - Main API service
  - `DOCS_PORT=3000` - Documentation site

To change ports system-wide:
```bash
# Create local port configuration
cp .env.ports .env.ports.local

# Edit the ports in .env.ports.local
WEB_APP_PORT=4000
AUTH_API_PORT=9400
LEGO_API_PORT=9100
```

#### Common Issues
- **"Port already in use"**: Run `pnpm kill-ports` before starting development
- **Docker not running**: Ensure Docker Desktop is running before starting
- **Services not responding**: Check logs with `pnpm logs:auth` or `pnpm logs:lego`
- **Port conflicts**: Customize ports in `.env.ports.local`

## 📦 Packages Overview

### Core Packages

#### `@repo/shared`
Core utilities and design system tokens used across the entire monorepo.

**Features:**
- Design system tokens and theme configuration
- Core utility functions (date, string, validation, etc.)
- Custom React hooks
- TypeScript type definitions
- Responsive utilities

**Usage:**
```tsx
import { formatDate, validateEmail, useLocalStorage } from '@repo/shared';
```

#### `@repo/ui`
Base UI components built with shadcn/ui and Tailwind CSS.

**Features:**
- Reusable UI components
- Consistent design system
- Accessibility support
- TypeScript integration
- Customizable theming

**Usage:**
```tsx
import { Button, Input, Card } from '@repo/ui';
```

#### `@repo/auth`
Authentication package with Redux Toolkit integration.

**Features:**
- Complete authentication flow
- Redux state management
- React hooks for auth
- Route protection
- Email verification

**Usage:**
```tsx
import { useAuth, RouteGuard } from '@repo/auth';
```

### Feature Packages

#### `@repo/features/gallery`
Gallery component package for displaying and managing image collections.

**Features:**
- Image gallery with grid layout
- Advanced search and filtering
- Upload integration
- Responsive design

#### `@repo/features/wishlist`
Wishlist management package for LEGO sets and parts.

**Features:**
- Multi-select functionality
- Categorization and filtering
- Sharing capabilities
- Bulk operations

#### `@repo/features/profile`
User profile management package.

**Features:**
- Profile editing and display
- Avatar upload with cropping
- Guided tours
- Tabbed navigation

#### `@repo/features/moc-instructions`
MOC instruction creation and management.

**Features:**
- Step-by-step instruction builder
- Image integration
- Version control
- Collaboration tools

#### `@monorepo/upload`
Unified file and image upload system with comprehensive functionality.

**Features:**
- Drag and drop support
- Image preview and processing
- Progress tracking
- File validation
- Multiple upload modes (inline, modal, avatar)
- Image compression and optimization
- Error handling

### Utility Packages

#### `@repo/cache`
Caching utilities for improved performance.

**Features:**
- Redis integration
- Memory caching
- Cache invalidation
- Performance optimization

#### `@monorepo/upload` (Consolidated)
Unified file and image upload system with comprehensive functionality.

**Features:**
- File upload with drag-and-drop support
- Image processing and optimization
- Progress tracking and validation
- Multiple upload modes (inline, modal, avatar)
- Image compression and format conversion
- Metadata extraction

#### `@repo/tech-radar`
Technology radar visualization for tracking tech decisions.

**Features:**
- Interactive radar chart
- Quadrant organization
- Adoption stage tracking
- Filtering and search

## 🏃‍♂️ Development

### Available Scripts

```bash
# Development
pnpm dev              # Start all applications (with automatic port cleanup)
pnpm dev:web          # Start web applications only
pnpm dev:api          # Start API services only

# Port Management
pnpm kill-ports       # Kill processes on all application ports (uses .env.ports config)
pnpm kill-port 3002   # Kill processes on a specific port

# Building
pnpm build            # Build all packages and apps
pnpm build:packages   # Build packages only
pnpm build:apps       # Build applications only

# Testing
pnpm test             # Run all tests
pnpm test:packages    # Test packages only
pnpm test:apps        # Test applications only
pnpm test:e2e         # Run end-to-end tests
pnpm test:coverage    # Generate coverage reports

# Linting and Formatting
pnpm lint             # Lint all code
pnpm lint:fix         # Fix linting issues
pnpm format           # Format all code
pnpm format:check     # Check formatting

# Database
pnpm db:migrate       # Run database migrations
pnpm db:seed          # Seed database with test data
pnpm db:reset         # Reset database

# Utilities
pnpm clean            # Clean all build artifacts
pnpm type-check       # Run TypeScript type checking
pnpm changeset        # Create a changeset
```

### Development Workflow

1. **Create a feature branch:**
```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes:**
   - Follow the coding standards
   - Write tests for new features
   - Update documentation

3. **Run tests and checks:**
```bash
pnpm test
pnpm lint
pnpm type-check
```

4. **Create a changeset:**
```bash
pnpm changeset
```

5. **Submit a pull request**

### Code Standards

- **TypeScript**: Strict mode enabled, no `any` types
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Consistent code formatting
- **Testing**: Vitest for unit tests, Playwright for E2E
- **Commits**: Conventional commit messages

## 🧪 Testing

### Test Structure

```
__tests__/           # Test directories
├── unit/            # Unit tests
├── integration/     # Integration tests
├── e2e/             # End-to-end tests
└── setup/           # Test setup and utilities
```

### Running Tests

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# Test with coverage
pnpm test:coverage

# Test specific package
pnpm --filter @repo/ui test
```

### Test Coverage

- **Unit Tests**: 90%+ coverage required
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Critical user journeys
- **Visual Regression**: UI component testing

## 🚀 Deployment

### Production Build

```bash
# Build all applications
pnpm build

# Build specific application
pnpm --filter lego-moc-instructions-app build
```

### Production Deployment

```bash
# Build all applications for production
pnpm build

# Deploy using your preferred method (Vercel, Netlify, etc.)
# External services can still use Docker in production
```

### Environment Configuration

Production environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Authentication
JWT_SECRET=your-production-jwt-secret
JWT_EXPIRES_IN=7d

# File Storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket

# Email
EMAIL_HOST=smtp.provider.com
EMAIL_PORT=587
EMAIL_USER=your-email
EMAIL_PASS=your-password
```

## 📚 Documentation

### Package Documentation

Each package includes comprehensive documentation:

- [Auth Package](../../packages/auth/README.md)
- [UI Package](../../packages/ui/README.md)
- [Shared Package](../../packages/shared/README.md)
- [Gallery Package](../../packages/features/gallery/README.md)
- [Wishlist Package](../../packages/features/wishlist/README.md)
- [Profile Package](../../packages/features/profile/README.md)
- [MOC Instructions Package](../../packages/features/moc-instructions/README.md)

### Application Documentation

- [Main Web App](../../apps/web/lego-moc-instructions-app/README.md)
- [Documentation Site](../../apps/web/lego-moc-docs/README.md)
- [API Services](../../apps/api/README.md)

### Guides

- [API Documentation](../../docs/API_DOCUMENTATION.md)
- [Email Testing](../../docs/EMAIL_TESTING.md)
- [Playwright Testing](../../docs/PLAYWRIGHT_TESTING.md)
- [Database Migration](../../apps/api/MIGRATION_STRATEGY.md)

## 🔧 Configuration

### TypeScript Configuration

All packages use ESNext module resolution:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true
  }
}
```

### Vite Configuration

Standard Vite configuration with React plugin:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'ESNext'
  }
});
```

### Tailwind Configuration

Tailwind CSS v4 with custom design tokens:

```typescript
import { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)'
      }
    }
  }
} satisfies Config;
```

## 🤝 Contributing

### Getting Started

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Update documentation
6. Submit a pull request

### Development Guidelines

- **Code Quality**: Follow TypeScript best practices
- **Testing**: Write comprehensive tests
- **Documentation**: Update README files and API docs
- **Performance**: Consider bundle size and runtime performance
- **Accessibility**: Ensure WCAG compliance
- **Security**: Follow security best practices

### Pull Request Process

1. **Description**: Clear description of changes
2. **Tests**: All tests must pass
3. **Documentation**: Update relevant documentation
4. **Review**: Code review required
5. **Merge**: Squash and merge

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help

- **Documentation**: Check the package and application README files
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact the development team

### Troubleshooting

Common issues and solutions:

**Build Failures**
- Clear node_modules and reinstall: `pnpm clean && pnpm install`
- Check TypeScript errors: `pnpm type-check`
- Verify environment variables

**Test Failures**
- Run tests individually: `pnpm --filter package-name test`
- Check test environment setup
- Verify database connection

**Runtime Errors**
- Check browser console for errors
- Verify API endpoints are running
- Check environment configuration

## 🗺️ Roadmap

### Upcoming Features

- **Real-time Collaboration**: Live editing of MOC instructions
- **3D Model Integration**: Support for 3D LEGO models
- **Mobile App**: Native mobile applications
- **Advanced Analytics**: User behavior and performance analytics
- **Internationalization**: Multi-language support
- **Advanced Search**: AI-powered search and recommendations

### Performance Improvements

- **Bundle Optimization**: Reduce bundle sizes
- **Caching Strategy**: Implement advanced caching
- **CDN Integration**: Global content delivery
- **Database Optimization**: Query optimization and indexing

### Developer Experience

- **Storybook Integration**: Component documentation
- **Performance Monitoring**: Real-time performance tracking
- **Automated Testing**: Enhanced CI/CD pipeline
- **Developer Tools**: Enhanced debugging and development tools
