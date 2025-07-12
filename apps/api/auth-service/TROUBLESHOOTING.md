# Troubleshooting Guide

## Connection Issues

### ERR_CONNECTION_REFUSED

If you're seeing "localhost refused to connect" or "ERR_CONNECTION_REFUSED" errors:

1. **Check if the server is running**
   ```bash
   ps aux | grep node
   ```

2. **Try the minimal debug server**
   ```bash
   npm run debug-server
   ```
   Then visit http://localhost:5001

3. **Check for port conflicts**
   ```bash
   npm run killport 5000
   npm run killport 5001
   ```

4. **Verify your environment**
   ```bash
   npm run diagnose
   ```

## TypeScript Compilation Errors

### Duplicate declarations or exports

If you see errors like "The symbol has already been declared" or "Multiple exports with the same name":

1. **Check for duplicate code**
   This often happens when copying/pasting code or merging files incorrectly.

2. **Run the TypeScript type checker**
   ```bash
   npm run check
   ```

3. **Look for duplicate import statements**
   Especially in index files that might be importing the same module twice.

## MongoDB Connection Issues

1. **Verify MongoDB is running**
   ```bash
   brew services list  # on macOS with Homebrew
   ```

2. **Try running without database**
   Comment out the MongoDB connection in index.ts temporarily:
   ```typescript
   // await connectDB();
   ```

3. **Check your connection string**
   Make sure your MONGO_URI in .env is correct.

## Quick Fixes

1. **Start completely fresh**
   ```bash
   npm run clean
   npm install
   npm run dev
   ```

2. **Try the most basic server**
   ```bash
   npm run basic-server
   ```

3. **Debug with minimal dependencies**
   ```bash
   npm run debug-server
   ```

4. **Check for port conflicts**
   ```bash
   lsof -i :5000
   lsof -i :5001
   ```

5. **Run server with extra debugging**
   ```bash
   NODE_DEBUG=* npm run dev
   ```
