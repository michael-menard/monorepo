# Auth Service Project Guide

## Project Structure

This project is a TypeScript-based authentication service with Express and MongoDB.

```
/backend
  /controllers   - Business logic for handling requests
  /db           - Database connection and models
  /middleware   - Express middleware (error handling, auth, etc.)
  /models       - Mongoose models
  /routes       - API route definitions
  /types        - TypeScript type definitions
  index.ts      - Main application entry point
/server-debug.js - Simple debugging server
/troubleshoot.js - Basic connection tester
/startup-check.js - Environment diagnostic tool
```

## Running the Project

### Development Mode

```bash
# Start the development server with auto-reload
pnpm run dev
```

### Production Mode

```bash
# Build the project
pnpm run build

# Start the production server
pnpm start
```

### Other Commands

```bash
# Run TypeScript type checking
pnpm run check

# Run the simple server for quick testing
pnpm run simple

# Kill any process using specific ports
pnpm run killport 5000

# Run the environment diagnostic tool
pnpm run diagnose
```

## Troubleshooting

If you encounter any issues, refer to the `TROUBLESHOOTING.md` file for common problems and solutions.

### Common Issues

- **Connection Refused**: Make sure the server is running and the port is available
- **TypeScript Errors**: Run `pnpm run check` to identify type issues
- **MongoDB Connection**: Ensure MongoDB is running locally or update your connection string

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login and receive a JWT token
- `POST /api/auth/logout` - Logout and clear cookie

### Health Checks

- `GET /api/health` - Check if the API is running

## Environment Variables

The following environment variables can be set in `.env`:

- `PORT` - The port the server runs on (default: 5001)
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for signing JWTs
- `FRONTEND_URL` - URL of the frontend for CORS
- `NODE_ENV` - Environment (development, production)
