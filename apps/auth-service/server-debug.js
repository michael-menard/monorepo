// Minimal Express server for debugging
const express = require('express');
const app = express();
const PORT = 5001;

// Basic middleware
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Basic routes for testing
app.get('/', (req, res) => {
  res.json({ message: 'Debug server is running' });
});

app.get('/ping', (req, res) => {
  res.json({ status: 'pong', time: new Date().toISOString() });
});

app.get('/error', (req, res, next) => {
  try {
    throw new Error('Test error');
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Debug server running on http://localhost:${PORT}`);
  console.log('Try these endpoints:');
  console.log('  - GET /          - Basic response');
  console.log('  - GET /ping      - Quick connectivity test');
  console.log('  - GET /error     - Test error handling');
});
