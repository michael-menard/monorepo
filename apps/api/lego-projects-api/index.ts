// Load centralized environment configuration first
require('/app/shared/config/env-loader.js')

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables!')
}
if (!process.env.AUTH_API) {
  throw new Error('AUTH_API is not set in environment variables!')
}

import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { logger, pinoHttpMiddleware } from './src/utils/logger'
import { csrfProtection, issueCsrfToken } from './src/middleware/csrf'
import profileRouter from './src/routes/index'
import {
  securityHeaders,
  sanitizeRequest,
  securityLogger,
  createRateLimiters,
} from './src/middleware/security'
import { connectRedis } from './src/utils/redis'

const app = express()
app.use(pinoHttpMiddleware)

// Security middleware (order matters!)
app.use(securityHeaders)
app.use(securityLogger)
app.use(sanitizeRequest)

// Rate limiting
const rateLimiters = createRateLimiters()
app.use(rateLimiters.general) // Apply general rate limiting to all routes

// Body parsing
app.use(express.json({ limit: '10mb' })) // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'))

// CORS configuration
const ORIGIN = process.env.APP_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173'
const devOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3002',
  'http://localhost:3003',
  'http://127.0.0.1:3003',
]
const origins =
  process.env.NODE_ENV === 'production' ? [ORIGIN] : Array.from(new Set([ORIGIN, ...devOrigins]))

app.use(
  cors({
    // For local development, allow all origins
    origin:
      process.env.NODE_ENV === 'production'
        ? (origin, callback) => {
            logger.info({ origin, allowedOrigins: origins }, '🌐 CORS request')

            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true)

            if (origins.includes(origin)) {
              logger.info({ origin }, '✅ Origin allowed')
              return callback(null, true)
            } else {
              logger.warn({ origin }, '❌ Origin blocked')
              return callback(new Error('Not allowed by CORS'), false)
            }
          }
        : true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'Cache-Control',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  }),
)
// Enable pre-flight for all routes
app.options('*', cors())

// Explicit OPTIONS handler for upload endpoint
app.options('/api/mocs/upload-parts-list', (req, res) => {
  logger.info('🔄 OPTIONS request for upload-parts-list')
  res.header('Access-Control-Allow-Origin', req.headers.origin)
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-CSRF-Token',
  )
  res.header('Access-Control-Allow-Credentials', 'true')
  res.sendStatus(200)
})

// CSRF: issue token and enforce header on state-changing requests (when using cookies)
app.get('/api/csrf', issueCsrfToken)
app.use(csrfProtection)

// Mount router at root level since routes already have /api prefix
app.use('/', profileRouter)

app.get('/', (req, res) => {
  res.send('Lego Projects API is running')
})

// Health check endpoint for ECS/ALB
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'lego-projects-api' })
})

// Not Found handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Not Found - ${req.originalUrl}`,
  })
})

// Central error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err?.statusCode || 500
  if (process.env.NODE_ENV === 'development' && err?.stack) {
    logger.error({ err, stack: err.stack }, 'Error occurred')
  }
  res.status(statusCode).json({
    success: false,
    statusCode,
    message: err?.message || 'Internal Server Error',
  })
})

if (require.main === module) {
  const PORT = process.env.PORT

  // Initialize Redis connection
  connectRedis()
    .then(() => {
      app.listen(PORT, () => {
        logger.info({ port: PORT }, 'Server running')
        logger.info('Redis cache initialized')
      })
    })
    .catch(error => {
      logger.error({ error }, 'Failed to connect to Redis')
      // Still start the server even if Redis fails
      app.listen(PORT, () => {
        logger.info({ port: PORT }, 'Server running (without Redis cache)')
      })
    })
}

export default app
