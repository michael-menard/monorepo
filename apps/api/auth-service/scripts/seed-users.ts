#!/usr/bin/env tsx

/**
 * Seed Users Script for Auth Service
 *
 * Creates test users based on South Park characters for development and testing.
 *
 * Usage:
 *   pnpm seed:users
 *   pnpm seed:users --clear  # Clear existing users first
 *   pnpm seed:users --env=test  # Use test database
 */

import mongoose from 'mongoose'
import bcryptjs from 'bcryptjs'
import dotenv from 'dotenv'
import { User } from '../models/User'

// Load environment variables
dotenv.config()

// South Park characters data
const SOUTH_PARK_USERS = [
  {
    name: 'Stan Marsh',
    email: 'stan.marsh@southpark.co',
    password: 'SouthPark123!',
    isVerified: true,
    role: 'user',
    bio: "I'm just a regular kid from South Park. Oh my God, they killed Kenny!",
  },
  {
    name: 'Kyle Broflovski',
    email: 'kyle.broflovski@southpark.co',
    password: 'SouthPark123!',
    isVerified: true,
    role: 'user',
    bio: 'Smart kid from South Park. I wear a green hat and care about doing the right thing.',
  },
  {
    name: 'Eric Cartman',
    email: 'eric.cartman@southpark.co',
    password: 'SouthPark123!',
    isVerified: true,
    role: 'user',
    bio: "Respect my authoritah! I'm the coolest kid in South Park.",
  },
  {
    name: 'Kenny McCormick',
    email: 'kenny.mccormick@southpark.co',
    password: 'SouthPark123!',
    isVerified: true,
    role: 'user',
    bio: 'Mmmph mmmph mmmph! (I die a lot but always come back)',
  },
  {
    name: 'Butters Stotch',
    email: 'butters.stotch@southpark.co',
    password: 'SouthPark123!',
    isVerified: true,
    role: 'user',
    bio: "Oh hamburgers! I'm just trying to be a good kid and not get grounded.",
  },
  {
    name: 'Wendy Testaburger',
    email: 'wendy.testaburger@southpark.co',
    password: 'SouthPark123!',
    isVerified: true,
    role: 'user',
    bio: 'Student body president and activist. I care about important issues.',
  },
  {
    name: 'Randy Marsh',
    email: 'randy.marsh@southpark.co',
    password: 'SouthPark123!',
    isVerified: true,
    role: 'admin',
    bio: "I'm a geologist and Stan's dad. I thought this was America!",
  },
  {
    name: 'Chef Jerome',
    email: 'chef@southpark.co',
    password: 'SouthPark123!',
    isVerified: true,
    role: 'admin',
    bio: "Hello there children! I'm the school chef and I love to sing.",
  },
  {
    name: 'Mr. Garrison',
    email: 'mr.garrison@southpark.co',
    password: 'SouthPark123!',
    isVerified: false,
    role: 'user',
    bio: "I'm a teacher at South Park Elementary. Mkay?",
  },
  {
    name: 'Towelie',
    email: 'towelie@southpark.co',
    password: 'SouthPark123!',
    isVerified: false,
    role: 'user',
    bio: "Don't forget to bring a towel! Wanna get high?",
  },
  {
    name: 'Jimmy Valmer',
    email: 'jimmy.valmer@southpark.co',
    password: 'SouthPark123!',
    isVerified: true,
    role: 'user',
    bio: 'Wow, what a great audience! I love telling jokes and performing.',
  },
  {
    name: 'Timmy Burch',
    email: 'timmy.burch@southpark.co',
    password: 'SouthPark123!',
    isVerified: true,
    role: 'user',
    bio: 'Timmy! Timmy Timmy Timmy!',
  },
]

// Test user for automated testing
const TEST_USERS = [
  {
    name: 'Test User',
    email: 'test@example.com',
    password: 'TestPassword123!',
    isVerified: true,
    role: 'user',
    bio: 'Automated test user for E2E testing',
  },
  {
    name: 'Admin Test',
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    isVerified: true,
    role: 'admin',
    bio: 'Admin test user for E2E testing',
  },
]

interface SeedOptions {
  clear?: boolean
  env?: 'development' | 'test'
  verbose?: boolean
}

class UserSeeder {
  private options: SeedOptions

  constructor(options: SeedOptions = {}) {
    this.options = {
      clear: false,
      env: 'development',
      verbose: true,
      ...options,
    }
  }

  async connect(): Promise<void> {
    const isTest = this.options.env === 'test'
    const dbName = isTest ? 'auth-app-test' : 'auth-app'
    const uri = process.env.MONGO_URI || `mongodb://localhost:27017/${dbName}`

    if (this.options.verbose) {
      console.log(`🔌 Connecting to MongoDB: ${uri}`)
    }

    await mongoose.connect(uri)

    if (this.options.verbose) {
      console.log('✅ Connected to MongoDB')
    }
  }

  async clearUsers(): Promise<void> {
    if (this.options.verbose) {
      console.log('🗑️  Clearing existing users...')
    }

    const result = await User.deleteMany({})

    if (this.options.verbose) {
      console.log(`🗑️  Deleted ${result.deletedCount} existing users`)
    }
  }

  async createUsers(): Promise<void> {
    const usersToCreate =
      this.options.env === 'test'
        ? [...TEST_USERS, ...SOUTH_PARK_USERS.slice(0, 4)] // Fewer users for testing
        : [...TEST_USERS, ...SOUTH_PARK_USERS]

    if (this.options.verbose) {
      console.log(`👥 Creating ${usersToCreate.length} users...`)
    }

    for (const userData of usersToCreate) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email })
        if (existingUser) {
          if (this.options.verbose) {
            console.log(`⚠️  User ${userData.email} already exists, skipping...`)
          }
          continue
        }

        // Hash password
        const hashedPassword = await bcryptjs.hash(userData.password, 10)

        // Create user
        const user = new User({
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          isVerified: userData.isVerified,
          lastLogin: new Date(),
        })

        await user.save()

        if (this.options.verbose) {
          const status = userData.isVerified ? '✅' : '⏳'
          const role = userData.role === 'admin' ? '👑' : '👤'
          console.log(`${status} ${role} Created: ${userData.name} (${userData.email})`)
        }
      } catch (error) {
        console.error(`❌ Failed to create user ${userData.email}:`, error)
      }
    }
  }

  async printSummary(): Promise<void> {
    const totalUsers = await User.countDocuments()
    const verifiedUsers = await User.countDocuments({ isVerified: true })
    const unverifiedUsers = await User.countDocuments({ isVerified: false })

    console.log('\n📊 Database Summary:')
    console.log(`   Total Users: ${totalUsers}`)
    console.log(`   ✅ Verified: ${verifiedUsers}`)
    console.log(`   ⏳ Unverified: ${unverifiedUsers}`)

    if (this.options.verbose) {
      console.log('\n👥 Sample Users for Testing:')
      console.log('   📧 Email: stan.marsh@southpark.co')
      console.log('   🔑 Password: SouthPark123!')
      console.log('   📧 Email: test@example.com')
      console.log('   🔑 Password: TestPassword123!')
      console.log('   📧 Email: admin@example.com (Admin)')
      console.log('   🔑 Password: AdminPassword123!')
    }
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect()
    if (this.options.verbose) {
      console.log('🔌 Disconnected from MongoDB')
    }
  }

  async seed(): Promise<void> {
    try {
      await this.connect()

      if (this.options.clear) {
        await this.clearUsers()
      }

      await this.createUsers()
      await this.printSummary()
    } catch (error) {
      console.error('❌ Seeding failed:', error)
      throw error
    } finally {
      await this.disconnect()
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)

  const options: SeedOptions = {
    clear: args.includes('--clear'),
    env: args.includes('--env=test') ? 'test' : 'development',
    verbose: !args.includes('--quiet'),
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
South Park User Seeder

Usage:
  pnpm seed:users [options]

Options:
  --clear         Clear existing users before seeding
  --env=test      Use test database instead of development
  --quiet         Suppress verbose output
  --help, -h      Show this help message

Examples:
  pnpm seed:users                    # Seed development database
  pnpm seed:users --clear            # Clear and reseed
  pnpm seed:users --env=test         # Seed test database
  pnpm seed:users --clear --env=test # Clear and seed test database

Created Users:
  - South Park characters (stan.marsh@southpark.co, etc.)
  - Test users (test@example.com, admin@example.com)
  - All passwords: SouthPark123! or TestPassword123!
    `)
    process.exit(0)
  }

  console.log('🎬 South Park User Seeder')
  console.log(`📊 Environment: ${options.env}`)
  console.log(`🗑️  Clear existing: ${options.clear ? 'Yes' : 'No'}`)
  console.log('')

  const seeder = new UserSeeder(options)
  await seeder.seed()

  console.log('\n🎉 Seeding completed successfully!')
  console.log('\n💡 You can now login with any of the created users.')
  console.log('   Try: stan.marsh@southpark.co / SouthPark123!')
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Seeder failed:', error)
    process.exit(1)
  })
}

export { UserSeeder, SOUTH_PARK_USERS, TEST_USERS }
