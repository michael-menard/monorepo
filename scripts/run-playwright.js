#!/usr/bin/env node
/* eslint-env node */

/**
 * Playwright Test Runner Script
 *
 * Usage:
 *   node scripts/run-playwright.js [options]
 *
 * Options:
 *   --app <app-name>           Run tests for specific app (default: lego-moc-instructions-app)
 *   --grep <pattern>           Filter tests by pattern
 *   --headed                   Run tests in headed mode
 *   --debug                    Run tests in debug mode
 *   --ui                       Run tests with Playwright UI
 *   --browser <browser>        Run tests in specific browser (chromium, firefox, webkit)
 *   --workers <number>         Number of workers (default: 1)
 *   --timeout <ms>             Test timeout in milliseconds
 *   --retries <number>         Number of retries for failed tests
 *   --project <project>        Run specific project configuration
 *   --list                     List all available tests
 *   --help                     Show this help message
 *
 * Examples:
 *   node scripts/run-playwright.js --grep "Auth Flow"
 *   node scripts/run-playwright.js --headed --browser chromium
 *   node scripts/run-playwright.js --app lego-moc-instructions-app --grep "Login"
 *   node scripts/run-playwright.js --ui
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const http = require('http');
const https = require('https');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  app: 'lego-moc-instructions-app',
  grep: null,
  headed: false,
  debug: false,
  ui: false,
  browser: null,
  workers: 1,
  timeout: null,
  retries: null,
  project: null,
  list: false,
  help: false,
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const nextArg = args[i + 1];

  switch (arg) {
    case '--app':
      options.app = nextArg;
      i++;
      break;
    case '--grep':
      options.grep = nextArg;
      i++;
      break;
    case '--headed':
      options.headed = true;
      break;
    case '--debug':
      options.debug = true;
      break;
    case '--ui':
      options.ui = true;
      break;
    case '--browser':
      options.browser = nextArg;
      i++;
      break;
    case '--workers':
      options.workers = parseInt(nextArg);
      i++;
      break;
    case '--timeout':
      options.timeout = parseInt(nextArg);
      i++;
      break;
    case '--retries':
      options.retries = parseInt(nextArg);
      i++;
      break;
    case '--project':
      options.project = nextArg;
      i++;
      break;
    case '--list':
      options.list = true;
      break;
    case '--help':
      options.help = true;
      break;
    default:
      console.warn(`Unknown option: ${arg}`);
  }
}

if (options.help) {
  console.log(`
Playwright Test Runner Script

Usage:
  node scripts/run-playwright.js [options]

Options:
  --app <app-name>           Run tests for specific app (default: lego-moc-instructions-app)
  --grep <pattern>           Filter tests by pattern
  --headed                   Run tests in headed mode
  --debug                    Run tests in debug mode
  --ui                       Run tests with Playwright UI
  --browser <browser>        Run tests in specific browser (chromium, firefox, webkit)
  --workers <number>         Number of workers (default: 1)
  --timeout <ms>             Test timeout in milliseconds
  --retries <number>         Number of retries for failed tests
  --project <project>        Run specific project configuration
  --list                     List all available tests
  --help                     Show this help message

Examples:
  node scripts/run-playwright.js --grep "Auth Flow"
  node scripts/run-playwright.js --headed --browser chromium
  node scripts/run-playwright.js --app lego-moc-instructions-app --grep "Login"
  node scripts/run-playwright.js --ui
`);
  process.exit(0);
}

// Build Playwright command
function buildPlaywrightCommand() {
  const appPath = join(__dirname, '..', 'apps', 'web', options.app);
  const baseCommand = ['pnpm', 'playwright', 'test'];

  // Add options
  if (options.list) {
    baseCommand.push('--list');
  } else {
    if (options.grep) {
      baseCommand.push('--grep', options.grep);
    }
    if (options.headed) {
      baseCommand.push('--headed');
    }
    if (options.debug) {
      baseCommand.push('--debug');
    }
    if (options.ui) {
      baseCommand.push('--ui');
    }
    if (options.browser) {
      baseCommand.push('--project', options.browser);
    }
    if (options.workers) {
      baseCommand.push('--workers', options.workers.toString());
    }
    if (options.timeout) {
      baseCommand.push('--timeout', options.timeout.toString());
    }
    if (options.retries) {
      baseCommand.push('--retries', options.retries.toString());
    }
    if (options.project) {
      baseCommand.push('--project', options.project);
    }
  }

  return { command: baseCommand[0], args: baseCommand.slice(1), cwd: appPath };
}

// Run the command
function runPlaywright() {
  const { command, args, cwd } = buildPlaywrightCommand();

  console.log(`Running Playwright tests for app: ${options.app}`);
  console.log(`Command: ${command} ${args.join(' ')}`);
  console.log(`Working directory: ${cwd}`);
  console.log('');

  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
  });

  child.on('close', (code) => {
    console.log(`\nPlaywright tests completed with exit code: ${code}`);
    process.exit(code);
  });

  child.on('error', (error) => {
    console.error('Failed to start Playwright tests:', error);
    process.exit(1);
  });
}

// Health check function
function checkHealth(url, timeout = 5000) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https:') ? https : http;
    const req = protocol.get(url, { timeout }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Check if services are running
async function checkServices() {
  console.log('Checking if required services are running...\n');

  // Check frontend (try both common ports)
  const frontendUrls = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173'
  ];

  let frontendRunning = false;
  let frontendUrl = null;

  for (const url of frontendUrls) {
    const isRunning = await checkHealth(url);
    if (isRunning) {
      frontendRunning = true;
      frontendUrl = url;
      console.log(`✅ Frontend is running at: ${url}`);
      break;
    }
  }

  if (!frontendRunning) {
    console.log('❌ Frontend is not running');
    console.log('Please start the frontend with: cd apps/web/lego-moc-instructions-app && pnpm dev');
    return false;
  }

  // Check backend
  const backendUrl = 'http://localhost:9000/api/auth/health';
  const backendRunning = await checkHealth(backendUrl);

  if (backendRunning) {
    console.log(`✅ Backend is running at: http://localhost:9000`);
  } else {
    console.log('❌ Backend is not running');
    console.log('Please start the backend with: cd apps/api/auth-service && pnpm dev');
    console.log('Or use the full setup: pnpm auth:dev (starts MongoDB, backend, and frontend)');
    return false;
  }

  // Check MongoDB (optional - only if backend is running but has DB connection issues)
  const mongodbUrl = 'http://localhost:27017';
  const mongodbRunning = await checkHealth(mongodbUrl, 2000); // Shorter timeout for MongoDB

  if (mongodbRunning) {
    console.log(`✅ MongoDB is running at: http://localhost:27017`);
  } else {
    console.log('⚠️  MongoDB is not running (this may cause backend issues)');
    console.log('Please start MongoDB with: pnpm auth:db:up');
    console.log('Or use the full setup: pnpm auth:dev (starts MongoDB, backend, and frontend)');
    // Don't fail the check for MongoDB since tests might be mocked
  }

  console.log('\n✅ All services are running! Starting tests...\n');
  return true;
}

// Validate options
function validateOptions() {
  const validBrowsers = ['chromium', 'firefox', 'webkit'];
  if (options.browser && !validBrowsers.includes(options.browser)) {
    console.error(
      `Invalid browser: ${options.browser}. Valid options: ${validBrowsers.join(', ')}`,
    );
    process.exit(1);
  }

  if (options.workers < 1) {
    console.error('Workers must be at least 1');
    process.exit(1);
  }

  if (options.timeout && options.timeout < 1000) {
    console.error('Timeout must be at least 1000ms');
    process.exit(1);
  }

  if (options.retries && options.retries < 0) {
    console.error('Retries must be 0 or greater');
    process.exit(1);
  }
}

// Main execution
async function main() {
  try {
    validateOptions();
    
    // Check if services are running before starting tests
    const servicesReady = await checkServices();
    if (!servicesReady) {
      console.log('\n❌ Services are not ready. Please start the required services and try again.');
      process.exit(1);
    }
    
    runPlaywright();
  } catch (error) {
    console.error('Error running Playwright tests:', error);
    process.exit(1);
  }
}

main(); 