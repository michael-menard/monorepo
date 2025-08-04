import express, { Request, Response, Router } from 'express';
import os from 'os';

const router: Router = express.Router();

// System info endpoint
router.get('/system', (req: Request, res: Response) => {
  res.json({
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
    },
    uptime: os.uptime(),
    nodeVersion: process.version,
    processId: process.pid,
  });
});

// Environment variables (safe ones only)
router.get('/env', (req: Request, res: Response) => {
  res.json({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || '5000',
    // Only show that these exist, not the actual values
    hasMongoDB: !!process.env.MONGO_URI,
    hasJwtSecret: !!process.env.JWT_SECRET,
    hasFrontendUrl: !!process.env.FRONTEND_URL,
  });
});

// Test database connection
router.get('/db-test', async (req: Request, res: Response) => {
  try {
    // This is just a placeholder - you would import your Mongoose models here
    // and try to perform a simple query
    res.json({
      status: 'Database connection test not implemented yet',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Echo request details back to client
router.all('/echo', (req: Request, res: Response) => {
  res.json({
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
    body: req.body,
    cookies: req.cookies,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });
});

export default router;
