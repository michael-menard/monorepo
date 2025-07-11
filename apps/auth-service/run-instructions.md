# Running the Express Application

## Port Already in Use Issue

If you're experiencing the `EADDRINUSE` error, it means port 5000 is already in use by another process. Follow these steps to resolve the issue:

### Option 1: Kill the Process Using the Port

Run the included script to kill any process using port 5000:

```bash
# Make the script executable
chmod +x killport.sh

# Kill the process using port 5000
./killport.sh 5000

# Or use the npm script
npm run killport 5000
```

### Option 2: Use a Different Port

The application has been configured to use port 5001 by default in the .env file. If port 5001 is also in use, you can edit the .env file to use a different port.

## Starting the Application

After resolving any port issues, start the application with:

```bash
# Development mode with auto-reload
npm run dev

# Or to build and run in production mode
npm run build
npm start

# Or to run the simplified version for troubleshooting
npm run simple
```

## Reset Everything and Start Fresh

If you're still having issues, you can reset everything and start fresh:

```bash
# Kill any processes using ports 5000 and 5001, then start the app
npm run reset
```

## Verifying the Application is Working

Once the application is running, you should see a message in the console indicating the server has started. You can verify it's working by accessing:

- http://localhost:5001/api/hello - Should return a "Hello, world!" message
- http://localhost:5001/ - Should return basic server info
