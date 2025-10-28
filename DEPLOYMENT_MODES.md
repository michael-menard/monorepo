# Deployment Modes Guide

This document explains how to run the LEGO MOC Instructions platform in different deployment modes.

## 🏠 **Local Development Mode** (Default)

Uses Docker containers for all infrastructure services.

### Configuration

```bash
# .env file
USE_AWS_SERVICES=false
NODE_ENV=development

# Database
DATABASE_URL=postgres://postgres:password@localhost:5432/lego_projects
MONGO_URI=mongodb://localhost:27017/auth-app

# Cache & Search
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200
ENABLE_ELASTICSEARCH=false
```

### Start Infrastructure

```bash
# Start all infrastructure services
docker-compose -f docker-compose-dev.yml up -d

# Start applications natively
pnpm dev
```

### Services Running

- **PostgreSQL**: `localhost:5432`
- **MongoDB**: `localhost:27017`
- **Redis**: `localhost:6379`
- **Elasticsearch**: `localhost:9200` (optional)

---

## ☁️ **AWS Development Mode**

Uses AWS managed services with local application development.

### Configuration

```bash
# .env file
USE_AWS_SERVICES=true
NODE_ENV=development

# AWS Database Endpoints (from CDK outputs)
DATABASE_URL=postgres://username:password@rds-endpoint.region.rds.amazonaws.com:5432/lego_projects
MONGODB_URI=mongodb://admin:password@docdb-cluster.cluster-xyz.region.docdb.amazonaws.com:27017/auth-app?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false

# AWS Cache & Search
REDIS_HOST=cache-cluster.abc123.cache.amazonaws.com
REDIS_PORT=6379
OPENSEARCH_DISABLED=true  # Temporarily disabled

# SSL Certificates
MONGODB_TLS_CA_FILE=/opt/certs/rds-ca-2019-root.pem
```

### Setup

```bash
# Deploy shared infrastructure
cd apps/infrastructure/shared-services
npx cdk deploy --all --context environment=dev

# Setup DocumentDB SSL certificate
cd apps/api/auth-service
./scripts/setup-documentdb-ssl.sh

# Start applications locally
pnpm dev
```

### Services Running

- **Applications**: Local development servers
- **Databases**: AWS RDS PostgreSQL + DocumentDB
- **Cache**: AWS ElastiCache Redis
- **Monitoring**: AWS CloudWatch

---

## 🚀 **AWS Production Mode**

Fully deployed on AWS with ECS Fargate.

### Configuration

```bash
# Environment variables set via ECS Task Definition
USE_AWS_SERVICES=true
NODE_ENV=production

# Database connections via Secrets Manager
DATABASE_URL=${SECRET_FROM_SECRETS_MANAGER}
MONGODB_URI=${SECRET_FROM_SECRETS_MANAGER}

# AWS service endpoints
REDIS_HOST=${IMPORTED_FROM_CLOUDFORMATION}
REDIS_PORT=${IMPORTED_FROM_CLOUDFORMATION}
```

### Deployment

```bash
# Deploy shared infrastructure
cd apps/infrastructure/shared-services
npx cdk deploy --all --context environment=production

# Deploy service stacks
cd apps/api/auth-service/infrastructure/aws-cdk
ENVIRONMENT=production npx cdk deploy

cd apps/api/lego-projects-api/infrastructure/aws-cdk
ENVIRONMENT=production npx cdk deploy
```

### Services Running

- **Applications**: ECS Fargate containers
- **Load Balancers**: Application Load Balancers
- **Databases**: Multi-AZ RDS + DocumentDB
- **Cache**: Multi-AZ ElastiCache Redis
- **Monitoring**: CloudWatch + SNS alerts

---

## 🔄 **Switching Between Modes**

### Local → AWS Development

1. Deploy AWS infrastructure:
   ```bash
   cd apps/infrastructure/shared-services
   npx cdk deploy --all --context environment=dev
   ```

2. Update `.env`:
   ```bash
   USE_AWS_SERVICES=true
   # Add AWS endpoints from CDK outputs
   ```

3. Setup SSL certificates:
   ```bash
   cd apps/api/auth-service
   ./scripts/setup-documentdb-ssl.sh
   ```

4. Restart applications:
   ```bash
   pnpm dev
   ```

### AWS Development → Production

1. Deploy production infrastructure:
   ```bash
   cd apps/infrastructure/shared-services
   npx cdk deploy --all --context environment=production
   ```

2. Deploy service stacks:
   ```bash
   # Deploy both service stacks to production
   ENVIRONMENT=production npx cdk deploy --all
   ```

3. Update DNS and monitoring as needed

---

## 🔍 **Troubleshooting**

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT version();"

# Test MongoDB/DocumentDB connection
mongosh "$MONGODB_URI" --eval "db.runCommand({ping: 1})"
```

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
```

### SSL Certificate Issues

```bash
# Verify DocumentDB certificate
openssl x509 -in /opt/certs/rds-ca-2019-root.pem -text -noout
```

### Application Logs

```bash
# Local development
pnpm logs:auth
pnpm logs:lego

# AWS ECS
aws logs tail /ecs/auth-service-dev --follow
aws logs tail /ecs/lego-projects-api-dev --follow
```

---

## 📊 **Cost Comparison**

| Mode | Monthly Cost (Est.) | Use Case |
|------|-------------------|----------|
| Local Development | $0 | Individual development |
| AWS Development | $50-100 | Team development, testing |
| AWS Production | $200-500 | Production workloads |

*Costs vary based on usage, data transfer, and instance sizes.*
