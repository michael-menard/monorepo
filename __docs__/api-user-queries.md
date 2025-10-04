# API User Queries Guide

## 🚀 Using Your Existing API Endpoints

### Auth Service API (MongoDB Users)
Base URL: `http://localhost:5000`

#### Get Current User (Authenticated)
```bash
# First, login to get a token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Use the token to get user info
curl -X GET http://localhost:5000/api/auth/check-auth \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

#### Admin Endpoints (if you create them)
```bash
# Get all users (admin only)
curl -X GET http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Get user by ID
curl -X GET http://localhost:5000/api/admin/users/USER_ID \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Main API (PostgreSQL Users)
Base URL: `http://localhost:3001`

#### Get User Profile
```bash
# Get user profile by ID
curl -X GET http://localhost:3001/api/users/USER_UUID \
  -H "Authorization: Bearer JWT_TOKEN"

# Search users
curl -X GET "http://localhost:3001/api/users/search?q=john" \
  -H "Authorization: Bearer JWT_TOKEN"
```

## 🛠️ Creating Admin Endpoints

### Add Admin User Endpoints to Auth Service

Create `apps/api/auth-service/routes/admin.routes.js`:

```javascript
import express from 'express';
import { User } from '../models/User.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

// Middleware to check admin role (implement as needed)
const requireAdmin = (req, res, next) => {
  // Add your admin check logic here
  // For now, just pass through
  next();
};

// Get all users
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find({}, '-password -verificationToken -resetPasswordToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user by ID
router.get('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Search users
router.get('/users/search/:query', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { query } = req.params;
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }, '-password').limit(20);

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user statistics
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const total = await User.countDocuments();
    const verified = await User.countDocuments({ isVerified: true });
    const unverified = await User.countDocuments({ isVerified: false });
    
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      success: true,
      data: {
        total,
        verified,
        unverified,
        recentUsers
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
```

### Add to your main app.js:
```javascript
import adminRoutes from './routes/admin.routes.js';
app.use('/api/admin', adminRoutes);
```

## 📱 Frontend Integration

### React Hook for User Data
```typescript
// hooks/useUsers.ts
import { useState, useEffect } from 'react';

interface User {
  _id: string;
  email: string;
  name: string;
  isVerified: boolean;
  createdAt: string;
  lastLogin: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(
        `http://localhost:5000/api/admin/users?page=${page}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return { users, loading, error, refetch: fetchUsers };
};
```

### React Component Example
```tsx
// components/UserList.tsx
import React from 'react';
import { useUsers } from '../hooks/useUsers';

export const UserList: React.FC = () => {
  const { users, loading, error, refetch } = useUsers();

  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="user-list">
      <h2>Users ({users.length})</h2>
      <button onClick={() => refetch()}>Refresh</button>
      
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Verified</th>
            <th>Created</th>
            <th>Last Login</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user._id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.isVerified ? '✅' : '❌'}</td>
              <td>{new Date(user.createdAt).toLocaleDateString()}</td>
              <td>{new Date(user.lastLogin).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

## 🔍 Quick Commands for Development

### MongoDB Shell Commands
```bash
# Connect and run quick queries
docker exec -it mongodb-dev mongosh mongodb://admin:password123@localhost:27017/auth-app?authSource=admin --eval "db.users.find({}, {password:0}).limit(5).pretty()"

# Count users
docker exec -it mongodb-dev mongosh mongodb://admin:password123@localhost:27017/auth-app?authSource=admin --eval "db.users.countDocuments()"

# Find recent users
docker exec -it mongodb-dev mongosh mongodb://admin:password123@localhost:27017/auth-app?authSource=admin --eval "db.users.find({createdAt: {\$gte: new Date(Date.now() - 24*60*60*1000)}}, {password:0}).pretty()"
```

### PostgreSQL Commands
```bash
# Connect and run quick queries
docker exec -it postgres-dev psql -U user -d lego_projects -c "SELECT COUNT(*) FROM users;"

# Get recent users
docker exec -it postgres-dev psql -U user -d lego_projects -c "SELECT * FROM users ORDER BY created_at DESC LIMIT 5;"
```

### API Testing with curl
```bash
# Test auth endpoint
curl -s http://localhost:5000/api/admin/stats | jq

# Test main API
curl -s http://localhost:3001/api/users | jq
```
