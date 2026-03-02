# SonarQube Setup and Usage

This guide covers how to use SonarQube for code quality analysis in the LEGO MOC Instructions Platform monorepo.

## Overview

SonarQube provides continuous inspection of code quality, detecting bugs, code smells, and security vulnerabilities in TypeScript, React, and other technologies used in this monorepo.

## Prerequisites

- Docker Desktop installed and running
- pnpm installed
- At least 4GB of free RAM for SonarQube

## Quick Start

### 1. Start SonarQube Server

```bash
pnpm sonar:up
```

This will start SonarQube and PostgreSQL in Docker containers. The first startup takes 2-3 minutes.

### 2. Access SonarQube Dashboard

Once started, access SonarQube at:
- URL: http://localhost:9001
- Default credentials:
  - Username: `admin`
  - Password: `admin`

**Important:** On first login, you'll be prompted to change the admin password. Make sure to remember this new password.

### 3. Generate Authentication Token

1. Log in to SonarQube
2. Click on your profile (top-right) → My Account → Security
3. Generate a new token with a descriptive name (e.g., "Local Development")
4. Copy the token immediately (it won't be shown again)

### 4. Configure Authentication

Create a `.env` file in the project root (if it doesn't exist) and add:

```bash
SONAR_TOKEN=your_token_here
```

Alternatively, you can pass the token directly:

```bash
sonar-scanner -Dsonar.login=your_token_here
```

### 5. Run Code Analysis

Run tests with coverage first (SonarQube uses this data):

```bash
pnpm sonar:test
```

Then run the SonarQube scan:

```bash
pnpm sonar:scan
```

Or, if using a token directly:

```bash
sonar-scanner -Dsonar.login=your_token_here
```

### 6. View Results

After the scan completes, view results at http://localhost:9001

## Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm sonar:up` | Start SonarQube server (Docker) |
| `pnpm sonar:down` | Stop SonarQube server |
| `pnpm sonar:reset` | Stop SonarQube and remove all data volumes |
| `pnpm sonar:test` | Run tests with coverage report |
| `pnpm sonar:scan` | Run SonarQube code analysis |

## Configuration

### Project Configuration

The main SonarQube configuration is in `sonar-project.properties` at the project root:

- **Project Key:** `lego-moc-instructions-platform`
- **Source Directories:** `apps/`, `packages/`
- **Test Files:** Automatically detected by `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`
- **Exclusions:** `node_modules`, test files, build outputs, `.next`, coverage reports

### Monorepo Coverage

SonarQube is configured to analyze the entire monorepo, including:
- All apps in `apps/`
- All packages in `packages/`
- TypeScript and TSX files
- Test files (for test coverage metrics)

Excluded from analysis:
- `node_modules`
- Build outputs (`dist/`, `build/`, `.next/`)
- Test files (from duplication detection, but included in coverage)
- Generated files

## Integrating with CI/CD

### GitHub Actions Example

```yaml
name: SonarQube Scan

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  sonarqube:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Shallow clones disabled for better analysis

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9.0.0

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests with coverage
        run: pnpm sonar:test

      - name: SonarQube Scan
        uses: sonarsource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
```

## Quality Gates

SonarQube uses "Quality Gates" to define pass/fail criteria. The default quality gate includes:

- **Coverage:** New code should have at least 80% coverage
- **Duplications:** No more than 3% duplicated lines in new code
- **Maintainability:** No new technical debt greater than 5%
- **Reliability:** No new bugs
- **Security:** No new vulnerabilities

You can customize these in the SonarQube UI under Quality Gates.

## Understanding Results

### Code Smells
Issues that don't necessarily cause bugs but make code harder to maintain.

**Common in TypeScript:**
- Unused variables
- Overly complex functions
- Duplicate code blocks

### Bugs
Issues that represent actual or potential runtime errors.

**Common in React:**
- Missing dependencies in useEffect
- Incorrect PropTypes
- State mutation

### Vulnerabilities
Security-related issues that could be exploited.

**Common issues:**
- XSS vulnerabilities
- SQL injection risks
- Insecure dependencies

### Security Hotspots
Security-sensitive code that needs manual review.

**Examples:**
- Cookie handling
- Authentication logic
- File uploads

## Best Practices

1. **Run scans regularly:** Integrate into your development workflow
2. **Fix new issues first:** Focus on "New Code" metrics
3. **Review Security Hotspots:** Manually verify these are properly secured
4. **Maintain coverage:** Keep test coverage above the quality gate threshold
5. **Monitor technical debt:** Track the "Maintainability Rating"

## Troubleshooting

### SonarQube won't start

```bash
# Check Docker is running
docker info

# Check logs
docker compose -f docker-compose.sonarqube.yml logs

# Reset and try again
pnpm sonar:reset
pnpm sonar:up
```

### Scan fails with "Not authorized"

Make sure you've:
1. Generated a token in SonarQube UI
2. Added it to your `.env` file or passed it via `-Dsonar.login`

### No coverage data shown

Run tests with coverage before scanning:

```bash
pnpm sonar:test
pnpm sonar:scan
```

### Out of memory errors

Increase Docker memory allocation:
1. Open Docker Desktop
2. Go to Settings → Resources
3. Increase Memory to at least 4GB

## Advanced Configuration

### Analyzing Specific Projects

To analyze only a specific app or package:

```bash
sonar-scanner \
  -Dsonar.projectKey=main-app \
  -Dsonar.sources=apps/web/main-app \
  -Dsonar.tests=apps/web/main-app
```

### Excluding Additional Files

Edit `sonar-project.properties` and add to `sonar.exclusions`:

```properties
sonar.exclusions=**/node_modules/**,...,**/your-custom-exclusion/**
```

### Custom Quality Profiles

1. Go to Quality Profiles in SonarQube UI
2. Create a new profile or extend an existing one
3. Customize rules to match your team's standards
4. Set it as the default for your project

## Resources

- [SonarQube Documentation](https://docs.sonarqube.org/latest/)
- [SonarQube for TypeScript](https://docs.sonarqube.org/latest/analysis/languages/typescript/)
- [Quality Gates](https://docs.sonarqube.org/latest/user-guide/quality-gates/)
- [SonarScanner CLI](https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/)

## Stopping SonarQube

When you're done analyzing:

```bash
# Stop containers (keeps data)
pnpm sonar:down

# Stop and remove all data
pnpm sonar:reset
```

The SonarQube data persists in Docker volumes, so your project configuration and history are preserved between restarts (unless you use `sonar:reset`).
