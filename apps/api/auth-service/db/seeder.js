import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// User Schema (matching the existing User model)
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user',
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  verificationCode: String,
  verificationCodeExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: Date,
  profilePicture: String,
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters'],
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto',
    },
    notifications: {
      email: {
        type: Boolean,
        default: true,
      },
      push: {
        type: Boolean,
        default: true,
      },
    },
  },
});

const User = mongoose.model('User', userSchema);

// Sample data for generating users
const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra', 'Donald', 'Donna',
  'Steven', 'Carol', 'Paul', 'Ruth', 'Andrew', 'Sharon', 'Joshua', 'Michelle',
  'Kenneth', 'Laura', 'Kevin', 'Emily', 'Brian', 'Kimberly', 'George', 'Deborah',
  'Edward', 'Dorothy', 'Ronald', 'Lisa', 'Timothy', 'Nancy', 'Jason', 'Karen',
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
];

const domains = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  'protonmail.com', 'fastmail.com', 'zoho.com', 'mail.com', 'aol.com',
];

const legoThemes = [
  'City', 'Technic', 'Star Wars', 'Marvel', 'DC Comics', 'Harry Potter',
  'Architecture', 'Creator Expert', 'Ideas', 'Friends', 'Ninjago', 'Minecraft',
  'Disney', 'Jurassic World', 'Speed Champions', 'Hidden Side', 'Monkie Kid',
  'Classic', 'Duplo', 'Architecture', 'Botanical Collection', 'Art',
];

const bios = [
  'Passionate LEGO builder since childhood. Love creating custom MOCs and sharing builds with the community.',
  'AFOL (Adult Fan of LEGO) who enjoys building complex Technic models and architectural sets.',
  'LEGO enthusiast focused on Star Wars and Marvel collections. Always looking for rare minifigures.',
  'Creator of custom LEGO builds and MOCs. Specialize in architectural and city planning models.',
  'LEGO collector and builder. Love the creative process and the endless possibilities with LEGO bricks.',
  'AFOL who enjoys building with friends and family. Favorite themes: Technic and Creator Expert.',
  'LEGO fanatic with a passion for custom builds and MOCs. Always experimenting with new techniques.',
  'Dedicated LEGO builder and collector. Enjoy both official sets and custom creations.',
  'LEGO enthusiast who loves sharing builds and techniques with the community.',
  'Passionate about LEGO building and collecting. Focus on Star Wars and Technic sets.',
  'AFOL with a love for architectural LEGO sets and custom city layouts.',
  'LEGO builder and collector. Enjoy creating custom MOCs and participating in building challenges.',
  'Dedicated to the LEGO hobby. Love building complex models and sharing with the community.',
  'LEGO enthusiast who enjoys both building and collecting. Favorite themes: Ideas and Creator Expert.',
  'Passionate AFOL with a focus on custom builds and MOCs. Always learning new building techniques.',
];

// Generate a random user
function generateUser(index) {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@${domain}`;
  const bio = bios[Math.floor(Math.random() * bios.length)];
  
  // Generate a realistic password (will be hashed)
  const password = `Password${index}!`;
  
  // Random role distribution (mostly users, some moderators, few admins)
  const roleRand = Math.random();
  let role = 'user';
  if (roleRand > 0.95) role = 'admin';
  else if (roleRand > 0.85) role = 'moderator';
  
  // Random email verification status (most verified)
  const emailVerified = Math.random() > 0.2;
  
  // Random theme preference
  const themes = ['light', 'dark', 'auto'];
  const theme = themes[Math.floor(Math.random() * themes.length)];
  
  // Random notification preferences
  const emailNotifications = Math.random() > 0.1;
  const pushNotifications = Math.random() > 0.1;
  
  // Random creation date (within last 2 years)
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 730));
  
  // Random last login (within last 30 days for most users)
  const lastLogin = new Date();
  lastLogin.setDate(lastLogin.getDate() - Math.floor(Math.random() * 30));
  
  return {
    name: `${firstName} ${lastName}`,
    email,
    password,
    role,
    emailVerified,
    bio,
    preferences: {
      theme,
      notifications: {
        email: emailNotifications,
        push: pushNotifications,
      },
    },
    createdAt,
    lastLogin: emailVerified ? lastLogin : null,
  };
}

// Hash password
async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Main seeder function
async function seedUsers() {
  try {
    console.log('🔍 Checking if database is empty...');
    
    // Check if users collection exists and has documents
    const userCount = await User.countDocuments();
    
    if (userCount > 0) {
      console.log(`✅ Database already has ${userCount} users. Skipping seeding.`);
      return;
    }
    
    console.log('🌱 Database is empty. Starting to seed users...');
    
    // Generate 50 users
    const users = [];
    for (let i = 1; i <= 50; i++) {
      const userData = generateUser(i);
      users.push(userData);
    }
    
    console.log('🔐 Hashing passwords...');
    
    // Hash all passwords
    const hashedUsers = await Promise.all(
      users.map(async (user) => ({
        ...user,
        password: await hashPassword(user.password),
      })),
    );
    
    console.log('💾 Inserting users into database...');
    
    // Insert users into database
    const result = await User.insertMany(hashedUsers);
    
    console.log(`✅ Successfully seeded ${result.length} users!`);
    
    // Log some statistics
    const adminCount = result.filter(user => user.role === 'admin').length;
    const moderatorCount = result.filter(user => user.role === 'moderator').length;
    const userCount = result.filter(user => user.role === 'user').length;
    const verifiedCount = result.filter(user => user.emailVerified).length;
    
    console.log('\n📊 Seeding Statistics:');
    console.log(`   - Total users: ${result.length}`);
    console.log(`   - Admins: ${adminCount}`);
    console.log(`   - Moderators: ${moderatorCount}`);
    console.log(`   - Regular users: ${userCount}`);
    console.log(`   - Email verified: ${verifiedCount}`);
    console.log(`   - Email unverified: ${result.length - verifiedCount}`);
    
    // Show some sample users
    console.log('\n👥 Sample Users Created:');
    result.slice(0, 5).forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
    });
    
    console.log('\n🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Connect to MongoDB and run seeder
async function runSeeder() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lego_auth';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB successfully!');
    
    // Run the seeder
    await seedUsers();
    
    console.log('✅ Seeder completed successfully!');
    
  } catch (error) {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed.');
  }
}

// Run the seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeeder();
}

export { runSeeder, seedUsers }; 