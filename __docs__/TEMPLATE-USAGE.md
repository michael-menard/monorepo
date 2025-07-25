# Template Usage Guide

This guide explains how to use the templates in this monorepo to quickly create new packages and apps.

## Available Templates

### 1. Backend Template (`packages/api/template-backend`)
A complete backend template with:
- PostgreSQL + Prisma ORM
- GraphQL schema for AppSync
- TypeScript configuration
- Zod validation
- Vitest testing
- Environment configuration

### 2. Frontend Template (`packages/web/template-frontend`)
A complete frontend template with:
- TypeScript + Vitest
- Redux Toolkit (RTK)
- Modern development setup
- Testing configuration

## Quick Start: Using the Script

The easiest way to create a new package is using the provided script:

```bash
# Create a new backend package
./scripts/create-package.sh my-backend backend

# Create a new frontend package
./scripts/create-package.sh my-frontend frontend
```

The script will:
1. Copy the appropriate template
2. Update the package name in `package.json`
3. Create a `.env` file from `.env.example`
4. Provide next steps

## Manual Template Usage

### Option 1: Copy Template Directory

```bash
# For backend packages
cp -r packages/api/template-backend packages/api/my-new-backend

# For frontend packages
cp -r packages/web/template-frontend packages/web/my-new-frontend
```

### Option 2: Use as Reference

You can browse the template directories to understand the structure and copy specific files as needed.

## Template Structure

### Backend Template Structure
```
packages/api/template-backend/
├── .env.example          # Environment variables template
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vitest.config.ts      # Test configuration
├── prisma/
│   └── schema.prisma     # Database schema
├── src/
│   ├── schema.graphql    # GraphQL schema
│   ├── schema.test.ts    # Schema tests (co-located)
│   ├── resolvers.ts      # GraphQL resolvers
│   ├── resolvers.test.ts # Resolver tests (co-located)
│   └── index.ts          # Main entry point
└── README.md             # Documentation
```

**Testing Strategy: Co-located Tests**
- Test files are placed next to the files they test
- Makes it easier to find and maintain tests
- Follows modern testing best practices

### Frontend Template Structure
```
packages/web/template-frontend/
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vitest.config.ts      # Test configuration
├── src/
│   ├── store/            # Redux store setup
│   ├── components/       # React components
│   └── __tests__/        # Test files
└── README.md             # Documentation
```

## Post-Creation Steps

After creating a new package from a template:

### For Backend Packages:
1. **Update Environment Variables**:
   ```bash
   cd packages/my-backend
   # Edit .env file with your actual values
   ```

2. **Configure Database**:
   ```bash
   # Update DATABASE_URL in .env
   # Generate Prisma client
   npx prisma generate
   # Push schema to database
   npx prisma db push
   ```

3. **Install Dependencies**:
   ```bash
   pnpm install
   ```

4. **Update Package Configuration**:
   - Update `name` and `description` in `package.json`
   - Customize GraphQL schema in `src/schema.graphql`
   - Add your resolvers in `src/resolvers.ts`

### For Frontend Packages:
1. **Install Dependencies**:
   ```bash
   cd packages/my-frontend
   pnpm install
   ```

2. **Update Package Configuration**:
   - Update `name` and `description` in `package.json`
   - Customize Redux store in `src/store/`
   - Add your components in `src/components/`

## Template Customization

### Adding New Templates

To add a new template type:

1. Create a new template directory: `packages/template-<type>`
2. Update the `create-package.sh` script to include the new type
3. Document the template structure and usage

### Modifying Existing Templates

When modifying templates, consider:
- Keep templates minimal but functional
- Include comprehensive documentation
- Add example code that demonstrates best practices
- Include proper TypeScript configurations
- Add testing setup

## Best Practices

1. **Template Naming**: Use descriptive names like `template-backend`, `template-frontend`, `template-library`

2. **Consistency**: Keep similar structure across templates where possible

3. **Documentation**: Each template should have a comprehensive README

4. **Dependencies**: Use the shared config packages when possible:
   - `@monorepo/typescript-config`
   - `@monorepo/eslint-config`
   - `@monorepo/shared-config`

5. **Testing**: Always include testing setup in templates

6. **Environment**: Include `.env.example` files for configuration

## Troubleshooting

### Common Issues

1. **Package name conflicts**: Ensure the package name doesn't already exist
2. **Dependency issues**: Run `pnpm install` after creating a new package
3. **TypeScript errors**: Check that `tsconfig.json` extends the shared config
4. **Test failures**: Ensure Vitest is properly configured

### Getting Help

- Check the template's README for specific instructions
- Review the `DEPENDENCY-MANAGEMENT.md` for dependency guidelines
- Use the sync script to ensure consistent dependencies across packages 