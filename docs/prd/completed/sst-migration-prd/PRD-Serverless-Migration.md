# Product Requirements Document: Serverless Architecture Migration

## 📋 **Document Information**
- **Version**: 1.0
- **Date**: December 27, 2024
- **Author**: Development Team
- **Status**: Draft
- **Project**: LEGO MOC Instructions Platform - Serverless Migration

---

## 🎯 **Executive Summary**

### **Objective**
Migrate the LEGO MOC Instructions platform from containerized Express.js applications to a modern serverless architecture using AWS Lambda, API Gateway, and AppSync within the existing Turborepo monorepo structure.

### **Key Goals**
1. **Eliminate Infrastructure Complexity** - Remove ECS, App Runner, and container management overhead
2. **Improve Developer Experience** - Faster deployments, better debugging, simplified architecture
3. **Enhance Platform Capabilities** - Add real-time features via GraphQL subscriptions
4. **Maintain Turborepo Benefits** - Leverage shared packages, build optimization, and monorepo tooling
5. **Reduce Operational Costs** - Pay-per-request pricing vs. always-on containers

### **Success Metrics**
- **Deployment Time**: < 2 minutes (vs. current 15-20 minutes)
- **Cold Start**: < 1 second for API responses
- **Cost Reduction**: 60%+ reduction in AWS costs
- **Developer Velocity**: 50% faster feature development
- **Zero Infrastructure Incidents** - No more container/ECS issues

---

## 🏗️ **Current State Analysis**

### **Existing Architecture Problems**
1. **Complex Container Management**
   - ECS task definitions, service configurations
   - Load balancer setup and health checks
   - Docker image building and ECR management
   - Security group and IAM role complexity

2. **Deployment Challenges**
   - 15-20 minute deployment times
   - CloudFormation stack failures and rollbacks
   - Container startup issues and debugging difficulties
   - Resource dependency management

3. **Operational Overhead**
   - Always-on containers consuming resources
   - Manual scaling configuration
   - Log aggregation across multiple services
   - Health monitoring and alerting setup

4. **Developer Experience Issues**
   - Slow feedback loops
   - Complex local development setup
   - Difficult debugging of container issues
   - Infrastructure knowledge required for app development

### **Current Services**
1. **Auth Service** (Express.js + MongoDB)
   - User authentication and authorization
   - JWT token management
   - Password reset and email verification
   - Session management

2. **LEGO Projects API** (Express.js + PostgreSQL + Redis + Elasticsearch)
   - MOC project management
   - File upload and gallery features
   - User profiles and avatars
   - Search and filtering capabilities
   - Wishlist management

---

## 🎯 **Target Architecture**

### **Service Architecture**

#### **Auth Service → Lambda + API Gateway (REST)**
**Technology Stack:**
- AWS Lambda (Node.js 20)
- API Gateway REST API
- DocumentDB (MongoDB-compatible)
- AWS Secrets Manager
- CloudWatch Logs

**Rationale for REST:**
- Authentication flows are simple CRUD operations
- No need for real-time features
- Existing frontend integration is REST-based
- Simpler migration path from Express

#### **LEGO API → AppSync + Lambda Resolvers (GraphQL)**
**Technology Stack:**
- AWS AppSync (GraphQL)
- Lambda resolvers (Node.js 20)
- RDS PostgreSQL
- ElastiCache Redis
- OpenSearch (Elasticsearch)
- S3 for file storage
- CloudWatch Logs

**Rationale for GraphQL:**
- Complex data relationships (projects, galleries, wishlists)
- Real-time features (live updates, notifications)
- Flexible querying for different UI needs
- Better mobile/PWA support
- Type safety and code generation

### **Turborepo Integration**
```
apps/
├── api/
│   ├── auth-service-lambda/          # New: Serverless auth
│   │   ├── src/
│   │   │   ├── handlers/             # Lambda function handlers
│   │   │   ├── lib/                  # Business logic
│   │   │   └── types/                # TypeScript types
│   │   ├── infrastructure/
│   │   │   └── cdk/                  # CDK stack for Lambda + API Gateway
│   │   ├── __tests__/                # Unit and integration tests
│   │   └── package.json
│   └── lego-api-appsync/             # New: GraphQL API
│       ├── src/
│       │   ├── resolvers/            # Lambda resolvers
│       │   ├── schema.graphql        # GraphQL schema definition
│       │   ├── types/                # Generated TypeScript types
│       │   └── lib/                  # Shared business logic
│       ├── infrastructure/
│       │   └── cdk/                  # CDK stack for AppSync + Lambda
│       ├── __tests__/                # Resolver tests
│       └── package.json
└── web/
    └── lego-moc-instructions-app/
        ├── src/
        │   ├── api/                  # API clients (REST + GraphQL)
        │   ├── graphql/              # Generated queries/mutations
        │   └── hooks/                # React hooks for data fetching
        └── codegen.yml               # GraphQL code generation config
```

---

## 🚀 **Detailed Requirements**

### **Phase 1: Auth Service Migration**

#### **Functional Requirements**
1. **User Authentication**
   - POST /api/auth/register - User registration
   - POST /api/auth/login - User login
   - POST /api/auth/logout - User logout
   - POST /api/auth/refresh - Token refresh
   - GET /api/auth/me - Get current user

2. **Password Management**
   - POST /api/auth/forgot-password - Password reset request
   - POST /api/auth/reset-password - Password reset confirmation
   - POST /api/auth/change-password - Change password (authenticated)

3. **Email Verification**
   - POST /api/auth/verify-email - Email verification
   - POST /api/auth/resend-verification - Resend verification email

#### **Technical Requirements**
- **Lambda Runtime**: Node.js 20.x
- **Memory**: 512 MB (adjustable based on performance)
- **Timeout**: 30 seconds
- **Environment Variables**: Managed via CDK
- **Secrets**: AWS Secrets Manager for DB credentials
- **Logging**: CloudWatch Logs with structured logging
- **Error Handling**: Consistent error responses with proper HTTP status codes

#### **Performance Requirements**
- **Cold Start**: < 1 second
- **Warm Response**: < 200ms
- **Concurrent Executions**: 100 (adjustable)
- **Availability**: 99.9%

### **Phase 2: LEGO API Migration**

#### **GraphQL Schema Requirements**

**Core Types:**
```graphql
type User {
  id: ID!
  email: String!
  username: String!
  avatar: String
  createdAt: AWSDateTime!
  projects: [Project!]!
}

type Project {
  id: ID!
  title: String!
  description: String
  instructions: [Instruction!]!
  gallery: [Image!]!
  author: User!
  likes: Int!
  views: Int!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type Instruction {
  id: ID!
  stepNumber: Int!
  title: String!
  description: String
  image: String
  project: Project!
}

type Image {
  id: ID!
  url: String!
  caption: String
  project: Project!
  uploadedAt: AWSDateTime!
}

type Wishlist {
  id: ID!
  user: User!
  items: [WishlistItem!]!
}

type WishlistItem {
  id: ID!
  partNumber: String!
  partName: String!
  quantity: Int!
  priority: Priority!
  wishlist: Wishlist!
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}
```

**Query Operations:**
```graphql
type Query {
  # Projects
  getProject(id: ID!): Project
  listProjects(filter: ProjectFilter, limit: Int, nextToken: String): ProjectConnection
  searchProjects(query: String!, limit: Int): [Project!]!
  
  # User
  getUser(id: ID!): User
  getCurrentUser: User
  
  # Wishlist
  getWishlist(userId: ID!): Wishlist
}

type Mutation {
  # Projects
  createProject(input: CreateProjectInput!): Project!
  updateProject(id: ID!, input: UpdateProjectInput!): Project!
  deleteProject(id: ID!): Boolean!
  likeProject(id: ID!): Project!
  
  # Instructions
  addInstruction(projectId: ID!, input: InstructionInput!): Instruction!
  updateInstruction(id: ID!, input: InstructionInput!): Instruction!
  deleteInstruction(id: ID!): Boolean!
  
  # Gallery
  uploadImage(projectId: ID!, input: ImageUploadInput!): Image!
  deleteImage(id: ID!): Boolean!
  
  # Wishlist
  addToWishlist(input: WishlistItemInput!): WishlistItem!
  removeFromWishlist(id: ID!): Boolean!
  updateWishlistItem(id: ID!, input: WishlistItemInput!): WishlistItem!
}

type Subscription {
  # Real-time updates
  onProjectLiked(projectId: ID!): Project!
  onProjectUpdated(projectId: ID!): Project!
  onNewProject: Project!
}
```

#### **Real-time Features**
1. **Live Project Updates** - When someone updates a project
2. **Like Notifications** - Real-time like counts
3. **New Project Alerts** - Notify followers of new projects
4. **Comment System** - Real-time comments (future enhancement)

#### **File Upload Strategy**
1. **Direct S3 Upload** - Pre-signed URLs for client-side uploads
2. **Image Processing** - Lambda triggers for thumbnail generation
3. **CDN Distribution** - CloudFront for global image delivery

---

## 🔧 **Technical Implementation**

### **CDK Infrastructure**

#### **Shared Infrastructure** (Existing)
- VPC and networking
- RDS PostgreSQL
- DocumentDB
- ElastiCache Redis
- OpenSearch
- S3 buckets

#### **Auth Service Stack**
```typescript
// Lambda function
const authFunction = new Function(this, 'AuthFunction', {
  runtime: Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: Code.fromAsset('dist'),
  environment: {
    NODE_ENV: 'production',
    DB_HOST: documentDbCluster.clusterEndpoint.hostname,
  },
  vpc: sharedVpc,
  securityGroups: [lambdaSecurityGroup],
})

// API Gateway
const authApi = new RestApi(this, 'AuthApi', {
  restApiName: 'Auth Service API',
  description: 'Authentication and authorization API',
})

authApi.root.addProxy({
  defaultIntegration: new LambdaIntegration(authFunction),
})
```

#### **LEGO API Stack**
```typescript
// AppSync API
const legoApi = new GraphqlApi(this, 'LegoApi', {
  name: 'LEGO Projects API',
  schema: SchemaFile.fromAsset('src/schema.graphql'),
  authorizationConfig: {
    defaultAuthorization: {
      authorizationType: AuthorizationType.API_KEY,
    },
    additionalAuthorizationModes: [{
      authorizationType: AuthorizationType.USER_POOL,
      userPoolConfig: { userPool: cognitoUserPool },
    }],
  },
})

// Lambda resolvers
const projectResolver = new Function(this, 'ProjectResolver', {
  runtime: Runtime.NODEJS_20_X,
  handler: 'project.handler',
  code: Code.fromAsset('dist/resolvers'),
})

legoApi.addLambdaDataSource('ProjectDataSource', projectResolver)
```

### **Turborepo Build Configuration**

#### **turbo.json Updates**
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "deploy:auth": {
      "dependsOn": ["build"],
      "cache": false
    },
    "deploy:lego-api": {
      "dependsOn": ["build"],
      "cache": false
    },
    "codegen": {
      "dependsOn": ["^build"],
      "outputs": ["src/generated/**"]
    }
  }
}
```

#### **Package Scripts**
```json
{
  "scripts": {
    "deploy:auth": "pnpm turbo deploy:auth --filter=auth-service-lambda",
    "deploy:lego-api": "pnpm turbo deploy:lego-api --filter=lego-api-appsync",
    "deploy:all": "pnpm turbo deploy:auth deploy:lego-api",
    "codegen": "pnpm turbo codegen --filter=lego-moc-instructions-app"
  }
}
```

---

## 📊 **Migration Plan**

### **Phase 1: Auth Service (Week 1-2)**
1. **Setup** (2 days)
   - Create `auth-service-lambda` app
   - Setup CDK infrastructure
   - Configure Turborepo integration

2. **Core Migration** (5 days)
   - Convert Express routes to Lambda handlers
   - Implement JWT token management
   - Setup DocumentDB connection
   - Add comprehensive error handling

3. **Testing & Deployment** (3 days)
   - Unit tests for all handlers
   - Integration tests with DocumentDB
   - Load testing
   - Production deployment

### **Phase 2: LEGO API (Week 3-5)**
1. **Schema Design** (3 days)
   - GraphQL schema definition
   - Type generation setup
   - Resolver planning

2. **Core Resolvers** (7 days)
   - Project CRUD operations
   - User management
   - Gallery and file upload
   - Wishlist functionality

3. **Real-time Features** (5 days)
   - Subscription implementations
   - Live update mechanisms
   - Performance optimization

### **Phase 3: Frontend Integration (Week 6)**
1. **Apollo Client Setup** (2 days)
   - GraphQL client configuration
   - Authentication integration
   - Cache configuration

2. **UI Updates** (3 days)
   - Replace REST calls with GraphQL
   - Implement real-time features
   - Update type definitions

### **Phase 4: Migration & Cleanup (Week 7)**
1. **Production Migration** (3 days)
   - Blue-green deployment
   - DNS cutover
   - Monitoring setup

2. **Legacy Cleanup** (2 days)
   - Remove ECS infrastructure
   - Clean up old Docker images
   - Update documentation

---

## 🎯 **Success Criteria**

### **Technical Metrics**
- [ ] All API endpoints respond in < 1 second (cold start)
- [ ] 99.9% uptime for all services
- [ ] Zero infrastructure-related incidents
- [ ] Deployment time < 2 minutes
- [ ] 100% test coverage for Lambda functions

### **Business Metrics**
- [ ] 60%+ reduction in AWS costs
- [ ] 50% faster feature development cycle
- [ ] Zero developer complaints about deployment issues
- [ ] Real-time features working smoothly

### **User Experience**
- [ ] No API downtime during migration
- [ ] All existing features work identically
- [ ] New real-time features enhance UX
- [ ] Mobile/PWA performance improved

---

## ⚠️ **Risks & Mitigation**

### **Technical Risks**
1. **Cold Start Latency**
   - *Risk*: Lambda cold starts affecting user experience
   - *Mitigation*: Provisioned concurrency for critical functions, connection pooling

2. **GraphQL Complexity**
   - *Risk*: Over-fetching or N+1 query problems
   - *Mitigation*: DataLoader pattern, query complexity analysis

3. **Real-time Scaling**
   - *Risk*: AppSync subscription limits
   - *Mitigation*: Connection management, graceful degradation

### **Migration Risks**
1. **Data Migration**
   - *Risk*: Data loss during migration
   - *Mitigation*: Blue-green deployment, comprehensive backups

2. **Frontend Breaking Changes**
   - *Risk*: API changes breaking frontend
   - *Mitigation*: Backward compatibility, gradual migration

### **Operational Risks**
1. **Monitoring Gaps**
   - *Risk*: Reduced visibility into serverless functions
   - *Mitigation*: Comprehensive CloudWatch dashboards, X-Ray tracing

---

## 📈 **Future Enhancements**

### **Phase 5: Advanced Features**
1. **AI-Powered Recommendations** - ML-based project suggestions
2. **Advanced Search** - Vector search with embeddings
3. **Social Features** - Following, comments, community features
4. **Mobile App** - React Native app with offline support
5. **Analytics Dashboard** - User behavior and project analytics

### **Technical Improvements**
1. **Edge Computing** - Lambda@Edge for global performance
2. **Advanced Caching** - Multi-layer caching strategy
3. **Event-Driven Architecture** - EventBridge for service communication
4. **Microservices** - Split into domain-specific services

---

## 💰 **Cost Analysis**

### **Current Costs (Monthly)**
- ECS Fargate: ~$150
- Load Balancers: ~$50
- ECR Storage: ~$20
- **Total**: ~$220/month

### **Projected Costs (Monthly)**
- Lambda Requests: ~$30
- API Gateway: ~$25
- AppSync: ~$35
- **Total**: ~$90/month

### **Cost Savings**
- **Monthly Savings**: $130 (59% reduction)
- **Annual Savings**: $1,560
- **ROI**: 3-month payback period

---

## 📋 **Acceptance Criteria**

### **Must Have**
- [ ] All existing API functionality preserved
- [ ] Zero downtime migration
- [ ] Real-time features working
- [ ] Comprehensive test coverage
- [ ] Production monitoring in place

### **Should Have**
- [ ] 50% improvement in deployment speed
- [ ] GraphQL playground available
- [ ] Automated rollback capability
- [ ] Performance dashboards

### **Could Have**
- [ ] Advanced caching strategies
- [ ] Multi-region deployment
- [ ] Advanced analytics
- [ ] A/B testing framework

---

**This PRD will guide our serverless migration and ensure we build a robust, scalable, and maintainable architecture that eliminates the current infrastructure pain points while adding powerful new capabilities.**
