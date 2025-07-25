# Contributing Guide

Thank you for your interest in contributing!

## Code Standards
- Use TypeScript for all code
- Follow existing linting and formatting rules (run `pnpm lint` and `pnpm format`)
- Write tests for all new features and bugfixes
- Use path aliases for imports
- Keep code modular and DRY

## Pull Request Process
1. Fork the repo and create your feature branch (`git checkout -b feature/my-feature`)
2. Make your changes and add tests
3. Run all tests and linters before pushing
4. Open a pull request with a clear description
5. At least one other team member must review and approve
6. Address feedback and merge when approved

## Branching Strategy
- `main` is always deployable
- Use feature branches for new work
- Use descriptive branch names (e.g., `feature/auth-migration`)

## Adding New Apps or Packages
- Place new apps in `apps/` and new packages in `packages/`
- Add a README.md to each new app/package
- Update the root README.md and architecture docs if the structure changes

## Questions?
Open an issue or contact the maintainer. 