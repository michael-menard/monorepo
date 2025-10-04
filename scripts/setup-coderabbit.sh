#!/bin/bash

# CodeRabbit Integration Setup Script
# This script helps complete the CodeRabbit setup for your Auggie-powered monorepo

set -e

echo "🤖 CodeRabbit + Auggie Integration Setup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "__docs__/AUGGIE_RULES.md" ]; then
    print_error "This script must be run from the root of your monorepo"
    exit 1
fi

print_info "Detected monorepo structure ✓"

# Check if Auggie is available
if ! command -v auggie &> /dev/null; then
    print_error "Auggie is not installed or not in PATH"
    print_info "Please install Auggie first: https://docs.augmentcode.com/"
    exit 1
fi

print_status "Auggie is available"

# Verify configuration files exist
echo ""
echo "📋 Checking Configuration Files"
echo "--------------------------------"

if [ -f ".coderabbit.yaml" ]; then
    print_status "CodeRabbit configuration file exists"
else
    print_error "CodeRabbit configuration file missing"
    exit 1
fi

if [ -f ".github/workflows/coderabbit-integration.yml" ]; then
    print_status "GitHub workflow for CodeRabbit integration exists"
else
    print_error "GitHub workflow file missing"
    exit 1
fi

if [ -f "__docs__/AUGGIE_CODERABBIT_INTEGRATION.md" ]; then
    print_status "Integration documentation exists"
else
    print_error "Integration documentation missing"
    exit 1
fi

# Check GitHub repository setup
echo ""
echo "🔗 GitHub Repository Setup"
echo "---------------------------"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "Not in a git repository"
    exit 1
fi

# Get repository information
REPO_URL=$(git config --get remote.origin.url 2>/dev/null || echo "")
if [ -z "$REPO_URL" ]; then
    print_warning "No remote origin found"
else
    print_status "Repository URL: $REPO_URL"
fi

# Check if there are any commits
if ! git rev-parse HEAD >/dev/null 2>&1; then
    print_warning "No commits found - make sure to commit your changes"
else
    print_status "Git repository is ready"
fi

# Validate package.json scripts
echo ""
echo "📦 Package Scripts Validation"
echo "------------------------------"

REQUIRED_SCRIPTS=("lint" "check-types" "test" "security:lint")
for script in "${REQUIRED_SCRIPTS[@]}"; do
    if grep -q "\"$script\":" package.json; then
        print_status "Script '$script' found"
    else
        print_warning "Script '$script' not found - CodeRabbit integration may not work optimally"
    fi
done

# Test Auggie integration
echo ""
echo "🤖 Testing Auggie Integration"
echo "-----------------------------"

print_info "Testing Auggie with project rules..."
if auggie --rules __docs__/AUGGIE_RULES.md --print "Test integration - just respond with 'Integration test successful'" > /dev/null 2>&1; then
    print_status "Auggie integration test passed"
else
    print_warning "Auggie integration test failed - check your Auggie setup"
fi

# Check dependencies
echo ""
echo "📚 Dependencies Check"
echo "--------------------"

if [ -f "pnpm-lock.yaml" ]; then
    print_status "Using pnpm package manager"
    if command -v pnpm &> /dev/null; then
        print_status "pnpm is available"
    else
        print_error "pnpm is not installed"
        exit 1
    fi
elif [ -f "package-lock.json" ]; then
    print_status "Using npm package manager"
elif [ -f "yarn.lock" ]; then
    print_status "Using yarn package manager"
else
    print_warning "No lock file found"
fi

# Generate setup summary
echo ""
echo "📊 Setup Summary"
echo "=================="

cat << EOF

✅ Configuration Files:
   - .coderabbit.yaml (CodeRabbit configuration)
   - .github/workflows/coderabbit-integration.yml (GitHub Actions)
   - __docs__/AUGGIE_CODERABBIT_INTEGRATION.md (Documentation)

✅ Integration Features:
   - Auggie + CodeRabbit collaborative workflow
   - Automated quality gates
   - Pre-commit hooks with CodeRabbit preparation
   - Monorepo-aware configuration

📋 Next Steps:
   1. Visit https://app.coderabbit.ai/login
   2. Login with GitHub and authorize CodeRabbit
   3. Add your repository in CodeRabbit settings
   4. Grant required permissions (read/write access)
   5. Create a test PR to verify integration

🔗 Useful Commands:
   - Test Auggie: auggie --rules __docs__/AUGGIE_RULES.md "test command"
   - Run quality checks: pnpm run lint && pnpm run check-types && pnpm run test
   - Create PR: git push origin feature-branch

📖 Documentation:
   - Integration Guide: __docs__/AUGGIE_CODERABBIT_INTEGRATION.md
   - Auggie Rules: __docs__/AUGGIE_RULES.md
   - CodeRabbit Config: .coderabbit.yaml

EOF

# Final recommendations
echo ""
echo "🎯 Recommendations"
echo "=================="

print_info "1. Commit and push these configuration files to your repository"
print_info "2. Complete CodeRabbit setup at https://app.coderabbit.ai/"
print_info "3. Test the integration with a small PR"
print_info "4. Share the integration guide with your team"

echo ""
print_status "CodeRabbit + Auggie integration setup complete!"
print_info "Happy coding with AI-powered development and review! 🚀"

# Optional: Open documentation
read -p "Would you like to open the integration documentation? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v code &> /dev/null; then
        code __docs__/AUGGIE_CODERABBIT_INTEGRATION.md
    elif command -v open &> /dev/null; then
        open __docs__/AUGGIE_CODERABBIT_INTEGRATION.md
    else
        print_info "Please open __docs__/AUGGIE_CODERABBIT_INTEGRATION.md to read the full guide"
    fi
fi
