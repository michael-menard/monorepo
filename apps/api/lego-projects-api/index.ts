import 'dotenv/config';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables!');
}
if (!process.env.AUTH_API) {
  throw new Error('AUTH_API is not set in environment variables!');
}

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { csrfProtection, issueCsrfToken } from './src/middleware/csrf';
import profileRouter from './src/routes/index';
import {
  securityHeaders,
  sanitizeRequest,
  securityLogger,
  createRateLimiters,
} from './src/middleware/security';
import { connectRedis } from './src/utils/redis';

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
app.use(pinoHttp({ logger }));

// Security middleware (order matters!)
app.use(securityHeaders);
app.use(securityLogger);
app.use(sanitizeRequest);

// Rate limiting
const rateLimiters = createRateLimiters();
app.use(rateLimiters.general); // Apply general rate limiting to all routes

// Body parsing
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// CORS configuration
const ORIGIN = process.env.APP_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173';
const devOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
const origins =
  process.env.NODE_ENV === 'production' ? [ORIGIN] : Array.from(new Set([ORIGIN, ...devOrigins]));

app.use(
  cors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  }),
);
// Enable pre-flight for all routes
app.options('*', cors());

// CSRF: issue token and enforce header on state-changing requests (when using cookies)
app.get('/api/csrf', issueCsrfToken);
app.use(csrfProtection);

// Apply specific rate limiting to upload routes
app.use('/api/users/:id/avatar', rateLimiters.upload);
app.use('/api/users', rateLimiters.auth); // Apply auth rate limiting to user routes

// Mount router at root level since routes already have /api prefix
app.use('/', profileRouter);

app.get('/', (req, res) => {
  res.send('Lego Projects API is running');
});

// Not Found handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Not Found - ${req.originalUrl}`,
  });
});

// Central error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err?.statusCode || 500;
  if (process.env.NODE_ENV === 'development' && err?.stack) {
    console.error(err.stack);
  }
  res.status(statusCode).json({
    success: false,
    statusCode,
    message: err?.message || 'Internal Server Error',
  });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;

  // Initialize Redis connection
  connectRedis()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log('Redis cache initialized');
      });
    })
    .catch((error) => {
      console.error('Failed to connect to Redis:', error);
      // Still start the server even if Redis fails
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} (without Redis cache)`);
      });
    });
}

export default app;
