import 'dotenv/config';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables!');
}
if (!process.env.AUTH_API) {
  throw new Error('AUTH_API is not set in environment variables!');
}

import express from 'express';
import { profileRouter } from './src/routes';

const app = express();

app.use(express.json());

// Mount router
app.use('/api/users', profileRouter);

app.get('/', (req, res) => {
  res.send('Lego Projects API is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 