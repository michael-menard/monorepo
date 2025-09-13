# Seed Users Documentation

This document lists all the seeded users available for testing the auth flow.

## 🚀 Quick Start

### Seed Users
```bash
# Seed users in development database
pnpm seed:users

# Clear existing users and reseed
pnpm seed:users:clear

# Seed test database
pnpm seed:users:test
```

### From Project Root
```bash
# Seed users from project root
pnpm seed:users

# Clear and reseed
pnpm seed:users:clear
```

## 👥 Available Test Users

### Standard Test Users

#### Regular Test User
- **Email**: `test@example.com`
- **Password**: `TestPassword123!`
- **Name**: Test User
- **Status**: ✅ Verified
- **Role**: 👤 User
- **Use**: Standard automated testing

#### Admin Test User
- **Email**: `admin@example.com`
- **Password**: `AdminPassword123!`
- **Name**: Admin Test
- **Status**: ✅ Verified
- **Role**: 👑 Admin
- **Use**: Admin functionality testing

### South Park Characters 🎬

#### Main Characters

**Stan Marsh**
- **Email**: `stan.marsh@southpark.co`
- **Password**: `SouthPark123!`
- **Status**: ✅ Verified
- **Role**: 👤 User
- **Bio**: "I'm just a regular kid from South Park. Oh my God, they killed Kenny!"

**Kyle Broflovski**
- **Email**: `kyle.broflovski@southpark.co`
- **Password**: `SouthPark123!`
- **Status**: ✅ Verified
- **Role**: 👤 User
- **Bio**: "Smart kid from South Park. I wear a green hat and care about doing the right thing."

**Eric Cartman**
- **Email**: `eric.cartman@southpark.co`
- **Password**: `SouthPark123!`
- **Status**: ✅ Verified
- **Role**: 👤 User
- **Bio**: "Respect my authoritah! I'm the coolest kid in South Park."

**Kenny McCormick**
- **Email**: `kenny.mccormick@southpark.co`
- **Password**: `SouthPark123!`
- **Status**: ✅ Verified
- **Role**: 👤 User
- **Bio**: "Mmmph mmmph mmmph! (I die a lot but always come back)"

#### Supporting Characters

**Butters Stotch**
- **Email**: `butters.stotch@southpark.co`
- **Password**: `SouthPark123!`
- **Status**: ✅ Verified
- **Role**: 👤 User
- **Bio**: "Oh hamburgers! I'm just trying to be a good kid and not get grounded."

**Wendy Testaburger**
- **Email**: `wendy.testaburger@southpark.co`
- **Password**: `SouthPark123!`
- **Status**: ✅ Verified
- **Role**: 👤 User
- **Bio**: "Student body president and activist. I care about important issues."

**Jimmy Valmer**
- **Email**: `jimmy.valmer@southpark.co`
- **Password**: `SouthPark123!`
- **Status**: ✅ Verified
- **Role**: 👤 User
- **Bio**: "Wow, what a great audience! I love telling jokes and performing."

**Timmy Burch**
- **Email**: `timmy.burch@southpark.co`
- **Password**: `SouthPark123!`
- **Status**: ✅ Verified
- **Role**: 👤 User
- **Bio**: "Timmy! Timmy Timmy Timmy!"

#### Adult Characters (Admins)

**Randy Marsh**
- **Email**: `randy.marsh@southpark.co`
- **Password**: `SouthPark123!`
- **Status**: ✅ Verified
- **Role**: 👑 Admin
- **Bio**: "I'm a geologist and Stan's dad. I thought this was America!"

**Chef Jerome**
- **Email**: `chef@southpark.co`
- **Password**: `SouthPark123!`
- **Status**: ✅ Verified
- **Role**: 👑 Admin
- **Bio**: "Hello there children! I'm the school chef and I love to sing."

#### Unverified Users (For Testing Verification Flow)

**Mr. Garrison**
- **Email**: `mr.garrison@southpark.co`
- **Password**: `SouthPark123!`
- **Status**: ⏳ Unverified
- **Role**: 👤 User
- **Bio**: "I'm a teacher at South Park Elementary. Mkay?"

**Towelie**
- **Email**: `towelie@southpark.co`
- **Password**: `SouthPark123!`
- **Status**: ⏳ Unverified
- **Role**: 👤 User
- **Bio**: "Don't forget to bring a towel! Wanna get high?"

## 🧪 Testing Scenarios

### Login Testing
```bash
# Test with Stan (verified user)
Email: stan.marsh@southpark.co
Password: SouthPark123!

# Test with admin user
Email: randy.marsh@southpark.co
Password: SouthPark123!

# Test with unverified user
Email: mr.garrison@southpark.co
Password: SouthPark123!
```

### Playwright E2E Tests
The test users are available in `tests/auth/test-users.ts`:

```typescript
import { DEFAULT_TEST_USER, SOUTH_PARK_USERS } from './test-users';

// Use in tests
await page.fill('input[type="email"]', DEFAULT_TEST_USER.email);
await page.fill('input[type="password"]', DEFAULT_TEST_USER.password);
```

### Manual Testing
1. **Start the development environment**:
   ```bash
   pnpm dev:full
   ```

2. **Navigate to**: http://localhost:3004/auth/login

3. **Try logging in with any user above**

## 🔧 Database Management

### View Users in MongoDB
```bash
# Connect to MongoDB
mongosh mongodb://admin:password123@localhost:27017/backend?authSource=admin

# List all users
db.users.find({}, { password: 0 }).pretty()

# Find specific user
db.users.findOne({ email: "stan.marsh@southpark.co" }, { password: 0 })

# Count users by verification status
db.users.countDocuments({ isVerified: true })
db.users.countDocuments({ isVerified: false })
```

### Clear All Users
```bash
# Clear all seeded users
pnpm seed:users:clear

# Or manually in MongoDB
mongosh mongodb://admin:password123@localhost:27017/backend?authSource=admin
db.users.deleteMany({})
```

## 🎭 Character Personalities for Testing

When manually testing, you can role-play as the characters:

- **Stan**: The reasonable, normal kid - test standard user flows
- **Kyle**: The smart, ethical one - test validation and error handling
- **Cartman**: The troublemaker - test edge cases and malicious inputs
- **Kenny**: The unlucky one - test error recovery and retry logic
- **Butters**: The innocent one - test user-friendly error messages
- **Randy**: The chaotic adult - test admin features with unpredictable behavior

## 🔒 Security Notes

- All passwords follow the required pattern: `SouthPark123!` or `TestPassword123!`
- Passwords are properly hashed with bcrypt (10 salt rounds)
- Test users should only be used in development/test environments
- Never use these credentials in production

## 📊 Database Statistics

After seeding, you should have:
- **Total Users**: ~85 (including any existing users)
- **Verified Users**: ~54
- **Unverified Users**: ~31
- **Admin Users**: 3 (Admin Test, Randy Marsh, Chef Jerome)
- **Regular Users**: Rest are regular users

## 🚀 Integration with Tests

The seeded users integrate with:
- ✅ Playwright E2E tests
- ✅ Auth package unit tests
- ✅ Integration tests
- ✅ Manual testing workflows
- ✅ Development environment

Perfect for testing the consolidated auth flow with CSRF protection! 🎉
