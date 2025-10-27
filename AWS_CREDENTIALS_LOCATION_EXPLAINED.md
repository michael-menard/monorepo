# AWS Credentials Location - Explained

## Why ~/.aws/credentials Has to Be There (By Default)

The AWS CLI and SDKs follow a **credential chain** in this order:

1. **Environment variables** (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. **Shared credentials file** at `~/.aws/credentials`
3. **Shared config file** at `~/.aws/config`
4. **IAM role** (if running on EC2/ECS/Lambda)
5. **Container credentials** (if running in Docker/ECS)

The location `~/.aws/credentials` is **hardcoded** into AWS CLI and all AWS SDKs as the default location.

## Can You Move It? Yes, But With Changes

You **cannot** move it without making changes, but you **can** override the location using environment variables.

### Option 1: Override Default Location (Requires Changes)

You can tell AWS CLI to look in a different location by setting:

```bash
export AWS_SHARED_CREDENTIALS_FILE=/Users/michaelmenard/Development/Monorepo/.aws/credentials
export AWS_CONFIG_FILE=/Users/michaelmenard/Development/Monorepo/.aws/config
```

This is exactly what we set up in the guide under "Option 3: Project-Local .aws Directory"

### Option 2: Use Named Profiles (What We're Doing - Best Practice)

This is the **recommended approach** and what we've already set up:

**How it works:**
- Credentials stay in `~/.aws/credentials` (standard location)
- Each project uses a different **profile**
- The `.envrc` file automatically selects the right profile

**Benefits:**
- ✅ Works with all AWS tools without modification
- ✅ Multiple projects can each use different profiles
- ✅ No need to override AWS CLI defaults
- ✅ Standard AWS best practice
- ✅ Works in CI/CD environments

**Example:**
```ini
# ~/.aws/credentials
[lego-moc]          # This project
aws_access_key_id = AKIA...
aws_secret_access_key = ...

[other-project]     # Different project
aws_access_key_id = AKIA...
aws_secret_access_key = ...

[personal]          # Personal account
aws_access_key_id = AKIA...
aws_secret_access_key = ...
```

Then each project's `.envrc` sets `export AWS_PROFILE=lego-moc`

## What If You Really Want Project-Local Credentials?

If you absolutely want credentials **inside the monorepo**, here's how:

### Setup:

```bash
cd /Users/michaelmenard/Development/Monorepo

# Create project-local .aws directory
mkdir -p .aws
chmod 700 .aws

# Create credentials file
cat > .aws/credentials << 'EOF'
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
EOF

chmod 600 .aws/credentials

# Create config file
cat > .aws/config << 'EOF'
[default]
region = us-east-1
output = json
EOF

chmod 600 .aws/config

# Add to .gitignore
echo ".aws/" >> .gitignore
```

### Update .envrc:

```bash
# LEGO MOC Monorepo - Use project-local .aws directory

export AWS_SHARED_CREDENTIALS_FILE="$(pwd)/.aws/credentials"
export AWS_CONFIG_FILE="$(pwd)/.aws/config"
export AWS_REGION=us-east-1
export CDK_DEFAULT_REGION=us-east-1

# Get account ID automatically
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
export CDK_DEFAULT_ACCOUNT=$AWS_ACCOUNT_ID

echo "✅ LEGO MOC AWS Environment (Project-Local Credentials)"
echo "   Credentials: $(pwd)/.aws/credentials"
echo "   Region: $AWS_REGION"
echo "   Account: $AWS_ACCOUNT_ID"
```

### Trade-offs:

**Pros:**
- ✅ Credentials contained within project
- ✅ Complete isolation per project
- ✅ Easy to see which credentials belong to which project

**Cons:**
- ❌ Doesn't work without setting environment variables
- ❌ Easy to accidentally commit credentials to git
- ❌ Each developer needs separate credential files
- ❌ More complex to manage
- ❌ Breaks if you don't `cd` into the directory first

## Comparison Table

| Approach | Location | Requires .envrc Changes | Standard AWS | Risk of Git Commit |
|----------|----------|------------------------|--------------|-------------------|
| **Named Profiles** (Current) | `~/.aws/credentials` | No | ✅ Yes | ❌ Low |
| **Project-Local** | `./.aws/credentials` | Yes | ❌ No | ⚠️ High |
| **Environment Variables Only** | N/A (in `.envrc`) | Yes | ⚠️ Partial | ⚠️ Medium |

## My Recommendation

**Keep using Named Profiles** (what we have now):

1. **Credentials stay in `~/.aws/credentials`** (standard location)
2. **Each project uses a different profile** via `.envrc`
3. **Works everywhere** - CLI, CDK, SDKs, CI/CD
4. **Safer** - harder to accidentally commit
5. **Simpler** - no environment variable overrides needed

The `.envrc` file already handles everything:

```bash
export AWS_PROFILE=lego-moc  # This is all you need!
```

When you `cd` into the monorepo:
- direnv loads `.envrc`
- `AWS_PROFILE=lego-moc` tells AWS CLI to use the `[lego-moc]` section
- AWS CLI reads `~/.aws/credentials` and finds the right keys
- Everything works automatically

## What About Team Members?

Each team member:
1. Creates their own IAM user in AWS
2. Adds their keys to `~/.aws/credentials` under `[lego-moc]`
3. Uses the same `.envrc` file (which is committed to git)
4. Their credentials stay private in `~/.aws/credentials` (not in git)

**Result**: Same `.envrc` file works for everyone, but each person has their own credentials.

## Bottom Line

**Answer to your question:**
- ❌ Cannot move without changes
- ✅ CAN use project-local credentials with environment variables
- ✅ SHOULD use named profiles (what we have) - it's the best practice

The current setup (named profiles + direnv) gives you project isolation **without** moving credentials files!
