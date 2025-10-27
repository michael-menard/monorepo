# 🔐 Auth Service

A comprehensive authentication service built with Express.js, MongoDB, and React, now integrated into the turborepo monorepo structure.

## 🏗️ Project Structure

```
apps/auth-service/
├── backend/                 # Express.js API server
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Express middleware
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── utils/             # Utility functions
│   ├── db/                # Database connection
│   └── index.ts           # Server entry point
├── frontend/              # React frontend
│   ├── src/               # React source code
│   ├── public/            # Static assets
│   └── package.json       # Frontend dependencies
├── package.json           # Backend dependencies
├── tsconfig.json          # TypeScript config
└── .env.example          # Environment variables template
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or cloud)
- pnpm (recommended package manager)

### Installation

1. **Install dependencies from the root:**

   ```bash
   pnpm install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the development servers:**

   **Backend only:**

   ```bash
   pnpm --filter @repo/auth-service dev
   ```

   **Frontend only:**

   ```bash
   pnpm --filter @repo/auth-service-frontend dev
   ```

   **Both backend and frontend:**

   ```bash
   pnpm dev
   ```

## 🔧 Development

### Backend Development

- **Port:** 5000 (default)
- **Hot reload:** Enabled with nodemon
- **TypeScript:** Full type checking
- **ESLint:** Code linting

### Frontend Development

- **Port:** 5173 (default)
- **Vite:** Fast development server
- **React:** Latest version with hooks
- **Tailwind CSS:** Utility-first styling

### Available Scripts

**Backend:**

```bash
pnpm --filter @repo/auth-service dev          # Start development server
pnpm --filter @repo/auth-service build        # Build for production
pnpm --filter @repo/auth-service start        # Start production server
pnpm --filter @repo/auth-service lint         # Run ESLint
pnpm --filter @repo/auth-service check-types  # TypeScript type checking
```

**Frontend:**

```bash
pnpm --filter @repo/auth-service-frontend dev     # Start development server
pnpm --filter @repo/auth-service-frontend build   # Build for production
pnpm --filter @repo/auth-service-frontend preview # Preview production build
pnpm --filter @repo/auth-service-frontend lint    # Run ESLint
```

## 🔐 Authentication Features

### Backend API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `GET /api/auth/verify-email` - Email verification

### Security Features

- **JWT Tokens:** Access and refresh tokens
- **Password Hashing:** bcrypt with 12 salt rounds
- **CORS Protection:** Configurable origins
- **Helmet:** Security headers
- **Rate Limiting:** API request throttling
- **Input Validation:** Zod schema validation
- **Email Verification:** Ethereal Email integration

## 🗄️ Database

### MongoDB Models

- **User:** Authentication and profile data
- **Session:** User session management
- **EmailVerification:** Email verification tokens

### Database Connection

The service uses Mongoose ODM with automatic connection management and error handling.

## 📧 Email Integration

### Email Configuration

- **Development:** Uses Ethereal Email for email testing
- **Production:** Configurable SMTP settings
- **Templates:** Pre-built email templates

### Email Features

- Welcome emails
- Password reset emails
- Email verification
- Account notifications

## 🔒 Security Configuration

### Environment Variables

```bash
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/auth-service

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Email
ETHEREAL_USER=your-ethereal-username
ETHEREAL_PASS=your-ethereal-password
```

## 🧪 Testing

### Backend Testing

```bash
# Run tests
pnpm --filter @repo/auth-service test

# Run tests with coverage
pnpm --filter @repo/auth-service test:coverage
```

### Frontend Testing

```bash
# Run tests
pnpm --filter @repo/auth-service-frontend test

# Run tests with UI
pnpm --filter @repo/auth-service-frontend test:ui
```

## 🚀 Deployment

### Backend Deployment

1. Build the application:

   ```bash
   pnpm --filter @repo/auth-service build
   ```

2. Start the production server:
   ```bash
   pnpm --filter @repo/auth-service start
   ```

### Frontend Deployment

1. Build the application:

   ```bash
   pnpm --filter @repo/auth-service-frontend build
   ```

2. Serve the built files from a web server.

## 🔧 Troubleshooting

### Common Issues

**MongoDB Connection:**

- Ensure MongoDB is running
- Check connection string in `.env`
- Verify network connectivity

**CORS Errors:**

- Check `ALLOWED_ORIGINS` in `.env`
- Ensure frontend URL is included

**JWT Issues:**

- Verify `JWT_SECRET` is set
- Check token expiration settings

### Debug Mode

```bash
# Enable debug logging
NODE_ENV=development DEBUG=* pnpm --filter @repo/auth-service dev
```

## 📚 API Documentation

### Authentication Flow

1. **Register:** `POST /api/auth/register`
2. **Login:** `POST /api/auth/login`
3. **Access Protected Routes:** Include `Authorization: Bearer <token>`
4. **Refresh Token:** `POST /api/auth/refresh`
5. **Logout:** `POST /api/auth/logout`

### Request/Response Examples

**Registration:**

```json
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Login:**

```json
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

## 🤝 Contributing

1. Follow the monorepo structure
2. Use shared utilities from `@repo/shared-utils`
3. Follow TypeScript and ESLint configurations
4. Test your changes thoroughly

## 📄 License

This project is part of the turborepo monorepo and follows the same licensing terms.
