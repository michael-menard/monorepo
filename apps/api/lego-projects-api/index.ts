import 'dotenv/config';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables!');
}
if (!process.env.AUTH_API) {
  throw new Error('AUTH_API is not set in environment variables!');
}

import express from 'express';
import cookieParser from 'cookie-parser';
import profileRouter from './src/routes/index';
import {
  securityHeaders,
  sanitizeRequest,
  securityLogger,
  createRateLimiters,
} from './src/middleware/security';
import { connectRedis } from './src/utils/redis';

const app = express();

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

// Apply specific rate limiting to upload routes
app.use('/api/users/:id/avatar', rateLimiters.upload);
app.use('/api/users', rateLimiters.auth); // Apply auth rate limiting to user routes

// Mount router at root level since routes already have /api prefix
app.use('/', profileRouter);

app.get('/', (req, res) => {
  res.send('Lego Projects API is running');
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
