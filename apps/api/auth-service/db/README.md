# Database Seeder

This directory contains the database seeding functionality for the LEGO App Auth Service.

## 📁 Files

- `seeder.js` - Main seeder script that generates 50 users
- `init-mongo.js` - MongoDB initialization script
- `README.md` - This documentation file

## 🌱 Seeder Features

### **Automatic Seeding**
- Seeds the database with 50 realistic users when the database is empty
- Only runs if no users exist in the database
- Integrated into the auth service startup process

### **User Data Generated**
- **Names**: Realistic first and last names
- **Emails**: Valid email addresses with common domains
- **Passwords**: Securely hashed with bcrypt (salt rounds: 12)
- **Roles**: Mix of users, moderators, and admins
- **Profiles**: LEGO-themed bios and preferences
- **Timestamps**: Realistic creation and last login dates

### **User Distribution**
- **50 total users**
- **~85% Regular users**
- **~10% Moderators**
- **~5% Admins**
- **~80% Email verified**
- **~20% Email unverified**

## 🚀 Usage

### **Automatic Seeding (Recommended)**
The seeder runs automatically when the auth service starts:

```bash
# Start auth service with automatic seeding
npm run start:with-seed

# Or using Docker
docker-compose up auth-service
```

### **Manual Seeding**
Run the seeder manually:

```bash
# Run seeder directly
npm run seed

# Or run the script directly
node scripts/seed-database.js
```

### **Docker Integration**
The seeder is automatically integrated into the Docker container:

```bash
# Build and run with Docker
docker build -t lego-auth-service .
docker run -e MONGODB_URI=... lego-auth-service
```

## 📊 Sample Users

The seeder creates users like:

```
1. James Smith (james.smith1@gmail.com) - user
2. Mary Johnson (mary.johnson2@yahoo.com) - moderator
3. John Williams (john.williams3@hotmail.com) - user
4. Patricia Brown (patricia.brown4@outlook.com) - user
5. Robert Jones (robert.jones5@icloud.com) - admin
```

## 🔐 Login Credentials

For testing purposes, users are created with predictable passwords:

- **Username**: `james.smith1@gmail.com`
- **Password**: `Password1!`

- **Username**: `mary.johnson2@yahoo.com`
- **Password**: `Password2!`

And so on up to `Password50!`

## 🛠️ Configuration

### **Environment Variables**
The seeder uses the same environment variables as the auth service:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret (for consistency)

### **Customization**
To modify the seeder:

1. Edit `seeder.js` to change user generation logic
2. Update the arrays of names, domains, and bios
3. Modify the role distribution percentages
4. Adjust the number of users generated

## 🔍 Monitoring

### **Seeder Logs**
The seeder provides detailed logging:

```
🔍 Checking if database is empty...
🌱 Database is empty. Starting to seed users...
🔐 Hashing passwords...
💾 Inserting users into database...
✅ Successfully seeded 50 users!

📊 Seeding Statistics:
   - Total users: 50
   - Admins: 2
   - Moderators: 5
   - Regular users: 43
   - Email verified: 40
   - Email unverified: 10

👥 Sample Users Created:
   1. James Smith (james.smith1@gmail.com) - user
   2. Mary Johnson (mary.johnson2@yahoo.com) - moderator
   3. John Williams (john.williams3@hotmail.com) - user
   4. Patricia Brown (patricia.brown4@outlook.com) - user
   5. Robert Jones (robert.jones5@icloud.com) - admin
```

### **Database Verification**
Check the seeded data:

```bash
# Connect to MongoDB
mongosh mongodb://admin:password123@localhost:27017/lego_auth

# Check user count
db.users.countDocuments()

# View sample users
db.users.find().limit(5).pretty()
```

## 🔒 Security Notes

### **Development Only**
- The seeder is designed for development and testing
- Passwords are predictable for easy testing
- Should not be used in production without modification

### **Production Considerations**
For production use:
1. Remove or disable the seeder
2. Use strong, random passwords
3. Implement proper user registration flow
4. Add rate limiting and security measures

## 🐛 Troubleshooting

### **Common Issues**

1. **Seeder not running**
   - Check if database already has users
   - Verify MongoDB connection
   - Check environment variables

2. **Permission errors**
   - Ensure scripts are executable: `chmod +x scripts/*.js`
   - Check file permissions in Docker container

3. **MongoDB connection issues**
   - Verify `MONGODB_URI` is correct
   - Check if MongoDB is running
   - Ensure network connectivity

### **Debug Commands**

```bash
# Check if seeder can connect
node -e "import('./db/seeder.js').then(m => m.runSeeder())"

# Check database status
mongosh --eval "db.users.countDocuments()"

# View seeder logs
docker logs lego-auth-service
```

## 📚 Related Documentation

- [Auth Service README](../README.md)
- [Docker Deployment Guide](../../../../DOCKER_DEPLOYMENT.md)
- [Turbo Commands Guide](../../../../LEGO_TURBO_COMMANDS.md) 