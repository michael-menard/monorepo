# Grafana Dashboard User Guide

## Overview

This guide provides comprehensive information about the Grafana dashboards for monitoring the LEGO MOC Instructions application infrastructure and performance.

## Dashboard Organization

### Folder Structure

Our dashboards are organized into three main folders:

#### 🏗️ Infrastructure Folder

- **System Health Dashboard** - Monitor Aurora, Redis, OpenSearch, and S3
- Focus: System-level metrics and resource utilization

#### 🚀 Application Folder

- **Lambda Performance Dashboard** - Monitor serverless function performance
- **API Gateway Performance Dashboard** - Monitor API request patterns and latency
- Focus: Application-level performance and business logic

#### 🌐 Frontend Folder

- **CloudFront Performance Dashboard** - Monitor CDN performance and cache efficiency
- Focus: User-facing performance and content delivery

## Dashboard Details

### Lambda Performance Dashboard

**Purpose**: Monitor AWS Lambda function performance and health

**Key Metrics**:

- **Invocations**: Total function invocations by function name
- **Duration Percentiles**: p50, p95, p99 response times
- **Error Rate**: Percentage of failed invocations
- **Throttles**: Function throttling events
- **Cold Starts**: InitDuration metrics for cold start monitoring
- **Concurrent Executions**: Maximum concurrent function executions

**Time Range**: Last 6 hours (configurable)
**Refresh**: Every 1 minute

**Variables**:

- `$stage`: Environment (dev, staging, prod)
- `$function`: Function name filter (multi-select, includes all)

### API Gateway Performance Dashboard

**Purpose**: Monitor API Gateway request patterns, latency, and errors

**Key Metrics**:

- **Request Count**: Total requests by API and method
- **Latency Percentiles**: p50, p95, p99 response times by API and route
- **4xx Error Rate**: Client error percentage by API and method
- **5xx Error Rate**: Server error percentage by API and method
- **Request Count by Route**: Top 10 most requested routes
- **Error Count by Route**: Top error-prone routes

**Time Range**: Last 6 hours (configurable)
**Refresh**: Every 1 minute

**Variables**:

- `$stage`: Environment (dev, staging, prod)
- `$api`: API name filter
- `$method`: HTTP method filter (multi-select, includes all)

### CloudFront Performance Dashboard

**Purpose**: Monitor CDN performance, cache efficiency, and global distribution

**Key Metrics**:

- **Total Requests**: CloudFront request volume over time
- **Cache Hit Ratio**: Percentage of requests served from cache
- **Bytes Downloaded**: Total and by content type
- **Error Rates**: 4xx and 5xx error percentages
- **Edge Location Distribution**: Request distribution by geographic location
- **Origin Response Time**: Latency from origin servers

**Time Range**: Last 24 hours (configurable)
**Refresh**: Every 5 minutes

**Variables**:

- `$stage`: Environment (dev, staging, prod)
- `$distribution`: CloudFront distribution ID filter (multi-select, includes all)

### System Health Dashboard

**Purpose**: Monitor infrastructure components and system health

**Key Metrics**:

- **Aurora Database**: Active connections, CPU utilization, freeable memory
- **ElastiCache Redis**: Memory usage percentage
- **OpenSearch**: Cluster health status
- **S3 Storage**: Bucket sizes and object counts
- **ECS Tasks**: Placeholder for future Phase 4 implementation

**Time Range**: Last 12 hours (configurable)
**Refresh**: Every 2 minutes

**Variables**:

- `$stage`: Environment (dev, staging, prod)

## Navigation Guide

### Accessing Dashboards

1. **Login to Grafana**: Use your AWS SSO credentials
2. **Navigate to Folders**: Use the left sidebar to browse folders
3. **Select Dashboard**: Click on the desired dashboard name
4. **Apply Filters**: Use the variable dropdowns at the top to filter data

### Using Variables

**Stage Selection**: Always start by selecting the appropriate environment (dev, staging, prod)

**Multi-Select Variables**:

- Hold Ctrl/Cmd to select multiple items
- Use "All" to select everything
- Clear selections to reset filters

### Time Range Controls

- **Quick Ranges**: Use preset buttons (Last 1h, Last 6h, Last 24h)
- **Custom Range**: Click the time range picker for custom dates
- **Refresh**: Use the refresh button or enable auto-refresh

### Panel Interactions

- **Zoom**: Click and drag on time series charts to zoom
- **Legend**: Click legend items to show/hide series
- **Tooltip**: Hover over data points for detailed information
- **Full Screen**: Click panel title → View → Full screen

## Alert Thresholds

### Lambda Performance

- **Error Rate**: Warning at 1%, Critical at 5%
- **Duration**: Warning at 1000ms, Critical at 5000ms
- **Throttles**: Warning at 1, Critical at 10

### API Gateway Performance

- **4xx Error Rate**: Warning at 5%, Critical at 10%
- **5xx Error Rate**: Warning at 1%, Critical at 5%
- **Latency**: Warning at 1000ms, Critical at 5000ms

### CloudFront Performance

- **Cache Hit Ratio**: Warning below 70%, Critical below 50%
- **Error Rate**: Warning at 1%, Critical at 5%

### Infrastructure Health

- **Aurora CPU**: Warning at 70%, Critical at 90%
- **Aurora Connections**: Warning at 50, Critical at 100
- **Redis Memory**: Warning at 80%, Critical at 95%

## Troubleshooting Common Issues

### Dashboard Not Loading

1. Check your permissions and role assignments
2. Verify the data source connection to CloudWatch
3. Confirm the stage variable matches your environment

### No Data Showing

1. Verify the time range includes periods with activity
2. Check if the selected filters are too restrictive
3. Confirm CloudWatch metrics are being generated

### Slow Dashboard Performance

1. Reduce the time range for better performance
2. Use more specific filters to limit data volume
3. Check if auto-refresh interval is too aggressive

### Missing Metrics

1. Verify AWS services are deployed and running
2. Check CloudWatch metric generation in AWS console
3. Confirm metric names and dimensions match dashboard queries

## Best Practices

### Performance Optimization

- Use appropriate time ranges for each dashboard type
- Apply filters to reduce data volume
- Avoid excessive auto-refresh rates
- Monitor CloudWatch API usage to stay within limits

### Monitoring Workflow

1. Start with **System Health** for overall infrastructure status
2. Check **Lambda Performance** for function-level issues
3. Review **API Gateway Performance** for request patterns
4. Analyze **CloudFront Performance** for user experience

### Sharing Dashboards

- Use direct dashboard URLs for sharing specific views
- Include time range and variable settings in shared links
- Create snapshots for point-in-time sharing
- Export dashboard JSON for backup or migration

## Support and Maintenance

### Regular Maintenance Tasks

- Review and update alert thresholds quarterly
- Validate dashboard accuracy after infrastructure changes
- Clean up unused variables and panels
- Update documentation when adding new metrics

### Getting Help

- Check the troubleshooting section first
- Review CloudWatch metrics in AWS console
- Contact the Engineering team for dashboard modifications
- Submit feedback for dashboard improvements

## Dashboard URLs

### Direct Access Links

**Production Environment**:

- Lambda Performance: `https://grafana.lego-moc.com/d/lambda-performance`
- API Gateway Performance: `https://grafana.lego-moc.com/d/api-gateway-performance`
- CloudFront Performance: `https://grafana.lego-moc.com/d/cloudfront-performance`
- System Health: `https://grafana.lego-moc.com/d/system-health`

**Development Environment**:

- Lambda Performance: `https://grafana-dev.lego-moc.com/d/lambda-performance`
- API Gateway Performance: `https://grafana-dev.lego-moc.com/d/api-gateway-performance`
- CloudFront Performance: `https://grafana-dev.lego-moc.com/d/cloudfront-performance`
- System Health: `https://grafana-dev.lego-moc.com/d/system-health`

---

**Last Updated**: 2025-11-24
**Version**: 1.0
