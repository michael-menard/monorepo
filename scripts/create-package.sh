#!/bin/bash

# Create Package Script
# Usage: ./scripts/create-package.sh <package-name> <template-type>
# Example: ./scripts/create-package.sh my-backend backend
# Example: ./scripts/create-package.sh my-frontend frontend

set -e

PACKAGE_NAME=$1
TEMPLATE_TYPE=$2

if [ -z "$PACKAGE_NAME" ] || [ -z "$TEMPLATE_TYPE" ]; then
    echo "Usage: $0 <package-name> <template-type>"
    echo "Template types: backend, frontend"
    echo "Example: $0 my-backend backend"
    exit 1
fi

# Validate template type
if [ "$TEMPLATE_TYPE" != "backend" ] && [ "$TEMPLATE_TYPE" != "frontend" ]; then
    echo "Error: Template type must be 'backend' or 'frontend'"
    exit 1
fi

# Check if package already exists
if [ "$TEMPLATE_TYPE" = "backend" ]; then
    if [ -d "packages/api/$PACKAGE_NAME" ]; then
        echo "Error: Package '$PACKAGE_NAME' already exists in packages/api/"
        exit 1
    fi
elif [ "$TEMPLATE_TYPE" = "frontend" ]; then
    if [ -d "packages/web/$PACKAGE_NAME" ]; then
        echo "Error: Package '$PACKAGE_NAME' already exists in packages/web/"
        exit 1
    fi
fi

if [ -d "apps/$PACKAGE_NAME" ]; then
    echo "Error: App '$PACKAGE_NAME' already exists in apps/"
    exit 1
fi

echo "Creating new $TEMPLATE_TYPE package: $PACKAGE_NAME"

# Copy template
if [ "$TEMPLATE_TYPE" = "backend" ]; then
    cp -r packages/api/template-backend packages/api/$PACKAGE_NAME
    # Remove node_modules if it exists
    rm -rf packages/api/$PACKAGE_NAME/node_modules
    echo "✅ Backend template copied to packages/api/$PACKAGE_NAME"
elif [ "$TEMPLATE_TYPE" = "frontend" ]; then
    cp -r packages/web/template-frontend packages/web/$PACKAGE_NAME
    # Remove node_modules if it exists
    rm -rf packages/web/$PACKAGE_NAME/node_modules
    echo "✅ Frontend template copied to packages/web/$PACKAGE_NAME"
fi

# Update package.json
if [ "$TEMPLATE_TYPE" = "backend" ]; then
    cd packages/api/$PACKAGE_NAME
elif [ "$TEMPLATE_TYPE" = "frontend" ]; then
    cd packages/web/$PACKAGE_NAME
fi
sed -i '' "s/template-$TEMPLATE_TYPE/$PACKAGE_NAME/g" package.json

echo "✅ Package name updated in package.json"

# Create .env file from example
if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
    echo "⚠️  Remember to update .env with your actual values"
fi

echo ""
echo "🎉 Package '$PACKAGE_NAME' created successfully!"
echo ""
echo "Next steps:"
if [ "$TEMPLATE_TYPE" = "backend" ]; then
    echo "1. cd packages/api/$PACKAGE_NAME"
elif [ "$TEMPLATE_TYPE" = "frontend" ]; then
    echo "1. cd packages/web/$PACKAGE_NAME"
fi
echo "2. Update .env with your configuration"
echo "3. Run 'pnpm install' to install dependencies"
echo "4. Update package.json name and description"
echo "5. Customize the code for your specific needs"
echo ""
echo "For backend packages:"
echo "- Update DATABASE_URL in .env"
echo "- Run 'npx prisma generate' to generate Prisma client"
echo "- Run 'npx prisma db push' to sync database schema" 