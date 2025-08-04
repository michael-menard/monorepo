# API Services

This directory contains the backend API services for the LEGO MOC platform, providing authentication, user management, and MOC instruction services.

## Services Overview

### Auth Service (`auth-service/`)
Authentication and user management service with email verification, password reset, and JWT token management.

### LEGO Projects API (`lego-projects-api/`)
Main API service for MOC instructions, gallery management, wishlist functionality, and file uploads.

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for caching)
- Docker & Docker Compose (for local development)

### Development Setup

1. **Clone and navigate to the API directory:**
```bash
cd apps/api
```

2. **Set up environment variables:**
```bash
# Copy environment files
cp auth-service/.env.example auth-service/.env
cp lego-projects-api/.env.example lego-projects-api/.env
```

3. **Start services with Docker Compose:**
```bash
docker-compose up -d
```

4. **Install dependencies:**
```bash
# Auth service
cd auth-service && pnpm install

# LEGO Projects API
cd ../lego-projects-api && pnpm install
```

5. **Run database migrations:**
```bash
# Auth service
cd auth-service && pnpm db:migrate

# LEGO Projects API
cd ../lego-projects-api && pnpm db:migrate
```

6. **Start development servers:**
```bash
# Auth service (port 3000)
cd auth-service && pnpm dev

# LEGO Projects API (port 3001)
cd ../lego-projects-api && pnpm dev
```

## Service Details

### Auth Service

**Port:** 3000  
**Purpose:** User authentication and management

#### Features
- User registration and login
- Email verification
- Password reset functionality
- JWT token management
- User profile management
- Session management

#### API Endpoints

```http
# Authentication
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/verify-email
POST /api/auth/forgot-password
POST /api/auth/reset-password

# User Management
GET /api/auth/profile
PUT /api/auth/profile
PUT /api/auth/avatar
DELETE /api/auth/account
```

#### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/auth_db

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# Email (Ethereal for testing)
EMAIL_HOST=ethereal.email
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password

# Server
PORT=3000
NODE_ENV=development
```

### LEGO Projects API

**Port:** 3001  
**Purpose:** MOC instructions, gallery, and wishlist management

#### Features
- MOC instruction CRUD operations
- Image upload and management
- Gallery functionality
- Wishlist management
- Search and filtering
- User preferences

#### API Endpoints

```http
# MOC Instructions
GET /api/instructions
GET /api/instructions/:id
POST /api/instructions
PUT /api/instructions/:id
DELETE /api/instructions/:id
GET /api/instructions/search

# Gallery
GET /api/gallery
POST /api/gallery/upload
DELETE /api/gallery/:id
GET /api/gallery/search

# Wishlist
GET /api/wishlist
POST /api/wishlist
PUT /api/wishlist/:id
DELETE /api/wishlist/:id
GET /api/wishlist/search

# User Preferences
GET /api/preferences
PUT /api/preferences
```

#### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lego_projects

# File Upload (AWS S3)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# Server
PORT=3001
NODE_ENV=development

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

## Database Schema

### Auth Service Database

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  avatar_url VARCHAR(500),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### LEGO Projects Database

```sql
-- MOC Instructions table
CREATE TABLE moc_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
  estimated_time INTEGER, -- in minutes
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Instruction Steps table
CREATE TABLE instruction_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instruction_id UUID REFERENCES moc_instructions(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title VARCHAR(255),
  description TEXT,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gallery table
CREATE TABLE gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title VARCHAR(255),
  description TEXT,
  image_url VARCHAR(500) NOT NULL,
  tags TEXT[],
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wishlist table
CREATE TABLE wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  set_number VARCHAR(50),
  price DECIMAL(10,2),
  category VARCHAR(100),
  priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

### Running Tests

```bash
# Auth service tests
cd auth-service
pnpm test

# LEGO Projects API tests
cd ../lego-projects-api
pnpm test

# Run all API tests
pnpm test:all
```

### Test Coverage

Both services include comprehensive test coverage:
- Unit tests for utilities and helpers
- Integration tests for API endpoints
- Database tests with test fixtures
- Authentication and authorization tests

## Deployment

### Docker Deployment

```bash
# Build images
docker build -t auth-service ./auth-service
docker build -t lego-projects-api ./lego-projects-api

# Run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Configuration

Production environment variables should be configured securely:

```env
# Production Database
DATABASE_URL=postgresql://user:password@prod-db:5432/database

# Production JWT
JWT_SECRET=your-production-jwt-secret

# Production Email
EMAIL_HOST=smtp.provider.com
EMAIL_PORT=587
EMAIL_USER=your-production-email
EMAIL_PASS=your-production-password

# Production AWS
AWS_ACCESS_KEY_ID=your-production-access-key
AWS_SECRET_ACCESS_KEY=your-production-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-production-bucket
```

## Security

### Authentication & Authorization

- JWT tokens for stateless authentication
- Password hashing with bcrypt
- Email verification for new accounts
- Password reset functionality
- Role-based access control (RBAC)

### API Security

- Input validation with Zod schemas
- SQL injection prevention with parameterized queries
- CORS configuration
- Rate limiting
- Request size limits
- HTTPS enforcement in production

### Data Protection

- Sensitive data encryption
- Secure file upload validation
- Image processing security
- Database connection security

## Monitoring & Logging

### Logging

Both services use structured logging:

```typescript
import { logger } from './utils/logger';

logger.info('User registered', { userId, email });
logger.error('Database connection failed', { error: error.message });
```

### Health Checks

Health check endpoints for monitoring:

```http
GET /api/health
GET /api/health/detailed
```

### Metrics

- Request/response metrics
- Database query performance
- Error rates and types
- User activity metrics

## API Documentation

### OpenAPI/Swagger

Both services include OpenAPI documentation:

- Auth Service: `http://localhost:3000/api-docs`
- LEGO Projects API: `http://localhost:3001/api-docs`

### Postman Collections

Postman collections are available in the `__docs__` directories:
- `auth-service/__docs__/Auth_Service_API.postman_collection.json`
- `lego-projects-api/__docs__/LEGO_Projects_API.postman_collection.json`

## Troubleshooting

### Common Issues

**Database Connection Errors**
- Verify database is running
- Check connection string format
- Ensure database exists and is accessible

**Email Service Issues**
- Check SMTP configuration
- Verify email credentials
- Test with Ethereal for development

**File Upload Failures**
- Verify AWS credentials
- Check S3 bucket permissions
- Ensure proper CORS configuration

**Authentication Issues**
- Verify JWT secret is set
- Check token expiration settings
- Ensure proper CORS configuration

## Contributing

1. Follow the monorepo's coding standards
2. Write tests for new endpoints
3. Update API documentation
4. Ensure proper error handling
5. Follow security best practices

## Related Documentation

- [Auth Service Documentation](./auth-service/README.md)
- [LEGO Projects API Documentation](./lego-projects-api/README.md)
- [Database Migration Guide](./MIGRATION_STRATEGY.md)
- [Email Testing Guide](../../docs/EMAIL_TESTING.md) 