# Monitoring & Observability Guide

This guide outlines the monitoring and observability strategy for the LEGO MOC Instructions monorepo, covering logging, metrics, alerting, health checks, and security monitoring.

## Current Monitoring Infrastructure

### Technology Stack
- **Backend Services**: Node.js/Express with console logging
- **Frontend**: React with browser console logging
- **Database**: MongoDB with built-in logging
- **Search**: Elasticsearch with health monitoring
- **Containerization**: Docker Compose for local development
- **Security**: Rate limiting and security event logging

### Service Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Auth Service  │    │  LEGO Projects  │
│   (React)       │    │   (Express)     │    │   API (Express) │
│                 │    │                 │    │                 │
│ • Console logs  │    │ • Security logs │    │ • Security logs │
│ • Error tracking│    │ • Rate limiting │    │ • Rate limiting │
│ • Performance   │    │ • Health checks │    │ • Health checks │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Infrastructure │
                    │                 │
                    │ • MongoDB       │
                    │ • Elasticsearch │
                    │ • Docker        │
                    └─────────────────┘
```

## Logging Strategy

### Current Logging Implementation

#### Backend Services
```typescript
// Security logging in middleware
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, url, ip } = req;
    const { statusCode } = res;
    
    // Log security-relevant events
    if (statusCode >= 400) {
      console.warn(`[SECURITY] ${method} ${url} from ${ip} - ${statusCode} (${duration}ms)`);
    }
    
    // Log suspicious activities
    if (statusCode === 403 || statusCode === 429) {
      console.error(`[SECURITY ALERT] Suspicious activity detected: ${method} ${url} from ${ip} - ${statusCode}`);
    }
  });

  next();
};
```

#### Elasticsearch Monitoring
```typescript
// Elasticsearch health monitoring
(async () => {
  try {
    const health = await esClient.cluster.health();
    console.log('Elasticsearch cluster health:', health.status);
  } catch (err: any) {
    console.warn('Elasticsearch not available:', err.message);
  }
})();

// Indexing operations with error logging
export async function indexMoc(moc: any) {
  try {
    await esClient.index({
      index: MOC_INDEX,
      id: moc.id,
      document: { ...moc, type: 'moc' },
    });
  } catch (err: any) {
    console.warn('Failed to index MOC in ES:', err.message);
  }
}
```

#### Frontend Logging
```typescript
// Main application logging
console.log('Server running on port ${PORT}');

// Error handling in components
if (isError) {
  console.error('Login failed:', error);
  // Handle error in UI
}
```

### Logging Best Practices

#### Structured Logging
```typescript
// Recommended logging format
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  component: string;
  message: string;
  metadata?: Record<string, any>;
  userId?: string;
  requestId?: string;
}

// Example structured log
const logEntry: LogEntry = {
  timestamp: new Date().toISOString(),
  level: 'warn',
  service: 'auth-service',
  component: 'security-middleware',
  message: 'Rate limit exceeded',
  metadata: {
    ip: req.ip,
    endpoint: req.path,
    userAgent: req.get('User-Agent'),
  },
  userId: req.user?.id,
  requestId: req.headers['x-request-id'],
};
```

#### Log Levels
- **ERROR**: System errors, security violations, failed operations
- **WARN**: Rate limiting, validation failures, degraded performance
- **INFO**: Successful operations, system state changes
- **DEBUG**: Detailed debugging information (development only)

## Metrics Collection

### Key Performance Indicators (KPIs)

#### Application Metrics
- **Request Rate**: Requests per second by endpoint
- **Response Time**: Average, 95th percentile, 99th percentile
- **Error Rate**: Percentage of failed requests
- **Success Rate**: Percentage of successful operations

#### Business Metrics
- **User Registration**: New user signups per day
- **Authentication**: Login success/failure rates
- **File Uploads**: Upload success rate and file processing time
- **Search Performance**: Elasticsearch query response times
- **API Usage**: Endpoint usage patterns

#### Infrastructure Metrics
- **Database Performance**: MongoDB query times and connection pool usage
- **Search Performance**: Elasticsearch cluster health and indexing rates
- **Memory Usage**: Application memory consumption
- **CPU Usage**: Application CPU utilization
- **Disk I/O**: File upload/download performance

### Metrics Implementation

#### Rate Limiting Metrics
```typescript
// Rate limiting with metrics
export const createRateLimiters = () => {
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Add metrics collection
    handler: (req, res) => {
      console.warn(`[RATE_LIMIT] IP ${req.ip} exceeded rate limit`);
      res.status(429).json({
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      });
    },
  });
  
  return { general: generalLimiter };
};
```

#### Performance Monitoring
```typescript
// Request timing middleware
export const performanceLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, url } = req;
    const { statusCode } = res;
    
    // Log performance metrics
    console.log(`[PERFORMANCE] ${method} ${url} - ${statusCode} (${duration}ms)`);
    
    // Alert on slow requests
    if (duration > 5000) {
      console.warn(`[SLOW_REQUEST] ${method} ${url} took ${duration}ms`);
    }
  });

  next();
};
```

## Health Checks

### Current Health Check Implementation

#### Service Health Endpoints
```typescript
// Basic health check endpoint
app.get('/', (req, res) => {
  res.send('Lego Projects API is running');
});

// Enhanced health check
app.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    const dbStatus = await checkDatabaseHealth();
    
    // Check Elasticsearch connectivity
    const esStatus = await checkElasticsearchHealth();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        elasticsearch: esStatus,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
    
    const isHealthy = dbStatus.status === 'healthy' && esStatus.status === 'healthy';
    res.status(isHealthy ? 200 : 503).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});
```

#### Database Health Check
```typescript
async function checkDatabaseHealth() {
  try {
    // Test database connection
    await mongoose.connection.db.admin().ping();
    return { status: 'healthy', message: 'Database connection successful' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
}
```

#### Elasticsearch Health Check
```typescript
async function checkElasticsearchHealth() {
  try {
    const health = await esClient.cluster.health();
    return { 
      status: health.status === 'green' ? 'healthy' : 'degraded',
      message: `Cluster status: ${health.status}`,
      details: health
    };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
}
```

## Security Monitoring

### Current Security Monitoring

#### Rate Limiting and Security Logging
```typescript
// Security event logging
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, url, ip } = req;
    const { statusCode } = res;
    
    // Log security-relevant events
    if (statusCode >= 400) {
      console.warn(`[SECURITY] ${method} ${url} from ${ip} - ${statusCode} (${duration}ms)`);
    }
    
    // Log suspicious activities
    if (statusCode === 403 || statusCode === 429) {
      console.error(`[SECURITY ALERT] Suspicious activity detected: ${method} ${url} from ${ip} - ${statusCode}`);
    }
  });

  next();
};
```

#### File Upload Security
```typescript
// Virus scanning simulation
export const virusScanFile = async (req: Request, res: Response, next: NextFunction) => {
  const file = req.file;
  
  if (!file) {
    return next();
  }

  try {
    // Simulate virus scanning
    const isClean = await simulateVirusScan(file.buffer);
    
    if (!isClean) {
      console.error(`[SECURITY] Malicious file detected: ${file.originalname} from ${req.ip}`);
      return res.status(400).json({ 
        error: 'File appears to be infected. Upload blocked for security reasons.' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Virus scan error:', error);
    return res.status(500).json({ 
      error: 'Security scan failed. Please try again.' 
    });
  }
};
```

### Security Metrics to Monitor

#### Authentication Security
- **Failed Login Attempts**: Track failed login attempts by IP and user
- **Account Lockouts**: Monitor account lockout events
- **Password Reset Requests**: Track password reset frequency
- **Suspicious IP Activity**: Monitor requests from known malicious IPs

#### API Security
- **Rate Limit Violations**: Track rate limit exceedances
- **Invalid API Keys**: Monitor failed API key validations
- **Malicious File Uploads**: Track blocked file uploads
- **SQL Injection Attempts**: Monitor suspicious database queries

#### General Security
- **HTTP Status Codes**: Monitor 4xx and 5xx error rates
- **Request Patterns**: Track unusual request patterns
- **File Access Patterns**: Monitor file access and download patterns

## Alerting Strategy

### Current Alerting Implementation

#### Console-Based Alerting
```typescript
// Security alerts
if (statusCode === 403 || statusCode === 429) {
  console.error(`[SECURITY ALERT] Suspicious activity detected: ${method} ${url} from ${ip} - ${statusCode}`);
}

// Performance alerts
if (duration > 5000) {
  console.warn(`[SLOW_REQUEST] ${method} ${url} took ${duration}ms`);
}

// Service health alerts
if (health.status !== 'green') {
  console.error(`[HEALTH_ALERT] Elasticsearch cluster status: ${health.status}`);
}
```

### Recommended Alerting Infrastructure

#### Alert Categories
1. **Critical Alerts** (Immediate Response Required)
   - Service down or unreachable
   - Database connection failures
   - Security breaches or suspicious activity
   - High error rates (>5%)

2. **Warning Alerts** (Response Within 1 Hour)
   - High response times (>2 seconds)
   - Elevated error rates (2-5%)
   - Resource usage approaching limits
   - Rate limit violations

3. **Info Alerts** (Monitor and Document)
   - Service restarts
   - Configuration changes
   - Performance degradation trends

#### Alert Channels
- **Email**: For critical alerts and daily summaries
- **Slack**: For real-time team notifications
- **PagerDuty**: For on-call escalations
- **Dashboard**: For visual monitoring and trend analysis

## Monitoring Tools and Infrastructure

### Current Tools
- **Console Logging**: Basic console.log/warn/error
- **Docker Compose**: Container orchestration and health checks
- **MongoDB**: Built-in database monitoring
- **Elasticsearch**: Built-in cluster health monitoring

### Recommended Monitoring Stack

#### Logging Infrastructure
```yaml
# docker-compose.monitoring.yml
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.11.0
    volumes:
      - ./logs:/var/log/app
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml
    depends_on:
      - elasticsearch

volumes:
  es_data:
```

#### Metrics Infrastructure
```yaml
# docker-compose.metrics.yml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  prometheus_data:
  grafana_data:
```

## Implementation Roadmap

### Phase 1: Enhanced Logging (Immediate)
1. **Implement structured logging** across all services
2. **Add request ID tracking** for distributed tracing
3. **Enhance security logging** with detailed metadata
4. **Add performance logging** for slow request detection

### Phase 2: Metrics Collection (Short-term)
1. **Implement Prometheus metrics** for key KPIs
2. **Add custom business metrics** for user activity
3. **Create Grafana dashboards** for visualization
4. **Set up alerting rules** for critical metrics

### Phase 3: Advanced Monitoring (Medium-term)
1. **Implement distributed tracing** with Jaeger
2. **Add synthetic monitoring** for user journey testing
3. **Implement log aggregation** with ELK stack
4. **Add APM (Application Performance Monitoring)**

### Phase 4: Production Readiness (Long-term)
1. **Implement SLA monitoring** and reporting
2. **Add capacity planning** and resource forecasting
3. **Implement automated incident response**
4. **Add compliance monitoring** for security standards

## Best Practices

### Logging Best Practices
- **Use structured logging** with consistent formats
- **Include correlation IDs** for request tracing
- **Log at appropriate levels** (ERROR, WARN, INFO, DEBUG)
- **Avoid logging sensitive data** (passwords, tokens, PII)
- **Use log rotation** to manage storage

### Metrics Best Practices
- **Define clear KPIs** aligned with business goals
- **Use consistent naming** for metrics
- **Set appropriate thresholds** for alerts
- **Monitor trends** not just current values
- **Document metric definitions** and calculations

### Alerting Best Practices
- **Avoid alert fatigue** by setting appropriate thresholds
- **Use escalation policies** for critical alerts
- **Include context** in alert messages
- **Test alerting systems** regularly
- **Document runbooks** for common issues

### Security Monitoring Best Practices
- **Monitor authentication events** closely
- **Track rate limiting violations**
- **Monitor file upload patterns**
- **Review access logs** regularly
- **Implement automated threat detection**

## Troubleshooting

### Common Monitoring Issues
1. **High Log Volume**: Implement log filtering and sampling
2. **Missing Metrics**: Ensure all endpoints expose metrics
3. **False Alerts**: Tune alert thresholds based on historical data
4. **Performance Impact**: Use asynchronous logging and metrics collection

### Debugging Tools
- **Log Analysis**: Use grep, jq, and log analysis tools
- **Metrics Visualization**: Use Grafana for trend analysis
- **Health Checks**: Use curl and monitoring tools
- **Performance Profiling**: Use Node.js profiling tools 