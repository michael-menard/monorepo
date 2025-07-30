# MongoDB Data Access Guide

This document explains how to access and query data from the local MongoDB instance used by the auth service.

## Prerequisites

1. **MongoDB Running**: Ensure the local MongoDB Docker container is running
2. **Docker**: MongoDB is running in a Docker container
3. **Connection Details**: The auth service connects to MongoDB using the configuration in `db/connectDB.ts`

## Connection Information

### Docker Container Details
- **Container Name**: `mongodb`
- **Host**: `localhost`
- **Port**: `27017` (default MongoDB port)
- **Database**: `backend` (not `auth-service` as previously documented)
- **Collection**: `users`

### MongoDB Credentials
- **Username**: `admin`
- **Password**: `password123`
- **Authentication Database**: `admin`

### Environment Variables
The connection details can be configured via environment variables:
```bash
MONGODB_URI=mongodb://admin:password123@localhost:27017/backend?authSource=admin
MONGODB_DB_NAME=backend
```

## Accessing MongoDB Data

### 1. Using Docker Exec (Recommended)

Connect to the MongoDB instance using Docker:
```bash
# Interactive shell
docker exec -it mongodb mongosh backend -u admin -p password123 --authenticationDatabase admin

# Direct query execution
docker exec mongodb mongosh backend -u admin -p password123 --authenticationDatabase admin --eval "db.users.find().pretty()"
```

### 2. Using MongoDB Shell (mongosh) - If installed locally

Connect to the MongoDB instance:
```bash
mongosh mongodb://admin:password123@localhost:27017/backend?authSource=admin
```

### 3. Using MongoDB Compass

1. Open MongoDB Compass
2. Connect to: `mongodb://admin:password123@localhost:27017/backend?authSource=admin`
3. Navigate to the `backend` database
4. Select the `users` collection

### 4. Web Interface (Mongo Express)

- **URL**: `http://localhost:8081`
- **No login required** (basic auth is disabled)
- **Note**: This provides a web-based admin interface

## Complete Connection Flow

### Step 1: Verify MongoDB is Running
```bash
docker ps | grep mongo
```

You should see both `mongodb` and `mongo-express` containers running.

### Step 2: Connect to MongoDB Shell
```bash
docker exec -it mongodb mongosh backend -u admin -p password123 --authenticationDatabase admin
```

### Step 3: Verify Connection
You should see output like:
```
Current Mongosh Log ID: ...
Connecting to: mongodb://<credentials>@127.0.0.1:27017/backend?...
Using MongoDB: 7.0.21
Using Mongosh: 2.5.2
...
backend>
```

### Step 4: Run Queries
Once you see the `backend>` prompt, you can run MongoDB queries.

## Querying User Data

### Basic Queries

#### Find All Users
```javascript
db.users.find().pretty()
```

#### Count Total Users
```javascript
db.users.countDocuments()
```

#### Find User by Email
```javascript
db.users.findOne({ email: "test@example.com" })
```

#### Find Recently Created Users
```javascript
db.users.find().sort({ createdAt: -1 }).limit(5)
```

#### Find Users Created Today
```javascript
db.users.find({
  createdAt: {
    $gte: new Date(new Date().setHours(0, 0, 0, 0))
  }
})
```

#### Find Unverified Users
```javascript
db.users.find({ isVerified: false })
```

### Advanced Queries

#### Find Users by Name (Partial Match)
```javascript
db.users.find({ firstName: { $regex: "Test", $options: "i" } })
```

#### Find Users with Specific Fields Only
```javascript
db.users.find({}, {email: 1, firstName: 1, lastName: 1, createdAt: 1, isVerified: 1, _id: 0})
```

#### Find Users Created in Last Hour
```javascript
db.users.find({
  createdAt: {
    $gte: new Date(Date.now() - 60 * 60 * 1000)
  }
})
```

#### Find Users Created in Last 24 Hours
```javascript
db.users.find({
  createdAt: {
    $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
  }
})
```

## Test User Data Queries

### Find E2E Test Users
```javascript
// Find users with e2e-test pattern (from Playwright tests)
db.users.find({ email: { $regex: "e2e-test", $options: "i" } })

// Find users with test emails
db.users.find({ email: { $regex: "test@", $options: "i" } })

// Find users with specific test patterns
db.users.find({ 
  $or: [
    { email: { $regex: "test@", $options: "i" } },
    { email: { $regex: "example.com", $options: "i" } }
  ]
})
```

### Find Users Created During Testing
```javascript
// Find users created in the last 30 minutes
db.users.find({
  createdAt: {
    $gte: new Date(Date.now() - 30 * 60 * 1000)
  }
})

// Find users created in the last 2 hours
db.users.find({
  createdAt: {
    $gte: new Date(Date.now() - 2 * 60 * 60 * 1000)
  }
})
```

## User Document Structure

Based on the User model, each user document has the following structure:

```javascript
{
  _id: ObjectId("..."),
  email: "user@example.com",
  firstName: "User",
  lastName: "Name",
  password: "hashedPassword", // bcrypt hashed
  isVerified: false,
  verificationToken: "token-string",
  verificationTokenExpires: ISODate("..."),
  lastLogin: ISODate("..."),
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

## Useful Queries for Development

### Clean Up Test Data
```javascript
// Remove all test users
db.users.deleteMany({ email: { $regex: "test@", $options: "i" } })

// Remove e2e test users
db.users.deleteMany({ email: { $regex: "e2e-test", $options: "i" } })

// Remove users created in the last hour
db.users.deleteMany({
  createdAt: {
    $gte: new Date(Date.now() - 60 * 60 * 1000)
  }
})
```

### Check User Verification Status
```javascript
// Count verified vs unverified users
db.users.aggregate([
  {
    $group: {
      _id: "$isVerified",
      count: { $sum: 1 }
    }
  }
])

// Show verification status breakdown
db.users.aggregate([
  {
    $group: {
      _id: "$isVerified",
      count: { $sum: 1 },
      users: { $push: "$email" }
    }
  }
])
```

### Find Users with Expired Verification Tokens
```javascript
db.users.find({
  isVerified: false,
  verificationTokenExpires: { $lt: new Date() }
})
```

### Update User Verification Status
```javascript
// Mark a user as verified
db.users.updateOne(
  { email: "test@example.com" },
  { 
    $set: { 
      isVerified: true,
      updatedAt: new Date()
    },
    $unset: { verificationToken: "", verificationTokenExpires: "" }
  }
)
```

### Find Users by Creation Date Range
```javascript
// Find users created between two dates
db.users.find({
  createdAt: {
    $gte: new Date("2024-01-01"),
    $lte: new Date("2024-12-31")
  }
})
```

## Direct Command Execution

You can run queries directly without entering the interactive shell:

```bash
# Count all users
docker exec mongodb mongosh backend -u admin -p password123 --authenticationDatabase admin --eval "db.users.countDocuments()"

# Find recent users
docker exec mongodb mongosh backend -u admin -p password123 --authenticationDatabase admin --eval "db.users.find().sort({createdAt: -1}).limit(3).pretty()"

# Find test users
docker exec mongodb mongosh backend -u admin -p password123 --authenticationDatabase admin --eval "db.users.find({email: /test@/}).pretty()"

# Find e2e test users
docker exec mongodb mongosh backend -u admin -p password123 --authenticationDatabase admin --eval "db.users.find({email: /e2e-test/}).pretty()"
```

## Database Management

### Backup Database
```bash
docker exec mongodb mongodump --db backend --out /tmp/backup
docker cp mongodb:/tmp/backup ./backup
```

### Restore Database
```bash
docker cp ./backup mongodb:/tmp/backup
docker exec mongodb mongorestore --db backend /tmp/backup/backend
```

### Export Collection
```bash
docker exec mongodb mongoexport --db backend --collection users --out /tmp/users.json
docker cp mongodb:/tmp/users.json ./users.json
```

### Import Collection
```bash
docker cp ./users.json mongodb:/tmp/users.json
docker exec mongodb mongoimport --db backend --collection users --file /tmp/users.json
```

## Troubleshooting

### Connection Issues
1. **MongoDB not running**: Check if Docker containers are running with `docker ps`
2. **Wrong credentials**: Use `admin`/`password123` with `--authenticationDatabase admin`
3. **Wrong database**: Connect to `backend` database, not `auth-service`

### Data Not Found
1. **Wrong database**: Verify you're connected to the `backend` database
2. **Wrong collection**: Check if the collection name is `users`
3. **Data not committed**: Ensure the application has successfully created the data

### Shell Issues
1. **Shell exits immediately**: Use `docker exec -it` for interactive sessions
2. **No prompt appears**: Press Enter after connection to see the `backend>` prompt
3. **Authentication errors**: Ensure you're using the correct credentials and auth database

### Performance Issues
1. **Large datasets**: Use indexes for frequently queried fields
2. **Complex queries**: Optimize queries with proper indexing
3. **Memory usage**: Monitor MongoDB memory usage

## Indexes for Better Performance

Consider creating these indexes for better query performance:

```javascript
// Index on email for fast lookups
db.users.createIndex({ email: 1 }, { unique: true })

// Index on createdAt for date-based queries
db.users.createIndex({ createdAt: -1 })

// Index on isVerified for status queries
db.users.createIndex({ isVerified: 1 })

// Compound index for verification queries
db.users.createIndex({ isVerified: 1, verificationTokenExpires: 1 })

// Index on firstName and lastName for name searches
db.users.createIndex({ firstName: 1, lastName: 1 })
```

## Integration with Playwright Tests

When running Playwright E2E tests that create users, you can query the database to verify the data:

```javascript
// After running signup tests, verify user was created
db.users.findOne({ email: "e2e-test-abc123@example.com" })

// Check if user is properly formatted
db.users.findOne(
  { email: "e2e-test-abc123@example.com" },
  { password: 0 } // Exclude password field
)

// Verify user has verification token
db.users.findOne(
  { email: "e2e-test-abc123@example.com" },
  { verificationToken: 1, isVerified: 1 }
)
```

This approach allows you to verify that your E2E tests are actually creating data in the database as expected.

## Quick Reference Commands

### Most Common Queries
```bash
# Connect to MongoDB shell
docker exec -it mongodb mongosh backend -u admin -p password123 --authenticationDatabase admin

# Count all users
docker exec mongodb mongosh backend -u admin -p password123 --authenticationDatabase admin --eval "db.users.countDocuments()"

# Show recent users
docker exec mongodb mongosh backend -u admin -p password123 --authenticationDatabase admin --eval "db.users.find().sort({createdAt: -1}).limit(5).pretty()"

# Show test users
docker exec mongodb mongosh backend -u admin -p password123 --authenticationDatabase admin --eval "db.users.find({email: /test@/}).pretty()"

# Show e2e test users
docker exec mongodb mongosh backend -u admin -p password123 --authenticationDatabase admin --eval "db.users.find({email: /e2e-test/}).pretty()"
``` 