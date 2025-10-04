# MongoDB User Queries Guide

## 🚀 Quick Start

### 1. Connect to MongoDB Container
```bash
# Connect to your MongoDB container
docker exec -it mongodb-dev mongosh mongodb://admin:password123@localhost:27017/auth-app?authSource=admin
```

### 2. Switch to Auth Database
```javascript
use auth-app
```

## 📊 Basic User Queries

### Find All Users
```javascript
// Get all users (excluding passwords for security)
db.users.find({}, { password: 0 }).pretty()

// Get all users with formatted output
db.users.find({}, { 
  password: 0, 
  verificationToken: 0, 
  resetPasswordToken: 0 
}).pretty()
```

### Count Users
```javascript
// Total user count
db.users.countDocuments()

// Count verified users
db.users.countDocuments({ isVerified: true })

// Count unverified users
db.users.countDocuments({ isVerified: false })
```

### Find Specific Users
```javascript
// Find user by email
db.users.findOne({ email: "user@example.com" }, { password: 0 })

// Find user by ID
db.users.findOne({ _id: ObjectId("USER_ID_HERE") }, { password: 0 })

// Find users by name
db.users.find({ name: /john/i }, { password: 0 })
```

## 🔍 Advanced Queries

### Recent Users
```javascript
// Users created in last 24 hours
db.users.find({
  createdAt: {
    $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
  }
}, { password: 0 }).sort({ createdAt: -1 })

// Users who logged in recently
db.users.find({
  lastLogin: {
    $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }
}, { password: 0 }).sort({ lastLogin: -1 })
```

### User Status Queries
```javascript
// All verified users
db.users.find({ isVerified: true }, { password: 0 })

// Users with pending verification
db.users.find({ 
  isVerified: false,
  verificationTokenExpiresAt: { $gt: new Date() }
}, { password: 0 })

// Users with expired verification tokens
db.users.find({ 
  isVerified: false,
  verificationTokenExpiresAt: { $lt: new Date() }
}, { password: 0 })
```

### Search and Filter
```javascript
// Search users by email domain
db.users.find({ email: /@gmail\.com$/ }, { password: 0 })

// Users created between dates
db.users.find({
  createdAt: {
    $gte: new Date("2024-01-01"),
    $lt: new Date("2024-12-31")
  }
}, { password: 0 })
```

## 📈 Analytics Queries

### User Statistics
```javascript
// User registration by month
db.users.aggregate([
  {
    $group: {
      _id: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" }
      },
      count: { $sum: 1 }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } }
])

// Verification rate
db.users.aggregate([
  {
    $group: {
      _id: "$isVerified",
      count: { $sum: 1 }
    }
  }
])
```

## 🛠️ User Management

### Update User Data
```javascript
// Verify a user
db.users.updateOne(
  { email: "user@example.com" },
  { 
    $set: { 
      isVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null
    }
  }
)

// Update user name
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { name: "New Name" } }
)
```

### Delete Users
```javascript
// Delete specific user
db.users.deleteOne({ email: "user@example.com" })

// Delete all unverified users older than 30 days
db.users.deleteMany({
  isVerified: false,
  createdAt: {
    $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  }
})
```

## 🔐 Security Best Practices

### Always Exclude Sensitive Fields
```javascript
// Good - excludes sensitive data
db.users.find({}, { 
  password: 0, 
  verificationToken: 0, 
  resetPasswordToken: 0 
})

// Bad - exposes sensitive data
db.users.find({})
```

### Use Projections for Performance
```javascript
// Only get needed fields
db.users.find({}, { 
  email: 1, 
  name: 1, 
  isVerified: 1, 
  createdAt: 1 
})
```
