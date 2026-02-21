# Environment Variables Encryption with SOPS + Age

This repo uses SOPS (Secrets OPerationS) with age encryption to securely store environment variables in git.

## 🔑 Setup on New Machine

### 1. Install Tools

```bash
brew install sops age
```

### 2. Copy Private Key from Source Machine

On the **source machine** (where you manage env vars):

```bash
cat ~/.config/sops/age/keys.txt
```

On the **new machine** (this machine):

```bash
mkdir -p ~/.config/sops/age
nano ~/.config/sops/age/keys.txt
# Paste the key content and save (Ctrl+O, Ctrl+X)
chmod 600 ~/.config/sops/age/keys.txt
```

**Important:** Keep this private key secure! It's like a master password for all your secrets.

### 3. Decrypt Environment Files

After cloning the repo:

```bash
./scripts/decrypt-env-files.sh
```

This will decrypt all `*.env*.encrypted` files to their original `.env` files.

## 📝 Daily Usage

### On Source Machine (Managing Secrets)

**Edit encrypted env files:**
```bash
# Edit a specific file
sops .env.encrypted

# Or edit any encrypted file directly
sops apps/web/main-app/.env.development.encrypted
```

**Encrypt all env files after manual changes:**
```bash
./scripts/encrypt-env-files.sh
```

**Commit and push:**
```bash
git add **/*.env.encrypted .sops.yaml
git commit -m "chore: update environment variables"
git push
```

### On Consumer Machines (This Machine)

**Pull latest encrypted files:**
```bash
git pull
./scripts/decrypt-env-files.sh
```

## 📂 Files Overview

- `*.env` - Plain text env files (gitignored, never committed)
- `*.env.encrypted` - Encrypted env files (safe to commit)
- `.sops.yaml` - SOPS configuration (public key, safe to commit)
- `~/.config/sops/age/keys.txt` - Private key (NEVER commit)

## 🔒 Encrypted Files in This Repo

The following encrypted files are tracked in git:

- `.env.encrypted`
- `.env.local.encrypted`
- `apps/api/knowledge-base/.env.encrypted`
- `apps/api/lego-api/.env.local.encrypted`
- `apps/web/app-wishlist-gallery/.env.development.encrypted`
- `apps/web/main-app/.env.development.encrypted`
- `apps/web/playwright/.env.encrypted`

Note: `.vercel/.env.development.local` is not tracked because the entire `.vercel/` directory is gitignored (Vercel manages its own environment variables).

## 🚨 Security Best Practices

✅ **DO:**
- Keep `~/.config/sops/age/keys.txt` private and backed up securely
- Commit `.env.encrypted` files
- Use the scripts to encrypt/decrypt

❌ **DON'T:**
- Commit plain `.env` files
- Share your private key in Slack/email
- Edit `.env.encrypted` files manually (use `sops` command)

## 🆘 Troubleshooting

**"Failed to get the data key required to decrypt the SOPS file"**
- You don't have the private key set up correctly
- Check that `~/.config/sops/age/keys.txt` exists and contains the correct key

**"Error: no SOPS file found"**
- Run from the monorepo root directory
- Make sure `.sops.yaml` exists

**Git shows `.env` files as changed**
- This is normal - `.env` files are local only
- Never commit them (they're gitignored)
