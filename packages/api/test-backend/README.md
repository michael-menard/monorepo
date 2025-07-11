# Backend Template Package (PostgreSQL + Prisma + AppSync)

This is a template package for creating new backend services in the monorepo. It includes PostgreSQL, Prisma ORM, and GraphQL schema for AppSync.

## 🚀 What's Included

### **Core Dependencies:**
- **PostgreSQL** - Relational database
- **Prisma** - Type-safe database client
- **GraphQL** - Schema for AppSync
- **TypeScript** - Type safety
- **Zod** - Schema validation

### **Development Tools:**
- **Vitest** - Fast unit testing
- **Prisma Studio** - Database GUI
- **ESLint** - Code quality

## 📁 File Structure

```
packages/template-backend/
├── src/
│   ├── schema.graphql                # GraphQL schema
│   ├── schema.test.ts                # Schema validation tests
│   ├── resolvers.ts                  # GraphQL resolvers
│   ├── resolvers.test.ts             # Resolver tests (co-located)
│   └── index.ts                      # Main entry point
├── prisma/
│   └── schema.prisma                 # Database schema
├── vitest.config.ts                  # Vitest configuration
├── tsconfig.json                     # TypeScript configuration
├── package.json                      # Dependencies and scripts
└── README.md                         # This file
```

### **Testing Strategy: Co-located Tests**
This template uses **co-located testing** where test files are placed next to the files they test:
- `resolvers.ts` ↔ `resolvers.test.ts`
- `schema.graphql` ↔ `schema.test.ts`

This approach makes it easier to:
- Find tests related to specific functionality
- Maintain test files alongside source code
- Keep tests up-to-date with code changes

## 🛠️ How to Use

### **1. Copy the Template:**
```bash
cp -r packages/template-backend packages/my-backend-service
```

### **2. Update Package Name:**
Edit `package.json`:
```json
{
  "name": "@repo/my-backend-service"
}
```

### **3. Install Dependencies:**
```bash
cd packages/my-backend-service
pnpm install
```

### **4. Set up Database:**
```bash
# Create .env file
echo "DATABASE_URL=\"postgresql://user:password@localhost:5432/mydb\"" > .env

# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push
```

### **5. Run Development Server:**
```bash
pnpm dev
```

### **6. Run Tests:**
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

## 🧪 Testing Examples

### **Co-located Testing Pattern:**
Test files are placed next to the files they test for better organization:

```
src/
├── resolvers.ts           # Source file
├── resolvers.test.ts      # Test file (co-located)
├── schema.graphql         # GraphQL schema
└── schema.test.ts         # Schema tests (co-located)
```

### **GraphQL Resolver Tests:**
```typescript
// src/resolvers.test.ts
import { describe, it, expect } from 'vitest'
import { resolvers } from './resolvers'

describe('GraphQL Resolvers', () => {
  it('should create a user', async () => {
    const input = {
      email: 'test@example.com',
      name: 'Test User'
    }

    const result = await resolvers.Mutation.createUser(null, { input })
    
    expect(result).toBeDefined()
    expect(result.email).toBe(input.email)
  })
})
```

### **Schema Validation Tests:**
```typescript
// src/schema.test.ts
import { describe, it, expect } from 'vitest'
import { buildSchema } from 'graphql'
import fs from 'fs'

describe('GraphQL Schema', () => {
  it('should be valid GraphQL schema', () => {
    const schemaContent = fs.readFileSync('./schema.graphql', 'utf-8')
    expect(() => buildSchema(schemaContent)).not.toThrow()
  })
})
```

## 📊 Database Schema

### **Prisma Schema:**
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}
```

## 📝 GraphQL Schema

### **AppSync Schema:**
```graphql
type User {
  id: ID!
  email: String!
  name: String!
  createdAt: String!
  updatedAt: String!
}

type Query {
  getUser(id: ID!): User
  listUsers: [User!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}
```

## 🔧 Development Commands

```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
pnpm test:ui          # Run tests with UI
pnpm lint             # Run ESLint
pnpm check-types      # Run TypeScript check
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:migrate       # Run database migrations
pnpm db:studio        # Open Prisma Studio
```

## 📝 Environment Variables

Create a `.env` file:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"

# Environment
NODE_ENV=development
```

## 🔧 Configuration

### **Prisma Configuration:**
- **Provider**: PostgreSQL
- **Client**: Prisma Client
- **Migrations**: Enabled
- **Studio**: Available for database GUI

### **GraphQL Configuration:**
- **Schema**: AppSync compatible
- **Resolvers**: TypeScript with Prisma
- **Validation**: Zod schema validation

## 📋 GraphQL Operations

### **Queries:**
```graphql
# Get user by ID
query GetUser($id: ID!) {
  getUser(id: $id) {
    id
    email
    name
    createdAt
  }
}

# List all users
query ListUsers {
  listUsers {
    id
    email
    name
    createdAt
  }
}
```

### **Mutations:**
```graphql
# Create user
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    email
    name
    createdAt
  }
}

# Update user
mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
  updateUser(id: $id, input: $input) {
    id
    email
    name
    updatedAt
  }
}

# Delete user
mutation DeleteUser($id: ID!) {
  deleteUser(id: $id)
}
```

## 📝 Next Steps

1. **Replace example schema** with your actual models
2. **Add authentication** with AppSync Auth
3. **Add more GraphQL types** for your domain
4. **Add database migrations** for schema changes
5. **Add API documentation** (GraphQL Playground)
6. **Add CI/CD pipeline** for deployments

## 🔒 Security

### **Database Security:**
- Use environment variables for connection strings
- Implement proper authentication
- Use database migrations for schema changes

### **GraphQL Security:**
- Add authentication to resolvers
- Implement rate limiting
- Validate input with Zod

The backend template provides a solid foundation for building GraphQL APIs with PostgreSQL! 🎉 