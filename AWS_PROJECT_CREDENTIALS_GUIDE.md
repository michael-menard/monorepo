# AWS Project-Specific Credentials Guide

Guide for managing AWS credentials on a per-project basis instead of globally.

## Table of Contents

1. [Named Profiles (Recommended)](#option-1-named-profiles-recommended)
2. [Environment Variables](#option-2-environment-variables)
3. [Project-Local .aws Directory](#option-3-project-local-aws-directory)
4. [direnv (Auto-Loading)](#option-4-direnv-auto-loading)
5. [AWS Vault (Most Secure)](#option-5-aws-vault-most-secure)

---

## Option 1: Named Profiles (Recommended)

**Best for**: Multiple projects using different AWS accounts
**Pros**: Native AWS CLI support, simple, widely used
**Cons**: Credentials stored in global `~/.aws/` directory

### Setup

Edit `~/.aws/credentials`:

```ini
# Default profile (maybe personal account)
[default]
aws_access_key_id = AKIAXXXXXXXXXXXXX
aws_secret_access_key = xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# LEGO MOC project profile
[lego-moc]
aws_access_key_id = AKIAYYYYYYYYYYYYYY
aws_secret_access_key = yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy

# Other project
[other-project]
aws_access_key_id = AKIAZZZZZZZZZZZZZZ
aws_secret_access_key = zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
```

Edit `~/.aws/config`:

```ini
[default]
region = us-east-1
output = json

[profile lego-moc]
region = us-east-1
output = json

[profile other-project]
region = us-west-2
output = json
```

### Usage

**Option A: Set profile for current shell session:**

```bash
export AWS_PROFILE=lego-moc

# Verify
aws sts get-caller-identity

# Now all AWS commands use this profile
npx cdk deploy
```

**Option B: Set profile per command:**

```bash
aws s3 ls --profile lego-moc
npx cdk deploy --profile lego-moc
```

**Option C: Add to project's `.env` file:**

```bash
# .env (in monorepo root)
AWS_PROFILE=lego-moc
AWS_REGION=us-east-1
```

Then source it:

```bash
source .env
# or
export $(cat .env | xargs)
```

---

## Option 2: Environment Variables

**Best for**: CI/CD, Docker containers, temporary credentials
**Pros**: No credential files, easy to inject
**Cons**: Must set for each shell session

### Setup

Create a project-specific credential file:

```bash
# Create credentials file in monorepo
touch /Users/michaelmenard/Development/Monorepo/.aws-credentials
chmod 600 /Users/michaelmenard/Development/Monorepo/.aws-credentials
```

Add to `.gitignore`:

```bash
echo ".aws-credentials" >> .gitignore
```

Edit `.aws-credentials`:

```bash
# LEGO MOC Project AWS Credentials
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_DEFAULT_REGION="us-east-1"
export AWS_REGION="us-east-1"
export CDK_DEFAULT_ACCOUNT="123456789012"
export CDK_DEFAULT_REGION="us-east-1"
```

### Usage

Load credentials when working on project:

```bash
cd /Users/michaelmenard/Development/Monorepo
source .aws-credentials

# Verify
aws sts get-caller-identity

# Deploy
npx cdk deploy
```

**Add to your shell profile for auto-loading:**

```bash
# Add to ~/.zshrc or ~/.bashrc
alias lego-moc='cd /Users/michaelmenard/Development/Monorepo && source .aws-credentials'
```

Then just type:

```bash
lego-moc  # Auto-loads credentials and changes to project directory
```

---

## Option 3: Project-Local .aws Directory

**Best for**: Complete isolation per project
**Pros**: True project isolation
**Cons**: Requires custom AWS CLI configuration

### Setup

Create project-local `.aws` directory:

```bash
cd /Users/michaelmenard/Development/Monorepo
mkdir -p .aws
chmod 700 .aws
```

Create credentials file:

```bash
cat > .aws/credentials << 'EOF'
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
EOF

chmod 600 .aws/credentials
```

Create config file:

```bash
cat > .aws/config << 'EOF'
[default]
region = us-east-1
output = json
EOF

chmod 600 .aws/config
```

Add to `.gitignore`:

```bash
echo ".aws/" >> .gitignore
```

### Usage

**Option A: Set AWS_CONFIG_FILE and AWS_SHARED_CREDENTIALS_FILE:**

```bash
cd /Users/michaelmenard/Development/Monorepo

export AWS_CONFIG_FILE=$(pwd)/.aws/config
export AWS_SHARED_CREDENTIALS_FILE=$(pwd)/.aws/credentials

# Verify
aws sts get-caller-identity

# Deploy
npx cdk deploy
```

**Option B: Create a wrapper script:**

```bash
# Create script: bin/aws-local.sh
#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

export AWS_CONFIG_FILE="$PROJECT_ROOT/.aws/config"
export AWS_SHARED_CREDENTIALS_FILE="$PROJECT_ROOT/.aws/credentials"

exec "$@"
```

Make it executable:

```bash
chmod +x bin/aws-local.sh
```

Usage:

```bash
./bin/aws-local.sh aws sts get-caller-identity
./bin/aws-local.sh npx cdk deploy
```

---

## Option 4: direnv (Auto-Loading)

**Best for**: Automatic credential loading when entering project directory
**Pros**: Seamless, automatic, per-directory
**Cons**: Requires installing direnv

### Installation

```bash
# macOS
brew install direnv

# Add to ~/.zshrc or ~/.bashrc
eval "$(direnv hook zsh)"   # for zsh
eval "$(direnv hook bash)"  # for bash

# Restart shell
source ~/.zshrc
```

### Setup

Create `.envrc` in monorepo root:

```bash
cd /Users/michaelmenard/Development/Monorepo
touch .envrc
```

Edit `.envrc`:

```bash
# LEGO MOC Project Environment

# Option 1: Use named profile
export AWS_PROFILE=lego-moc

# Option 2: Use direct credentials (less secure, but isolated)
# export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
# export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
# export AWS_DEFAULT_REGION="us-east-1"
# export AWS_REGION="us-east-1"

# CDK-specific
export CDK_DEFAULT_REGION="us-east-1"

# Uncomment to use project-local .aws directory
# export AWS_CONFIG_FILE="$(pwd)/.aws/config"
# export AWS_SHARED_CREDENTIALS_FILE="$(pwd)/.aws/credentials"

echo "✅ Loaded LEGO MOC AWS credentials (profile: $AWS_PROFILE)"
```

Allow direnv to load this file:

```bash
direnv allow
```

### Usage

Automatic! Just `cd` into the directory:

```bash
cd /Users/michaelmenard/Development/Monorepo
# direnv: loading ~/Development/Monorepo/.envrc
# ✅ Loaded LEGO MOC AWS credentials (profile: lego-moc)

aws sts get-caller-identity  # Uses correct credentials automatically

cd ~
# direnv: unloading
# Credentials automatically unloaded!
```

---

## Option 5: AWS Vault (Most Secure)

**Best for**: Maximum security, encrypted credential storage
**Pros**: Credentials encrypted, temporary session tokens, MFA support
**Cons**: More complex setup

### Installation

```bash
# macOS
brew install aws-vault

# Linux
curl -L -o aws-vault https://github.com/99designs/aws-vault/releases/latest/download/aws-vault-linux-amd64
chmod +x aws-vault
sudo mv aws-vault /usr/local/bin/
```

### Setup

Add credentials to vault:

```bash
aws-vault add lego-moc
# Enter Access Key ID: AKIAXXXXX
# Enter Secret Access Key: ******
```

Credentials are now encrypted in your system keychain!

### Usage

```bash
# Execute single command with temporary credentials
aws-vault exec lego-moc -- aws sts get-caller-identity

# Start a shell with temporary credentials
aws-vault exec lego-moc -- bash

# Deploy CDK
aws-vault exec lego-moc -- npx cdk deploy

# With MFA (if configured)
aws-vault exec lego-moc --mfa-token 123456 -- aws s3 ls
```

**Combine with direnv:**

```bash
# .envrc
use aws-vault lego-moc
```

Now credentials auto-load and are temporary/encrypted!

---

## Recommended Setup for This Monorepo

For the LEGO MOC monorepo, I recommend **Option 4 (direnv)** combined with **Option 1 (Named Profiles)**:

### Step 1: Create Named Profile

```bash
# Edit ~/.aws/credentials
nano ~/.aws/credentials
```

Add:

```ini
[lego-moc]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
```

### Step 2: Install direnv

```bash
brew install direnv
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
source ~/.zshrc
```

### Step 3: Create .envrc

```bash
cd /Users/michaelmenard/Development/Monorepo
cat > .envrc << 'EOF'
# LEGO MOC Project - Auto-load AWS profile
export AWS_PROFILE=lego-moc
export AWS_REGION=us-east-1
export CDK_DEFAULT_REGION=us-east-1

# Get account ID automatically
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")

echo "✅ LEGO MOC AWS Environment"
echo "   Profile: $AWS_PROFILE"
echo "   Region: $AWS_REGION"
echo "   Account: $AWS_ACCOUNT_ID"
EOF

direnv allow
```

### Step 4: Test

```bash
cd /Users/michaelmenard/Development/Monorepo
# ✅ LEGO MOC AWS Environment
#    Profile: lego-moc
#    Region: us-east-1
#    Account: 123456789012

aws sts get-caller-identity  # Works automatically!

cd ~  # Credentials unloaded when you leave the directory
```

---

## Comparison Table

| Method | Isolation | Security | Ease of Use | Auto-Load |
|--------|-----------|----------|-------------|-----------|
| Named Profiles | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ |
| Env Variables | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ❌ |
| Project .aws Dir | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ❌ |
| direnv | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ |
| AWS Vault | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ (with direnv) |

---

## Security Best Practices

Regardless of which method you choose:

1. **Always add credential files to `.gitignore`:**
   ```bash
   echo ".aws-credentials" >> .gitignore
   echo ".aws/" >> .gitignore
   echo ".envrc" >> .gitignore  # If it contains secrets
   ```

2. **Use restrictive file permissions:**
   ```bash
   chmod 600 ~/.aws/credentials
   chmod 600 .aws-credentials
   ```

3. **Rotate credentials regularly:**
   ```bash
   # Every 90 days, create new access keys and delete old ones
   ```

4. **Use separate credentials per project/environment**

5. **Never commit credentials to git:**
   ```bash
   git secrets --install  # Prevents accidental commits
   ```

---

## Next Steps

Choose your preferred method, then:

1. Set up credentials using one of the methods above
2. Verify with: `aws sts get-caller-identity`
3. Continue with CDK bootstrap and deployment

Let me know which method you'd like to use!
