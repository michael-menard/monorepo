#!/usr/bin/env node

/**
 * Auth Service Startup Script with Database Seeding
 * 
 * This script runs the database seeder and then starts the auth service.
 * It ensures the database is seeded before the service starts accepting requests.
 * 
 * Usage:
 *   node scripts/start-with-seed.js
 *   npm run start:with-seed
 */

import { spawn } from 'child_process';
import { runSeeder } from '../db/seeder.js';

console.log('🚀 LEGO App Auth Service - Starting with Database Seeding');
console.log('========================================================\n');

async function startService() {
  try {
    // First, run the database seeder
    console.log('🌱 Running database seeder...');
    await runSeeder();
    console.log('✅ Database seeding completed!\n');
    
    // Then start the auth service
    console.log('🚀 Starting auth service...');
    
    const service = spawn('node', ['index.js'], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' }
    });
    
    service.on('error', (error) => {
      console.error('❌ Failed to start auth service:', error);
      process.exit(1);
    });
    
    service.on('exit', (code) => {
      console.log(`\n🔚 Auth service exited with code ${code}`);
      process.exit(code);
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      service.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      service.kill('SIGTERM');
    });
    
  } catch (error) {
    console.error('❌ Failed to start service:', error);
    process.exit(1);
  }
}

// Start the service
startService(); 