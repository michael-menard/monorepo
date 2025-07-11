// Startup check script to diagnose issues
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('======= Environment Diagnostic Check =======');

// Check Node.js version
console.log(`Node.js version: ${process.version}`);
const nodeMajorVersion = parseInt(process.version.match(/^v(\d+)/)[1]);
if (nodeMajorVersion < 16) {
  console.warn('⚠️ WARNING: Node.js version is below recommended (16+)');
}

// Check for key files
const requiredFiles = [
  '.env',
  'package.json',
  'tsconfig.json',
  'backend/index.ts',
  'backend/controllers/auth.controller.ts',
  'backend/routes/index.ts'
];

console.log('\nChecking required files:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.resolve(process.cwd(), file));
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// Check PORT availability
const PORT = process.env.PORT || 5000;
console.log(`\nPORT: ${PORT}`);
console.log('Note: Cannot check if port is in use from this script.\nUse "npm run killport 5000" if needed.');

// Check TypeScript configuration
try {
  const tsConfig = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'tsconfig.json'), 'utf8'));
  console.log('\nTypeScript configuration:');
  console.log(`- Module: ${tsConfig.compilerOptions.module}`);
  console.log(`- Target: ${tsConfig.compilerOptions.target}`);
  console.log(`- Strict mode: ${tsConfig.compilerOptions.strict}`);
} catch (error) {
  console.error('❌ Error reading tsconfig.json:', error.message);
}

// Environment variables
console.log('\nEnvironment variables:');
const dotEnvPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(dotEnvPath)) {
  const envContent = fs.readFileSync(dotEnvPath, 'utf8');
  const envVars = envContent.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => {
      const [key] = line.split('=');
      return key.trim();
    });

  console.log('Found variables:', envVars.join(', '));
} else {
  console.warn('⚠️ .env file not found');
}

// System info
console.log('\nSystem information:');
console.log(`- Platform: ${os.platform()} ${os.release()}`);
console.log(`- Architecture: ${os.arch()}`);
console.log(`- Memory: ${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`);
console.log(`- CPUs: ${os.cpus().length}`);

console.log('\n======= Diagnostic Check Complete =======');
console.log('To start the server, run: npm run dev');
console.log('For simplified server: npm run simple');
console.log('For minimal debug server: npm run debug-server');
