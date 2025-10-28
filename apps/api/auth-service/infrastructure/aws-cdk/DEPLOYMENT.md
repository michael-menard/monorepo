# Auth Service Deployment Guide

This guide explains the different deployment scenarios for the Auth Service and when to use each approach.

## 🎯 **Deployment Types**

### 1. **Infrastructure Deployment** 🏗️
**When to use**: First-time deployment, infrastructure changes, new environments

```bash
# Deploy infrastructure only (no seeding)
npm run deploy:infra

# Deploy to specific environments
npm run deploy:infra:staging
npm run deploy:infra:production
```

**What it does**:
- Creates/updates AWS resources (ECS, DocumentDB, ALB, etc.)
- Does NOT seed database
- Does NOT deploy application code changes

### 2. **Infrastructure + Seeding** 🌱
**When to use**: First-time deployment when you want users ready immediately

```bash
# Deploy infrastructure and seed database
npm run deploy:with-seeding

# Deploy to specific environments with seeding
npm run deploy:with-seeding:staging
npm run deploy:with-seeding:production
```

**What it does**:
- Creates/updates AWS resources
- Automatically seeds database with test users (if empty)
- Smart seeding (won't duplicate users)

### 3. **Database Seeding Only** 👥
**When to use**: Add users to existing infrastructure, reset test data

```bash
# Seed database (only if empty)
npm run seed

# Force clear and reseed
npm run seed:clear

# Force seed (may create duplicates)
npm run seed:force

# Seed specific environments
npm run seed:staging
npm run seed:production
```

**What it does**:
- Only seeds the database
- Requires existing infrastructure
- Smart seeding by default

### 4. **Code Deployment** 🚀
**When to use**: Application updates, bug fixes, feature releases

```bash
# This will be handled by CI/CD pipeline
# Updates ECS service with new Docker image
# Does NOT run seeding
```

**What it does**:
- Updates application code in existing infrastructure
- Does NOT seed database
- Fastest deployment type

## 🧠 **Smart Seeding Logic**

The seeding scripts are intelligent and won't duplicate users:

```bash
# ✅ Safe - only seeds if database is empty
npm run seed

# ⚠️  Caution - clears existing users first
npm run seed:clear

# ⚠️  Caution - may create duplicates
npm run seed:force
```

### Seeding Behavior:
- **Default**: Only seeds if database has 0 users
- **--clear**: Deletes all users, then seeds
- **--force**: Seeds regardless of existing users (may duplicate)

## 👥 **Seeded Users**

After seeding, you'll have these test users:

### **Standard Test Users**
- `test@example.com` / `TestPassword123!` (User)
- `admin@example.com` / `AdminPassword123!` (Admin)

### **South Park Characters** (Development Fun!)
- `stan.marsh@southpark.co` / `SouthPark123!`
- `kyle.broflovski@southpark.co` / `SouthPark123!`
- `eric.cartman@southpark.co` / `SouthPark123!`
- `kenny.mccormick@southpark.co` / `SouthPark123!`
- And many more...

## 🔄 **Typical Workflows**

### **New Environment Setup**
```bash
# 1. Deploy infrastructure with seeding
npm run deploy:with-seeding

# Done! Infrastructure + users ready
```

### **Development Workflow**
```bash
# 1. First time - deploy with seeding
npm run deploy:with-seeding

# 2. Code changes - use CI/CD (no seeding)
git push origin feature-branch

# 3. Reset test data occasionally
npm run seed:clear
```

### **Production Deployment**
```bash
# 1. Infrastructure only (no test users in prod)
ENVIRONMENT=production npm run deploy:infra

# 2. Code deployments via CI/CD
# 3. Never seed production with test users
```

## 🚨 **Important Notes**

### **Environment Safety**
- **Development**: Seed freely with test users
- **Staging**: Seed with test users for testing
- **Production**: NEVER seed with test users

### **Database Persistence**
- DocumentDB data persists across code deployments
- Only infrastructure changes can affect the database
- Seeding is separate from code deployment

### **CI/CD Integration**
- Infrastructure deployments: Manual (CDK)
- Code deployments: Automated (CI/CD)
- Database seeding: Manual/conditional

## 🛠️ **Advanced Usage**

### **Environment Variables**
```bash
# Override defaults
ENVIRONMENT=staging CLEAR_USERS=true ./scripts/seed-database.sh
SKIP_SEEDING=true ./scripts/deploy-with-seeding.sh
```

### **Direct Script Usage**
```bash
# Navigate to CDK directory
cd apps/api/auth-service/infrastructure/aws-cdk

# Run scripts directly
./scripts/deploy-infrastructure.sh --environment staging
./scripts/seed-database.sh --clear --environment dev
./scripts/deploy-with-seeding.sh --skip-seeding
```

### **Troubleshooting**
```bash
# Check if infrastructure exists
aws cloudformation describe-stacks --stack-name AuthServiceStackDev

# Check database connection
mongosh "mongodb://user:pass@endpoint:27017/auth-app?ssl=true"

# View deployment logs
aws logs tail /aws/ecs/auth-service --follow
```

## 📊 **Deployment Matrix**

| Scenario | Script | Infrastructure | Code | Seeding |
|----------|--------|---------------|------|---------|
| First deployment | `deploy:with-seeding` | ✅ | ✅ | ✅ |
| Infrastructure change | `deploy:infra` | ✅ | ✅ | ❌ |
| Code change | CI/CD Pipeline | ❌ | ✅ | ❌ |
| Add test users | `seed` | ❌ | ❌ | ✅ |
| Reset test data | `seed:clear` | ❌ | ❌ | ✅ |

## 🎯 **Quick Reference**

```bash
# Most common commands
npm run deploy:with-seeding    # First deployment
npm run deploy:infra           # Infrastructure only
npm run seed                   # Add users (safe)
npm run seed:clear             # Reset users
```

This approach ensures:
- ✅ No accidental user duplication
- ✅ Separation of infrastructure vs code deployment
- ✅ Safe production deployments
- ✅ Easy development workflow
