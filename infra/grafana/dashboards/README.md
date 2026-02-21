# Grafana Dashboards

## Canonical Location

`infra/grafana/dashboards/` is the canonical location for all Grafana dashboard JSON files.

The previous reference to `apps/telemetry/dashboards/` in `plans/future/platform/telemetry/PLAN.md` has been superseded by this decision (TELE-0010).

## Directory Structure

Subdirectories in this folder are automatically provisioned as Grafana folders via `foldersFromFilesStructure: true` in `infra/grafana/provisioning/dashboards/default.yaml`.

```
infra/grafana/dashboards/
  workflow-telemetry/     # Provisioned as "workflow-telemetry" folder in Grafana
    *.json                # Dashboard JSON files (added by TELE-003)
```

## .gitkeep Files

`.gitkeep` files are used to commit otherwise-empty subdirectories to git. Grafana reads the directory structure on startup to create folders. The `.gitkeep` files have no effect on Grafana behavior.

## Mounting

The dashboards directory is mounted read-only into the Grafana container at `/var/lib/grafana/dashboards` via `infra/compose.lego-app.yaml`:

```yaml
volumes:
  - ./grafana/dashboards:/var/lib/grafana/dashboards:ro
```
