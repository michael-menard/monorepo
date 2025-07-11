// Simple troubleshooting server
const express = require('express');

const app = express();
const PORT = 5001;

app.get('/', (req, res) => {
  res.send('Troubleshooting server is running!');
});

app.listen(PORT, () => {
  console.log(`Troubleshooting server running on http://localhost:${PORT}`);
});
