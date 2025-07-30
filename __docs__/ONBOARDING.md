# Onboarding Guide

Welcome to the project! Follow these steps to get started:

1. **Clone the repository**
   ```sh
   git clone <repo-url>
   cd <repo-dir>
   ```
2. **Install dependencies**
   ```sh
   pnpm install
   ```
3. **Set up environment variables**
   - Copy `.env.example` to `.env` and fill in required values
4. **Run the backend API**
   ```sh
   cd apps/api && pnpm dev
   ```
5. **Run the frontend**
   ```sh
   cd apps/web/lego-moc-instructions-app && pnpm dev
   ```
6. **Run all tests**
   ```sh
   pnpm test:run
   ```
7. **Read the documentation**
   - [ARCHITECTURE.md](ARCHITECTURE.md)
   - [CONTRIBUTING.md](CONTRIBUTING.md)
   - [API Reference](apps/api/lego-projects-api/__docs__/swagger.yaml)

If you have questions, ask in the team chat or open an issue. 