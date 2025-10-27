# AWS Infrastructure Setup Guide

This guide will help you deploy your LEGO MOC Instructions app to AWS using a complete CI/CD pipeline.

## 🏗️ Architecture Overview

Your app will be deployed with the following AWS services:

### **Frontend (React/Vite)**

- **S3**: Static file hosting
- **CloudFront**: Global CDN for fast delivery

### **APIs (Node.js)**

- **ECS Fargate**: Serverless containers for your APIs
- **ECR**: Container registry for Docker images
- **Application Load Balancer**: Routes traffic to your APIs

### **Databases**

- **RDS PostgreSQL**: For LEGO projects data
- **DocumentDB**: MongoDB-compatible for auth service
- **ElastiCache Redis**: For caching
- **OpenSearch**: For full-text search

### **Networking**

- **VPC**: Private network with public/private subnets
- **Security Groups**: Firewall rules
- **NAT Gateway**: Outbound internet for private resources

## 🚀 Setup Steps

### **Step 1: Install AWS CLI and CDK**

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Install AWS CDK
npm install -g aws-cdk

# Verify installations
aws --version
cdk --version
```

### **Step 2: Configure AWS Credentials**

```bash
# Configure AWS credentials (you'll need an AWS account)
aws configure

# Enter your:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (us-east-1 recommended)
# - Default output format (json)
```

### **Step 3: Bootstrap CDK (One-time setup)**

```bash
# Bootstrap CDK in your AWS account
cd infrastructure/aws-cdk
npm install
cdk bootstrap
```

### **Step 4: Deploy Infrastructure**

```bash
# Deploy staging environment
cdk deploy LegoMocStackStaging

# Deploy production environment (when ready)
cdk deploy LegoMocStackProduction
```

### **Step 5: Set Up GitHub Secrets**

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

#### **Required Secrets:**

```
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
DATABASE_URL=postgresql://username:password@host:5432/database
```

#### **Required Variables:**

```
S3_BUCKET_NAME=your-frontend-bucket-name
CLOUDFRONT_DISTRIBUTION_ID=your-cloudfront-id
ECS_CLUSTER_NAME=your-ecs-cluster-name
VITE_API_URL=https://your-api-domain.com
VITE_AUTH_API_URL=https://your-auth-domain.com
```

### **Step 6: Set Up Domain (Optional)**

If you want a custom domain:

1. **Buy domain in Route 53** or transfer existing domain
2. **Update CDK stack** with domain configuration
3. **Deploy with SSL certificate**

## 📋 Environment Configuration

### **Staging Environment**

- Smaller instance sizes
- Single AZ deployment
- 1-day backup retention
- Auto-deletion on stack destroy

### **Production Environment**

- Larger instance sizes
- Multi-AZ deployment
- 7-day backup retention
- Deletion protection enabled

## 🔧 Local Development

Your docker-compose.dev.yml will continue to work for local development:

```bash
# Start local development environment
docker-compose -f docker-compose.dev.yml up

# Your services will be available at:
# - Frontend: http://localhost:5173
# - Auth API: http://localhost:3001
# - LEGO API: http://localhost:3000
# - MongoDB: localhost:27017
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
# - Elasticsearch: localhost:9200
```

## 🚀 Deployment Process

### **Automatic Deployments**

1. **Push to main branch** → Triggers deployment pipeline
2. **GitHub Actions** builds and tests your code
3. **Docker images** are built and pushed to ECR
4. **ECS services** are updated with new images
5. **Frontend** is built and deployed to S3/CloudFront

### **Manual Deployments**

You can also trigger deployments manually:

1. Go to **Actions** tab in GitHub
2. Select **Deploy to AWS** workflow
3. Click **Run workflow**
4. Choose environment (staging/production)

## 📊 Monitoring and Logs

### **CloudWatch Logs**

- ECS container logs are automatically sent to CloudWatch
- Search and filter logs by service

### **Application Load Balancer**

- Health checks ensure your APIs are running
- Automatic failover if containers become unhealthy

### **Database Monitoring**

- RDS and DocumentDB have built-in monitoring
- Performance insights available

## 💰 Cost Estimation

### **Staging Environment (~$50-100/month)**

- ECS Fargate: ~$20-30
- RDS PostgreSQL (t3.micro): ~$15
- DocumentDB (t3.small): ~$25
- ElastiCache Redis (t3.micro): ~$10
- OpenSearch (t3.small): ~$20
- Data transfer & storage: ~$5-10

### **Production Environment (~$200-400/month)**

- ECS Fargate: ~$50-100
- RDS PostgreSQL (t3.medium, Multi-AZ): ~$60
- DocumentDB (t3.medium, 2 instances): ~$100
- ElastiCache Redis (t3.medium): ~$40
- OpenSearch (t3.medium, 2 nodes): ~$80
- Data transfer & storage: ~$20-40

## 🔒 Security Features

- **VPC**: All resources in private network
- **Security Groups**: Restrictive firewall rules
- **Encryption**: At rest and in transit
- **IAM Roles**: Least privilege access
- **Secrets Manager**: Secure credential storage

## 🆘 Troubleshooting

### **Common Issues:**

1. **CDK Bootstrap Error**

   ```bash
   cdk bootstrap --force
   ```

2. **Docker Build Fails**
   - Check Dockerfile paths
   - Ensure all dependencies are installed

3. **ECS Service Won't Start**
   - Check CloudWatch logs
   - Verify environment variables
   - Check security group rules

4. **Database Connection Issues**
   - Verify security group allows connections
   - Check connection strings
   - Ensure services are in same VPC

## 📞 Support

If you run into issues:

1. Check CloudWatch logs first
2. Verify all environment variables are set
3. Ensure security groups allow required traffic
4. Check GitHub Actions logs for deployment issues

## 🎯 Next Steps

Once deployed:

1. **Set up monitoring alerts**
2. **Configure backup schedules**
3. **Set up custom domain**
4. **Add SSL certificate**
5. **Configure auto-scaling**
