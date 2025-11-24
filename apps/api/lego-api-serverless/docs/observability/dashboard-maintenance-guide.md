# Dashboard Maintenance and Update Procedures

## Overview

This guide outlines the procedures for maintaining, updating, and troubleshooting Grafana dashboards in the LEGO MOC Instructions application monitoring system.

## Regular Maintenance Tasks

### Monthly Tasks

#### Dashboard Performance Review

1. **Review Dashboard Load Times**
   - Check dashboard loading performance
   - Identify slow-loading panels
   - Optimize queries if necessary

2. **CloudWatch API Usage Analysis**
   - Monitor CloudWatch API call volume
   - Review costs associated with metric queries
   - Adjust refresh intervals if needed

3. **Alert Threshold Review**
   - Validate current alert thresholds against actual performance
   - Update thresholds based on performance trends
   - Test alert notifications

#### Data Validation

1. **Metric Accuracy Check**
   - Compare dashboard metrics with AWS console
   - Verify data source connections
   - Validate time series data consistency

2. **Variable Functionality**
   - Test all dashboard variables
   - Verify multi-select functionality
   - Check variable dependencies

### Quarterly Tasks

#### Dashboard Content Review

1. **Panel Relevance Assessment**
   - Review each panel for continued relevance
   - Remove unused or redundant panels
   - Add new panels for emerging needs

2. **Documentation Updates**
   - Update user guide with new features
   - Refresh troubleshooting procedures
   - Update dashboard URLs and access information

#### Infrastructure Alignment

1. **Service Changes Integration**
   - Update dashboards for new AWS services
   - Modify queries for infrastructure changes
   - Add monitoring for new application features

## Update Procedures

### Adding New Dashboards

1. **Create Dashboard JSON**

   ```bash
   # Create new dashboard file
   cp template-dashboard.json new-dashboard.json

   # Update dashboard properties
   # - uid: unique identifier
   # - title: descriptive name
   # - folderUid: appropriate folder
   # - tags: relevant tags
   ```

2. **Validate Dashboard**

   ```bash
   # Run validation script
   ./scripts/observability/validate-dashboards.sh
   ```

3. **Test Dashboard**
   - Import dashboard to development environment
   - Verify all panels display data correctly
   - Test variable functionality
   - Validate time ranges and refresh intervals

4. **Deploy Dashboard**

   ```bash
   # Deploy to staging
   ./scripts/observability/deploy-grafana-workspace.sh --stage staging

   # Deploy to production
   ./scripts/observability/deploy-grafana-workspace.sh --stage prod
   ```

### Modifying Existing Dashboards

1. **Backup Current Dashboard**

   ```bash
   # Export current dashboard JSON
   curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
        "$GRAFANA_URL/api/dashboards/uid/$DASHBOARD_UID" > backup.json
   ```

2. **Make Changes**
   - Edit dashboard JSON file
   - Update version number in metadata
   - Document changes in commit message

3. **Validate Changes**

   ```bash
   # Validate JSON syntax and structure
   ./scripts/observability/validate-dashboards.sh
   ```

4. **Test in Development**
   - Deploy to development environment first
   - Verify changes work as expected
   - Test with different time ranges and variables

5. **Deploy to Production**
   - Deploy to staging for final validation
   - Deploy to production during maintenance window
   - Monitor for any issues post-deployment

### Adding New Panels

1. **Panel Configuration**

   ```json
   {
     "id": "unique_panel_id",
     "title": "Descriptive Panel Title",
     "type": "timeseries|stat|table|piechart",
     "targets": [
       {
         "datasource": "CloudWatch-UserMetrics",
         "namespace": "AWS/Service",
         "metricName": "MetricName",
         "dimensions": {
           "DimensionName": "$variable"
         },
         "statistics": ["Average", "Maximum"],
         "period": "300"
       }
     ],
     "fieldConfig": {
       "defaults": {
         "color": {"mode": "palette-classic"},
         "unit": "appropriate_unit",
         "thresholds": {
           "steps": [
             {"color": "green", "value": null},
             {"color": "yellow", "value": warning_threshold},
             {"color": "red", "value": critical_threshold}
           ]
         }
       }
     },
     "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
   }
   ```

2. **Panel Best Practices**
   - Use descriptive titles
   - Set appropriate units
   - Configure meaningful thresholds
   - Optimize grid positioning
   - Add helpful tooltips and legends

## Troubleshooting Procedures

### Dashboard Loading Issues

#### Symptom: Dashboard fails to load

**Diagnosis Steps**:

1. Check Grafana service status
2. Verify data source connectivity
3. Review browser console for errors
4. Check dashboard JSON syntax

**Resolution**:

```bash
# Validate dashboard JSON
jq empty dashboard.json

# Check data source connection
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
     "$GRAFANA_URL/api/datasources"

# Restart Grafana service if needed
sudo systemctl restart grafana-server
```

#### Symptom: Panels show "No data"

**Diagnosis Steps**:

1. Verify time range includes data
2. Check CloudWatch metric availability
3. Validate query syntax
4. Review variable values

**Resolution**:

```bash
# Check CloudWatch metrics
aws cloudwatch list-metrics --namespace AWS/Lambda

# Validate metric query
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T01:00:00Z \
  --period 300 \
  --statistics Sum
```

### Performance Issues

#### Symptom: Slow dashboard loading

**Diagnosis Steps**:

1. Check query complexity
2. Review time range scope
3. Monitor CloudWatch API usage
4. Analyze panel count and refresh rates

**Resolution**:

- Reduce time range for heavy queries
- Increase query periods (300s → 600s)
- Optimize variable queries
- Reduce auto-refresh frequency

#### Symptom: High CloudWatch costs

**Diagnosis Steps**:

1. Review API call patterns
2. Check refresh intervals
3. Analyze query efficiency
4. Monitor concurrent users

**Resolution**:

```bash
# Review CloudWatch usage
aws logs describe-metric-filters
aws cloudwatch get-metric-statistics --namespace AWS/Usage

# Optimize dashboard settings
# - Increase refresh intervals
# - Reduce concurrent queries
# - Implement query caching
```

## Emergency Procedures

### Dashboard Outage Response

1. **Immediate Actions**
   - Check Grafana service status
   - Verify AWS service health
   - Switch to backup monitoring if available

2. **Diagnosis**
   - Review Grafana logs
   - Check data source connectivity
   - Validate AWS permissions

3. **Recovery**
   - Restart services if needed
   - Restore from backup if corrupted
   - Implement temporary monitoring

### Data Source Failures

1. **CloudWatch Connection Issues**

   ```bash
   # Test AWS credentials
   aws sts get-caller-identity

   # Verify CloudWatch permissions
   aws cloudwatch list-metrics --max-items 1

   # Update data source configuration
   curl -X PUT -H "Content-Type: application/json" \
        -H "Authorization: Bearer $GRAFANA_API_KEY" \
        -d @datasource-config.json \
        "$GRAFANA_URL/api/datasources/$DATASOURCE_ID"
   ```

## Backup and Recovery

### Dashboard Backup

```bash
#!/bin/bash
# Backup all dashboards
BACKUP_DIR="backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Export each dashboard
for uid in lambda-performance api-gateway-performance cloudfront-performance system-health; do
  curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
       "$GRAFANA_URL/api/dashboards/uid/$uid" > "$BACKUP_DIR/$uid.json"
done
```

### Dashboard Restore

```bash
#!/bin/bash
# Restore dashboard from backup
DASHBOARD_FILE="$1"

curl -X POST -H "Content-Type: application/json" \
     -H "Authorization: Bearer $GRAFANA_API_KEY" \
     -d @"$DASHBOARD_FILE" \
     "$GRAFANA_URL/api/dashboards/db"
```

## Contact Information

### Support Escalation

- **Level 1**: Engineering Team (dashboard issues, basic troubleshooting)
- **Level 2**: DevOps Team (infrastructure issues, AWS connectivity)
- **Level 3**: Platform Team (Grafana service issues, major outages)

### Emergency Contacts

- **Engineering On-Call**: engineering-oncall@lego-moc.com
- **DevOps Team**: devops@lego-moc.com
- **Platform Team**: platform@lego-moc.com

---

**Last Updated**: 2025-11-24
**Version**: 1.0
