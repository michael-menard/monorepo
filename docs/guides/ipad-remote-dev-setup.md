# iPad Remote Development Setup

SSH into your Mac Studio from an iPad using Termius over Tailscale.

## Prerequisites

- Tailscale installed on both devices (already done)
- Termius installed on iPad
- macOS Remote Login enabled

## Tailscale Devices

| Device                  | Tailscale IP    |
| ----------------------- | --------------- |
| Mac Studio              | `100.85.133.32` |
| iPad Pro 12.9 (6th gen) | `100.125.93.37` |

## Step 1: Enable Remote Login (SSH) on Mac

```bash
sudo systemsetup -setremotelogin on
```

To verify:

```bash
sudo systemsetup -getremotelogin
```

You can also enable this via **System Settings > General > Sharing > Remote Login**.

## Step 2: Bring Tailscale Online on iPad

Open the Tailscale app on your iPad and ensure it shows as connected. The Mac Studio should appear in your device list.

## Step 3: Configure Termius on iPad

1. Open Termius
2. Tap **+** to create a new host
3. Fill in:
   - **Alias**: Mac Studio
   - **Hostname**: `100.85.133.32`
   - **Port**: `22`
   - **Username**: `michaelmenard`
   - **Password**: your macOS login password (or use SSH key — see below)
4. Save and tap to connect

## Step 4 (Recommended): Set Up SSH Key Authentication

Using an SSH key avoids typing your password every time.

### Generate a key in Termius

1. Go to **Keychain** in Termius
2. Tap **+** > **Generate Key**
3. Choose **ED25519** (recommended) or RSA 4096
4. Name it (e.g., `ipad-pro`)
5. Export/copy the **public key**

### Add the public key to your Mac

From an existing terminal session on the Mac:

```bash
# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh && chmod 700 ~/.ssh

# Append the public key (paste the key from Termius)
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Link the key in Termius

1. Edit your Mac Studio host entry
2. Under authentication, select the key you generated instead of password
3. Save and reconnect

## Step 5: Working with Claude Code

Once connected via SSH, you can run Claude Code from the terminal:

```bash
cd ~/Development/monorepo
claude
```

### Useful shell aliases

Add these to `~/.zshrc` on the Mac for quick access:

```bash
alias dev="cd ~/Development/monorepo && pnpm dev"
alias cc="cd ~/Development/monorepo && claude"
```

## Troubleshooting

### Connection refused

- Verify Remote Login is enabled: `sudo systemsetup -getremotelogin`
- Check SSH is listening: `sudo lsof -i :22`

### Connection timeout

- Ensure Tailscale is active on **both** devices
- Check Tailscale status: `tailscale status`
- Try pinging from iPad terminal in Termius: `ping 100.85.133.32`

### Permission denied (publickey)

- Verify `~/.ssh/authorized_keys` has correct permissions (`600`)
- Verify `~/.ssh` directory has correct permissions (`700`)
- Check the key is selected in Termius host settings

### Tailscale shows device as offline

- Open the Tailscale app on the offline device
- On Mac, check menu bar for Tailscale icon and ensure it's connected
- If Mac Tailscale is not running: `open -a Tailscale`
