# Grafana Dashboard Folder Organization

## Overview

This document defines the folder structure and organization for Grafana dashboards in the LEGO MOC Instructions application monitoring system.

## Folder Structure

### Infrastructure Folder

- **Purpose**: System-level monitoring dashboards
- **UID**: `infrastructure-folder`
- **Contains**:
  - System Health Dashboard
  - Aurora Database monitoring
  - ElastiCache Redis monitoring
  - OpenSearch cluster monitoring
  - S3 storage metrics
  - ECS task health (future)

### Application Folder

- **Purpose**: Application-level monitoring dashboards
- **UID**: `application-folder`
- **Contains**:
  - Lambda Performance Dashboard
  - API Gateway Performance Dashboard
  - Application-specific metrics
  - Business logic monitoring

### Frontend Folder

- **Purpose**: User-facing and CDN monitoring dashboards
- **UID**: `frontend-folder`
- **Contains**:
  - CloudFront Performance Dashboard
  - User experience metrics
  - Edge location performance
  - Cache performance metrics

## Permissions

All folders are configured with:

- **Admin Role**: Full administrative access (create, edit, delete dashboards)
- **Viewer Role**: Read-only access to view dashboards and metrics

## Naming Conventions

### Dashboard Names

- Use descriptive names that clearly indicate the service/component being monitored
- Include "Performance" or "Health" to indicate the type of monitoring
- Examples:
  - "Lambda Performance Dashboard"
  - "System Health Dashboard"
  - "CloudFront Performance Dashboard"

### Tags

- Use consistent tags across related dashboards
- Include service type tags (lambda, api-gateway, cloudfront, etc.)
- Include category tags (performance, health, infrastructure, etc.)

## Implementation

The folder structure is defined in `grafana-dashboards/folder-structure.json` and should be applied when provisioning the Grafana workspace.

Each dashboard JSON file should include the appropriate `folderId` or `folderUid` to ensure proper organization.
