// MongoDB initialization script
// This script runs when MongoDB container starts and seeds the database if empty

print('🚀 Starting MongoDB initialization...');

// Connect to the database
db = db.getSiblingDB('lego_auth');

print('📊 Checking if users collection exists and has data...');

// Check if users collection exists and has documents
const userCount = db.users.countDocuments();

if (userCount > 0) {
  print(`✅ Database already has ${userCount} users. Skipping seeding.`);
} else {
  print('🌱 Database is empty. Seeding will be handled by the application seeder script.');
  print('💡 The seeder script will run automatically when the auth service starts.');
}

print('✅ MongoDB initialization completed!'); 