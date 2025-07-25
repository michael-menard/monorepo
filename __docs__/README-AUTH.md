# Auth Development Quick Reference

## 🚀 Quick Start

```bash
# Test the setup
pnpm auth:test-setup

# Start everything
pnpm auth:start

# Stop everything
pnpm auth:stop-all
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `pnpm auth:test-setup` | Test if the setup is working correctly |
| `pnpm auth:start` | Start database, backend, and frontend |
| `pnpm auth:stop-all` | Stop all services and clean up |
| `pnpm auth:db:up` | Start only the database |
| `pnpm auth:db:down` | Stop only the database |
| `pnpm auth:db:logs` | View database logs |
| `pnpm auth:backend` | Start only the backend |
| `pnpm auth:ui` | Start only the frontend |
| `pnpm auth:dev` | Start backend and frontend concurrently |

## 🌐 Services

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **MongoDB**: mongodb://localhost:27017
- **Mongo Express**: http://localhost:8081

## 📖 Full Documentation

See `AUTH-DEV-SETUP.md` for detailed setup instructions and troubleshooting.

## 🔧 Prerequisites

- Docker (running)
- Node.js 18+
- pnpm

## 🐛 Troubleshooting

If you encounter issues:

1. **Docker not running**: Start Docker Desktop
2. **Port conflicts**: Check if ports 27017, 8081, 5000, 5173 are in use
3. **Database connection**: Wait 5-10 seconds after starting database before starting backend
4. **Process cleanup**: Use `pnpm auth:stop-all` to properly clean up all processes 