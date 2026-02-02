# Frontend Infrastructure - Simplified Single Environment

This directory contains the SST infrastructure configuration for the frontend application.

## Quick Deploy

Just get the app deployed and working:

### Option 1: Deploy Everything Together (Recommended)

```bash
# From monorepo root - deploys both API and frontend
pnpm run sst:deploy:all
```

### Option 2: Deploy Frontend Only

```bash
# From monorepo root
pnpm run sst:deploy:frontend
```

### Option 3: Deploy from Frontend Directory

```bash
# From frontend directory
cd apps/web/lego-moc-instructions-app
pnpm run sst:deploy
```

## What Gets Deployed

- **S3 Bucket**: Hosts your built React app
- **CloudFront Distribution**: CDN for fast global access
- **No custom domain**: Uses CloudFront's default URL (simple!)

## Configuration

The frontend is configured to connect to your local development API:
- **API**: `http://localhost:9000`
- **Auth**: `http://localhost:9300`
- **WebSocket**: `ws://localhost:9000`

## Remove Everything

If you want to tear it all down:

```bash
# Remove everything
pnpm run sst:remove:all

# Or just frontend
pnpm run sst:remove:frontend
```

## Next Steps

1. **Deploy**: `pnpm run sst:deploy:all`
2. **Get the URL**: SST will show you the CloudFront URL
3. **Test**: Open the URL and see if your app works
4. **Iterate**: Make changes and redeploy as needed

That's it! No complex environments, no custom domains, just get it working first.
