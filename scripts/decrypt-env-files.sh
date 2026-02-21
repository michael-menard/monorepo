#!/bin/bash
set -e

echo "🔓 Decrypting all .env files..."
echo ""

# Find all encrypted .env files
encrypted_files=$(find . -type f -name "*.env*.encrypted" | grep -v node_modules | grep -v ".git" | sort)

count=0
for encrypted_file in $encrypted_files; do
  # Remove .encrypted suffix to get original filename
  env_file="${encrypted_file%.encrypted}"

  echo "🔓 Decrypting: $encrypted_file -> $env_file"
  sops --decrypt "$encrypted_file" > "$env_file"
  count=$((count + 1))
done

echo ""
echo "✅ Decrypted $count files"
echo ""
echo "⚠️  Remember: .env files are gitignored and should never be committed"
