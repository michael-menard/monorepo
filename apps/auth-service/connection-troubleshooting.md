# Connection Troubleshooting Guide

## ERR_CONNECTION_REFUSED Issue

If you're seeing "ERR_CONNECTION_REFUSED" when trying to access your Express server, follow these steps:

### Step 1: Check if the server is running

Open your terminal and run:

```bash
ps aux | grep node
```

This will show all running Node.js processes. If you don't see your server process, it's not running.

### Step 2: Run the troubleshooting server

```bash
npm run troubleshoot
```

Then try to access http://localhost:5001 in your browser. If this works, the issue is with your main server code, not with your network or ports.

### Step 3: Run the basic server

```bash
npm run basic-server
```

Then try to access http://localhost:5000 in your browser. If this works, the issue is with your TypeScript server code.

### Step 4: Check for TypeScript errors

Run:

```bash
npm run check
```

Fix any TypeScript errors that appear.

### Step 5: Check MongoDB connection

Make sure MongoDB is running:

```bash
mongod --version
```

If MongoDB is not installed or running, follow these steps:

#### Install MongoDB (macOS with Homebrew)
```bash
brew tap mongodb/brew
brew install mongodb-community
```

#### Start MongoDB
```bash
brew services start mongodb-community
```

### Step 6: Debug server startup

Modify your server to log more detailed information during startup:

```typescript
// Add this to index.ts
console.log('Starting server...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT || 5000);
console.log('MongoDB URI:', process.env.MONGO_URI ? 'Set' : 'Not set');
```

## Quick Fixes

1. **Kill all Node processes and start again**:
   ```bash
   killall node
   npm run dev
   ```

2. **Try a different port**:
   Change PORT in .env to 3001 or another port

3. **Disable MongoDB temporarily**:
   Comment out the connectDB() call in index.ts to see if MongoDB is causing the issue

4. **Check for syntax errors**:
   Look for missing semicolons, brackets, or other syntax issues

5. **Try running with Node directly**:
   ```bash
   tsx backend/index.ts
   ```
