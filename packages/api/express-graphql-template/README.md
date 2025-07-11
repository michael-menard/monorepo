# Express GraphQL Template

A production-ready Express.js backend template with GraphQL, PostgreSQL, and Prisma ORM.

## Features

- **Express.js** - Fast, unopinionated web framework
- **GraphQL** - Query language for APIs with express-graphql
- **PostgreSQL** - Robust, open-source database
- **Prisma ORM** - Type-safe database client
- **TypeScript** - Type-safe JavaScript
- **Security** - Helmet, CORS, rate limiting, XSS protection
- **Testing** - Vitest for unit and integration tests
- **Development** - Hot reload with tsx

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your database URL:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
   PORT=4000
   NODE_ENV=development
   ```

3. **Set up the database:**
   ```bash
   # Generate Prisma client
   pnpm db:generate
   
   # Push schema to database
   pnpm db:push
   
   # Or run migrations
   pnpm db:migrate
   ```

4. **Start development server:**
   ```bash
   pnpm dev
   ```

5. **Access GraphiQL interface:**
   Open http://localhost:4000/graphql in your browser

## Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage
- `pnpm lint` - Run ESLint
- `pnpm check-types` - Run TypeScript type checking

## Database Scripts

- `pnpm db:generate` - Generate Prisma client
- `pnpm db:push` - Push schema to database
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Prisma Studio

## GraphQL Schema

The template includes a basic GraphQL schema with:

- **Queries:**
  - `hello` - Simple hello world query
  - `users` - Get all users
  - `user(id: ID!)` - Get user by ID

- **Mutations:**
  - `createUser(name: String!, email: String!)` - Create a new user
  - `updateUser(id: ID!, name: String, email: String)` - Update user
  - `deleteUser(id: ID!)` - Delete user

## Example Queries

### Get all users
```graphql
query {
  users {
    id
    name
    email
    createdAt
    updatedAt
  }
}
```

### Create a user
```graphql
mutation {
  createUser(name: "John Doe", email: "john@example.com") {
    id
    name
    email
    createdAt
    updatedAt
  }
}
```

### Get user by ID
```graphql
query {
  user(id: "1") {
    id
    name
    email
    createdAt
    updatedAt
  }
}
```

## Security Features

- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - Prevent abuse
- **XSS Protection** - Prevent cross-site scripting
- **HTTP Parameter Pollution Protection** - Prevent HPP attacks
- **Request ID Tracking** - Trace requests

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `NODE_ENV` | Environment | `development` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |

## Project Structure

```
src/
├── index.ts              # Main application entry point
├── middleware/           # Express middleware
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── handlers/            # Request handlers
└── routes/              # Express routes (if needed)
```

## Testing

The template includes Vitest for testing:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Production Deployment

1. **Build the application:**
   ```bash
   pnpm build
   ```

2. **Set environment variables for production**

3. **Start the server:**
   ```bash
   pnpm start
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This template is part of the monorepo and follows the same license terms. 