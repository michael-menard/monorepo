// Load centralized environment configuration first
const path = require('path');
const envLoaderPath = path.resolve(__dirname, '../../../shared/config/env-loader.js');
require(envLoaderPath);

import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import pino from 'pino'
import pinoHttp from 'pino-http'
import { v4 as uuidv4 } from 'uuid'
import rateLimit from 'express-rate-limit'
import { connectDB } from './db/connectDB'
import { notFound, errorHandler } from './middleware/errorMiddleware'
import { csrf } from './middleware/csrf'

const app = express()
const PORT = process.env.PORT

// Middleware
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

// Enable CORS for all origins during development
const ORIGIN = process.env.APP_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173'
const devOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
]
const origins =
  process.env.NODE_ENV === 'production' ? [ORIGIN] : Array.from(new Set([ORIGIN, ...devOrigins]))

app.use(
  cors({
    // For local development, allow all origins
    origin: process.env.NODE_ENV === 'production' ? origins : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'Cache-Control',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
  }),
)

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
)

// Enhanced request logger middleware with sensitive data redaction
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'req.body.refreshToken',
      'res.headers["set-cookie"]',
      'user.password',
      'user.resetPasswordToken',
      'user.verificationToken',
    ],
    remove: true,
  },
  serializers: {
    req: req => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-correlation-id': req.headers['x-correlation-id'],
      },
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort,
    }),
    res: res => ({
      statusCode: res.statusCode,
      headers: {
        'content-type': res.getHeader('content-type'),
        'content-length': res.getHeader('content-length'),
      },
    }),
  },
})

const httpLogger = pinoHttp({
  logger,
  genReqId: req => req.headers['x-request-id'] || uuidv4(),
  customProps: (req: any, res) => {
    return {
      userId: req.user?.id || req.userId,
      correlationId: req.headers['x-correlation-id'],
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
    }
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed`
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} errored - ${err.message}`
  },
})

app.use(httpLogger)

// Enable pre-flight requests for all routes
app.options('*', cors())

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/auth', authLimiter)

// CSRF protection middleware (after cookie-parser, before routes)
app.use('/api/auth', csrf)

// Routes
import routes from './routes/auth.routes'
app.use('/api/auth', routes)

// Apply error handling middleware after routes
app.use(notFound)
app.use(errorHandler)

// Export shared logger for use in other modules
export { logger }

// Start server
const startServer = async () => {
  logger.info('Starting server...')
  logger.info({ environment: process.env.NODE_ENV || 'development' }, 'Server environment')
  logger.info({ port: PORT }, 'Server port configuration')

  try {
    if (process.env.NODE_ENV === 'production') {
      await connectDB()
    } else {
      // Try to connect to MongoDB (but don't block server startup in dev/test)
      connectDB().catch(err => {
        logger.warn('MongoDB connection failed, but continuing server startup')
      })
    }

    // Start the Express server
    app.listen(PORT, () => {
      app.locals.serverStarted = true // Mark server as started
      logger.info({ port: PORT }, 'Server started successfully')
      logger.info({ apiUrl: `http://localhost:${PORT}/api` }, 'API available')
    })
  } catch (error) {
    logger.error({ error }, 'Failed to start server')
    if (error instanceof Error) {
      logger.error({ stack: error.stack }, 'Error details')
    }
    process.exit(1)
  }
}

// Handle server startup errors
process.on('uncaughtException', error => {
  logger.error({ error }, 'Uncaught Exception')
  // Only exit on startup errors, not runtime errors
  if (!app.locals.serverStarted) {
    process.exit(1)
  }
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error(
    {
      error: reason,
      promise: promise.toString(),
    },
    'Unhandled Rejection',
  )

  // Don't exit the process for unhandled rejections during runtime
  // This prevents the server from crashing on async errors
  if (!app.locals.serverStarted) {
    process.exit(1)
  }
})

// Start the server
startServer()
export { app }
