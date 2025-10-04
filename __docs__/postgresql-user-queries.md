# PostgreSQL User Queries Guide

## 🚀 Quick Start

### 1. Connect to PostgreSQL
```bash
# Connect to your PostgreSQL container
docker exec -it postgres-dev psql -U user -d lego_projects

# Or connect directly if running locally
psql -h localhost -U user -d lego_projects
```

## 📊 Basic User Queries

### View All Users
```sql
-- Get all users
SELECT * FROM users;

-- Get users with formatted output
SELECT 
  id,
  username,
  email,
  preferred_name,
  bio,
  avatar_url,
  created_at,
  updated_at
FROM users
ORDER BY created_at DESC;
```

### Count Users
```sql
-- Total user count
SELECT COUNT(*) as total_users FROM users;

-- Users with usernames
SELECT COUNT(*) as users_with_username 
FROM users 
WHERE username IS NOT NULL;

-- Users with bios
SELECT COUNT(*) as users_with_bio 
FROM users 
WHERE bio IS NOT NULL AND bio != '';
```

### Find Specific Users
```sql
-- Find user by email
SELECT * FROM users WHERE email = 'user@example.com';

-- Find user by username
SELECT * FROM users WHERE username = 'john_doe';

-- Find user by ID
SELECT * FROM users WHERE id = 'user-uuid-here';

-- Search users by name (case-insensitive)
SELECT * FROM users 
WHERE LOWER(preferred_name) LIKE LOWER('%john%')
   OR LOWER(username) LIKE LOWER('%john%');
```

## 🔍 Advanced Queries

### Recent Users
```sql
-- Users created in last 24 hours
SELECT * FROM users 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Users created this week
SELECT * FROM users 
WHERE created_at >= DATE_TRUNC('week', NOW())
ORDER BY created_at DESC;

-- Users created this month
SELECT * FROM users 
WHERE created_at >= DATE_TRUNC('month', NOW())
ORDER BY created_at DESC;
```

### User Profile Completeness
```sql
-- Users with complete profiles
SELECT * FROM users 
WHERE username IS NOT NULL 
  AND preferred_name IS NOT NULL 
  AND bio IS NOT NULL 
  AND avatar_url IS NOT NULL;

-- Users with incomplete profiles
SELECT 
  id,
  email,
  username,
  CASE WHEN username IS NULL THEN 'Missing username' ELSE 'Has username' END as username_status,
  CASE WHEN preferred_name IS NULL THEN 'Missing name' ELSE 'Has name' END as name_status,
  CASE WHEN bio IS NULL OR bio = '' THEN 'Missing bio' ELSE 'Has bio' END as bio_status,
  CASE WHEN avatar_url IS NULL THEN 'Missing avatar' ELSE 'Has avatar' END as avatar_status
FROM users
WHERE username IS NULL 
   OR preferred_name IS NULL 
   OR bio IS NULL 
   OR bio = ''
   OR avatar_url IS NULL;
```

### Search and Filter
```sql
-- Search by email domain
SELECT * FROM users 
WHERE email LIKE '%@gmail.com';

-- Users created between dates
SELECT * FROM users 
WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31'
ORDER BY created_at DESC;

-- Users updated recently
SELECT * FROM users 
WHERE updated_at > created_at
  AND updated_at >= NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;
```

## 📈 Analytics Queries

### User Registration Trends
```sql
-- Daily registration counts
SELECT 
  DATE(created_at) as registration_date,
  COUNT(*) as new_users
FROM users 
GROUP BY DATE(created_at)
ORDER BY registration_date DESC;

-- Monthly registration trends
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as new_users
FROM users 
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- Weekly registration trends
SELECT 
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as new_users
FROM users 
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;
```

### Profile Statistics
```sql
-- Profile completion statistics
SELECT 
  COUNT(*) as total_users,
  COUNT(username) as users_with_username,
  COUNT(preferred_name) as users_with_name,
  COUNT(CASE WHEN bio IS NOT NULL AND bio != '' THEN 1 END) as users_with_bio,
  COUNT(avatar_url) as users_with_avatar,
  ROUND(COUNT(username) * 100.0 / COUNT(*), 2) as username_completion_rate,
  ROUND(COUNT(preferred_name) * 100.0 / COUNT(*), 2) as name_completion_rate,
  ROUND(COUNT(CASE WHEN bio IS NOT NULL AND bio != '' THEN 1 END) * 100.0 / COUNT(*), 2) as bio_completion_rate,
  ROUND(COUNT(avatar_url) * 100.0 / COUNT(*), 2) as avatar_completion_rate
FROM users;

-- Email domain distribution
SELECT 
  SPLIT_PART(email, '@', 2) as email_domain,
  COUNT(*) as user_count
FROM users 
GROUP BY SPLIT_PART(email, '@', 2)
ORDER BY user_count DESC;
```

## 🛠️ User Management

### Update User Data
```sql
-- Update user profile
UPDATE users 
SET 
  preferred_name = 'New Name',
  bio = 'Updated bio',
  updated_at = NOW()
WHERE email = 'user@example.com';

-- Update username
UPDATE users 
SET 
  username = 'new_username',
  updated_at = NOW()
WHERE id = 'user-uuid-here';
```

### Data Cleanup
```sql
-- Find duplicate emails (shouldn't happen with unique constraint)
SELECT email, COUNT(*) 
FROM users 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Find users with empty strings (vs NULL)
SELECT * FROM users 
WHERE username = '' 
   OR preferred_name = '' 
   OR bio = '';
```

## 🔐 Security and Performance

### Indexes for Performance
```sql
-- Check existing indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'users';

-- Create additional indexes if needed
CREATE INDEX CONCURRENTLY idx_users_email_lower 
ON users (LOWER(email));

CREATE INDEX CONCURRENTLY idx_users_created_at 
ON users (created_at DESC);
```

### Data Export
```sql
-- Export user data to CSV
COPY (
  SELECT 
    id,
    username,
    email,
    preferred_name,
    created_at,
    updated_at
  FROM users 
  ORDER BY created_at DESC
) TO '/tmp/users_export.csv' WITH CSV HEADER;
```
