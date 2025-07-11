import express from 'express'
import { graphqlHTTP } from 'express-graphql'
import { buildSchema } from 'graphql'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import xss from 'xss-clean'
import hpp from 'hpp'
import morgan from 'morgan'
import compression from 'compression'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}))

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)

// Prevent XSS attacks
app.use(xss())

// Prevent HTTP Parameter Pollution
app.use(hpp())

// Compression middleware
app.use(compression())

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }))

// Cookie parser
app.use(cookieParser())

// Logging middleware
app.use(morgan('combined', {
  skip: (req, res) => res.statusCode < 400,
}))

// Request ID middleware
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  req.id = uuidv4()
  res.setHeader('X-Request-ID', req.id)
  next()
})

// GraphQL Schema
const schema = buildSchema(`
  type Query {
    hello: String
    users: [User]
    user(id: ID!): User
  }

  type Mutation {
    createUser(name: String!, email: String!): User
    updateUser(id: ID!, name: String, email: String): User
    deleteUser(id: ID!): Boolean
  }

  type User {
    id: ID!
    name: String!
    email: String!
    createdAt: String!
    updatedAt: String!
  }
`)

// GraphQL Root Resolver
// Note: To use Prisma resolvers, uncomment the import and replace this root object
// import { userResolvers } from './utils/prisma'

const root = {
  hello: () => 'Hello world!',
  users: async () => {
    // TODO: Implement with Prisma
    // Replace with: return userResolvers.users()
    return [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
  },
  user: async ({ id }: { id: string }) => {
    // TODO: Implement with Prisma
    // Replace with: return userResolvers.user({ id })
    return {
      id,
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
  createUser: async ({ name, email }: { name: string; email: string }) => {
    // TODO: Implement with Prisma
    // Replace with: return userResolvers.createUser({ name, email })
    return {
      id: '1',
      name,
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
  updateUser: async ({ id, name, email }: { id: string; name?: string; email?: string }) => {
    // TODO: Implement with Prisma
    // Replace with: return userResolvers.updateUser({ id, name, email })
    return {
      id,
      name: name || 'John Doe',
      email: email || 'john@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
  deleteUser: async ({ id }: { id: string }) => {
    // TODO: Implement with Prisma
    // Replace with: return userResolvers.deleteUser({ id })
    return true
  },
}

// GraphQL endpoint
app.use('/graphql', graphqlHTTP({
  schema,
  rootValue: root,
  graphiql: true, // Enable GraphiQL interface for development
  customFormatErrorFn: (error) => {
    console.error('GraphQL Error:', error)
    return {
      message: error.message,
      locations: error.locations,
      path: error.path,
    }
  },
}))

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    graphqlEndpoint: '/graphql',
  })
})

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  })
})

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    message: 'Route not found',
  })
})

app.listen(PORT, () => {
  console.log(`🚀 GraphQL Server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`🔍 GraphiQL interface: http://localhost:${PORT}/graphql`)
})

export default app 