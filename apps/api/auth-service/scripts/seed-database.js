#!/usr/bin/env node

/**
 * Database Seeder Script
 * 
 * This script seeds the MongoDB database with 50 users if the database is empty.
 * It can be run independently or as part of the application startup.
 * 
 * Usage:
 *   node scripts/seed-database.js
 *   npm run seed
 */

import { runSeeder } from '../db/seeder.js';

console.log('🌱 LEGO App Database Seeder');
console.log('============================\n');

// Run the seeder
runSeeder()
  .then(() => {
    console.log('\n✅ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }); 