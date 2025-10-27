#!/bin/bash
# Quick setup script for lego-moc AWS profile

echo "🔧 Setting up AWS profile for LEGO MOC Monorepo"
echo ""

# Check if profile already exists
if grep -q "\[lego-moc\]" ~/.aws/credentials 2>/dev/null; then
  echo "✅ Profile 'lego-moc' already exists in ~/.aws/credentials"
else
  echo "Creating new profile 'lego-moc' in ~/.aws/credentials"

  # Ensure .aws directory exists
  mkdir -p ~/.aws
  chmod 700 ~/.aws

  # Create or append to credentials file
  touch ~/.aws/credentials
  chmod 600 ~/.aws/credentials

  echo "" >> ~/.aws/credentials
  echo "[lego-moc]" >> ~/.aws/credentials
  echo "aws_access_key_id = YOUR_ACCESS_KEY_ID_HERE" >> ~/.aws/credentials
  echo "aws_secret_access_key = YOUR_SECRET_ACCESS_KEY_HERE" >> ~/.aws/credentials

  echo "✅ Profile created. Please edit ~/.aws/credentials and add your keys."
fi

# Check if config exists
if grep -q "\[profile lego-moc\]" ~/.aws/config 2>/dev/null; then
  echo "✅ Profile config already exists in ~/.aws/config"
else
  echo "Adding profile config to ~/.aws/config"

  touch ~/.aws/config
  chmod 600 ~/.aws/config

  echo "" >> ~/.aws/config
  echo "[profile lego-moc]" >> ~/.aws/config
  echo "region = us-east-1" >> ~/.aws/config
  echo "output = json" >> ~/.aws/config

  echo "✅ Profile config created"
fi

echo ""
echo "Next steps:"
echo "1. Edit ~/.aws/credentials and replace YOUR_ACCESS_KEY_ID_HERE with your actual keys"
echo "2. Install direnv: brew install direnv"
echo "3. Add to ~/.zshrc: eval \"\$(direnv hook zsh)\""
echo "4. Reload shell: source ~/.zshrc"
echo "5. Allow direnv: direnv allow"
echo "6. Test: aws sts get-caller-identity --profile lego-moc"
