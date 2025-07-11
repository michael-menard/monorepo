import express from 'express';

const router = express.Router();

// Test routes
router.get('/hello', (req, res) => {
  res.json({ message: 'Hello, world!' });
});

router.get('/info', (req, res) => {
  res.json({
    server: 'Express',
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

export default router;
