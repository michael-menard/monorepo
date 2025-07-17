import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import dotenv from "dotenv";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { connectDB } from "./db/connectDB";
import { notFound, errorHandler } from './middleware/errorMiddleware';

dotenv.config();

const app = express()
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json())
app.use(cookieParser())

// Enable CORS for all origins during development
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
}))

// Add security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:5173'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      workerSrc: ["'self'", 'blob:'],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'no-referrer-when-downgrade' },
}));

// Request logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Enable pre-flight requests for all routes
app.options('*', cors())

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
    // Try to connect to MongoDB (but don't block server startup)
    connectDB().catch(err => {
      console.warn('MongoDB connection failed, but continuing server startup');
    });

    // Start the Express server
    app.listen(PORT, () => {
      console.log(`Server started successfully on port ${PORT}`);
      console.log(`API available at: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    // Don't exit immediately, try to provide more diagnostic info
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