#!/bin/bash
set -e

echo "🔐 Encrypting all .env files..."
echo ""

# Find all .env files (excluding .env.example and .encrypted files)
env_files=$(find . -type f \( -name ".env" -o -name ".env.*" \) ! -name ".env.example" ! -name "*.encrypted" | grep -v node_modules | grep -v ".git" | sort)

count=0
for env_file in $env_files; do
  # Skip if file doesn't exist or is empty
  if [ ! -s "$env_file" ]; then
    echo "⏭️  Skipping empty file: $env_file"
    continue
  fi

  encrypted_file="${env_file}.encrypted"

  echo "🔒 Encrypting: $env_file -> $encrypted_file"
  sops --encrypt "$env_file" > "$encrypted_file"
  count=$((count + 1))
done

echo ""
echo "✅ Encrypted $count files"
echo ""
echo "📋 Next steps:"
echo "  1. Review the encrypted files"
echo "  2. git add **/*.env.encrypted .sops.yaml"
echo "  3. git commit -m 'chore: add encrypted environment files'"
echo "  4. git push"
