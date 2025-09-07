import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import { connectDB } from './db/connectDB';
import { notFound, errorHandler } from './middleware/errorMiddleware';
import { csrf } from './middleware/csrf';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Enable CORS for all origins during development
const ORIGIN = process.env.APP_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173';
const devOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];
const origins =
  process.env.NODE_ENV === 'production' ? [ORIGIN] : Array.from(new Set([ORIGIN, ...devOrigins]));

app.use(
  cors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
  }),
);

// Add security headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false,
    hsts: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
  }),
);

// Request logger middleware
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
app.use(pinoHttp({ logger }));

// Enable pre-flight requests for all routes
app.options('*', cors());

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// CSRF protection middleware (after cookie-parser, before routes)
app.use('/api/auth', csrf);

// Routes
import routes from './routes/auth.routes';
app.use('/api/auth', routes);

// Apply error handling middleware after routes
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  console.log('Starting server...');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Port:', PORT);

  try {
    if (process.env.NODE_ENV === 'production') {
      await connectDB();
    } else {
      // Try to connect to MongoDB (but don't block server startup in dev/test)
      connectDB().catch((err) => {
        console.warn('MongoDB connection failed, but continuing server startup');
      });
    }

    // Start the Express server
    app.listen(PORT, () => {
      console.log(`Server started successfully on port ${PORT}`);
      console.log(`API available at: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    console.error('Error details:', error instanceof Error ? error.stack : String(error));
    process.exit(1);
  }
};

// Handle server startup errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Start the server
startServer();
export { app };
