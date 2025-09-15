# Development Rules

**These are critical rules that must be followed by all developers and AI assistants working on this codebase.**

## 🚨 Port Management Rule

**NEVER change configured port numbers in any configuration files, scripts, or code.**

### The Rule:
- If a port conflict occurs during startup, **kill the existing process** on that port
- **DO NOT** change port numbers in:
  - `package.json` scripts
  - Docker compose files
  - Environment variables
  - Application configuration files
  - Startup scripts

### Why This Rule Exists:
- Changing ports breaks deployment configurations
- Creates inconsistencies between development and production
- Causes confusion for other developers
- Breaks CI/CD pipelines that expect specific ports

### How to Handle Port Conflicts:
```bash
# Find what's using the port
lsof -ti:PORT_NUMBER

# Kill the process using the port
lsof -ti:PORT_NUMBER | xargs kill -9

# Examples:
lsof -ti:3000 | xargs kill -9  # Kill whatever is on port 3000
lsof -ti:9000 | xargs kill -9  # Kill whatever is on port 9000
lsof -ti:5432 | xargs kill -9  # Kill whatever is on port 5432
```

### Current Port Assignments:
- **Web App**: 3002
- **Auth API**: 9000  
- **LEGO Projects API**: 5000
- **MongoDB**: 27017
- **PostgreSQL**: 5432
- **Redis**: 6379
- **Elasticsearch**: 9200
- **Mongo Express**: 8081
- **pgAdmin**: 8082

## 🔧 Other Development Rules

### Single Entry Point Rule
- Use only `pnpm dev` or `pnpm start` to start the development environment
- Do not create alternative startup methods
- The `start-full-dev.sh` script is the single source of truth

### Package Management Rule
- Always use package managers (pnpm, npm, etc.) for dependency changes
- Never manually edit package.json, package-lock.json, or pnpm-lock.yaml
- Use `pnpm add`, `pnpm remove`, etc.

---

**⚠️ IMPORTANT: These rules must be followed without exception to maintain system stability and deployment consistency.**
