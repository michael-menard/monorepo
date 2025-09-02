# Content Security Policy (CSP) Guide for Lego MOC Instructions App

This guide explains:
- What CSP is and why we use it
- Where CSP is configured in this app
- Exactly how to allow external domains (APIs, CDNs, analytics, fonts) in production
- Common examples and copy/paste snippets
- How to verify and troubleshoot CSP issues

Applies to:
- App: apps/web/lego-moc-instructions-app
- Stack: React 19 + Vite 6 + Tailwind v4 + vite-plugin-pwa
- CSP configuration file: apps/web/lego-moc-instructions-app/vite.config.ts


## What is CSP?

Content Security Policy (CSP) is a browser security layer that controls which sources (origins) are allowed to load resources in your page:
- script-src: JavaScript
- style-src: CSS
- img-src: images (including data URLs)
- font-src: webfonts
- connect-src: fetch/XHR/WebSocket endpoints
- media-src: audio/video
- worker-src: web workers/service workers
- frame-src: iframes
- frame-ancestors: who can embed your app in an iframe
- base-uri, form-action, object-src, etc.

By default we use a strict baseline in production: only same-origin ('self') is allowed and no inline/eval scripts/styles. You then opt-in specific external domains by listing them under the appropriate directive(s).


## Where CSP is configured

File: apps/web/lego-moc-instructions-app/vite.config.ts

1) Development (dev server)
- Header is set in `server.headers['Content-Security-Policy']`.
- It is intentionally permissive for local development & Vite HMR:
  - Allows `'unsafe-inline'`, `'unsafe-eval'`, and localhost websockets.
- You generally do NOT need to modify dev CSP.

2) Production (build output)
- A hardened CSP meta tag is injected into built HTML via the custom `security-headers` plugin’s `generateBundle` hook:
  ```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'self'; frame-ancestors 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self'; media-src 'self'; object-src 'none'; frame-src 'none'; worker-src 'self' blob:; form-action 'self'; upgrade-insecure-requests">
  ```
- This is the baseline for production. If you need to allow any external origin, you must explicitly add it here under the relevant directive(s).


## How to allow external domains (step-by-step)

If the app needs to talk to an external origin in production (examples: separate API domain, image CDN, analytics endpoint, webfonts), follow this process:

1) Identify the EXACT domain(s), including scheme:
   - Examples:
     - API: https://api.example.com
     - Image CDN: https://images.examplecdn.com
     - Webfonts: https://fonts.gstatic.com
     - Stylesheets for fonts: https://fonts.googleapis.com
     - Realtime: wss://live.example.com
     - Analytics ingest: https://o123456.ingest.sentry.io

2) Map the resource to the CSP directive:
   - API / fetch / XHR / realtime WS: connect-src
   - Images: img-src
   - Fonts: font-src (and sometimes style-src if loading CSS from a fonts CDN)
   - External scripts (CDN): script-src (avoid when possible; prefer bundling)
   - External stylesheets: style-src (avoid when possible; prefer bundling)
   - Media (audio/video): media-src
   - Third-party iframes: frame-src (and page embedding via frame-ancestors)

3) Edit the production CSP in vite.config.ts:
   - Open: apps/web/lego-moc-instructions-app/vite.config.ts
   - Find the `generateBundle` hook and update the `<meta http-equiv="Content-Security-Policy" ...>` string.
   - Add your external origin(s) to the correct directive(s). Separate multiple origins by spaces.

4) Build and verify:
   - `pnpm -w --filter @repo/lego-moc-instructions-app run build`
   - Serve the dist output or deploy to staging.
   - Open the browser DevTools Console and the "Security" tab to ensure no CSP violations appear.
   - If you see violations, the console will show which directive blocked which URL. Add the precise origin to the relevant directive and rebuild.


## Common scenarios: copy/paste examples

Only edit the PRODUCTION meta tag (in `generateBundle`), not the dev server headers.

Baseline production CSP (current):
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'self'; frame-ancestors 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self'; media-src 'self'; object-src 'none'; frame-src 'none'; worker-src 'self' blob:; form-action 'self'; upgrade-insecure-requests">
```

1) Separate API domain
- Need: SPA at https://app.example.com, API at https://api.example.com
- Change connect-src:
  ```
  connect-src 'self' https://api.example.com;
  ```

2) Image CDN (S3/CloudFront or similar)
- Need: images hosted on https://images.examplecdn.com
- Option A (strict - only your CDN):
  ```
  img-src 'self' data: https://images.examplecdn.com;
  ```
- Option B (broad - allow any HTTPS image):
  ```
  img-src 'self' data: https:;
  ```
  Prefer A for tighter security.

3) Google Fonts (prefer local bundling first)
- If you must use hosted fonts:
  ```
  style-src 'self' https://fonts.googleapis.com;
  font-src  'self' https://fonts.gstatic.com;
  ```

4) Analytics / Error reporting (e.g., Sentry ingest)
- Prefer bundling the SDK (keeps script-src 'self').
- Allow the ingest endpoint in connect-src:
  ```
  connect-src 'self' https://o123456.ingest.sentry.io;
  ```
- Only if loading SDK from CDN (not recommended):
  ```
  script-src 'self' https://browser.sentry-cdn.com;
  ```
  If you do this, use Subresource Integrity (SRI) and pin the version.

5) WebSockets in production
- Need: wss://live.example.com for realtime
  ```
  connect-src 'self' wss://live.example.com;
  ```

6) Third-party widget in an iframe
- Embedded content at https://widgets.partner.com
  ```
  frame-src 'self' https://widgets.partner.com;
  ```
- If the opposite (others embedding your app) must be allowed, adjust `frame-ancestors` (default is `'none'` for clickjacking protection). Only relax if absolutely necessary:
  ```
  frame-ancestors 'self' https://trusted-parent.example.com;
  ```

7) External script (CDN) when bundling is not possible
- Strongly prefer bundling. If you must load from a CDN:
  ```
  script-src 'self' https://cdn.example.com;
  ```
  Consider adding a nonce or using SRI to prevent tampering.

8) External stylesheet (CDN) when bundling is not possible
- Prefer bundling CSS. If necessary:
  ```
  style-src 'self' https://cdn.example.com;
  ```


## Quick checklist when editing CSP

- [ ] Only change the PRODUCTION meta CSP (in `generateBundle`) unless you explicitly need to adjust dev behavior.
- [ ] Add precise origins (scheme + host) to the correct directive(s).
- [ ] Avoid broad patterns like `https:` unless needed; prefer explicit hosts.
- [ ] Keep `script-src 'self'` whenever possible (bundle JS yourself).
- [ ] Keep `style-src 'self'` whenever possible (bundle CSS yourself).
- [ ] If inline scripts/styles are absolutely required, use nonces/hashes instead of `'unsafe-inline'`.
- [ ] Rebuild and verify via DevTools (Console & Security tab).
- [ ] Watch for CSP violations in the console; they tell you what directive blocked which URL.

## About nonces/hashes (inline content)

Our baseline avoids inline scripts/styles entirely in production (best practice), so:
- `script-src 'self'`: only bundled JS, no inline scripts.
- `style-src 'self'`: only bundled CSS, no inline styles.

If you truly need inline content in production:
- Nonces: `script-src 'self' 'nonce-<random>'` and add the same nonce attribute to the inline tag.
- Hashes: `script-src 'self' 'sha256-<hash>'` for a specific inline block.
- This requires server-side templating or a build step to inject nonces/hashes, which is out of scope for this SPA. Prefer avoiding inline content.

## Verifying and troubleshooting

1) Confirm meta tag injection
- After `pnpm -w --filter @repo/lego-moc-instructions-app run build`, open `dist/index.html` and check for the CSP meta tag near `</head>`.

2) Browser DevTools
- Console: CSP violation reports appear if something is blocked.
- Security tab (Chrome): See active security policies and whether they’re delivered by header or meta.

3) Header vs Meta precedence
- If your hosting adds a CSP header, it typically overrides/merges with or supersedes meta. Prefer setting CSP at the reverse proxy level for production if available. If you do that, remove or align the meta policy to avoid conflicts.

4) Service Worker/PWA considerations
- Ensure that service worker scopes and worker-src directives stay compatible (`worker-src 'self' blob:` is already present).
- If your SW fetches from external origins, allow those origins in `connect-src`.

## TL;DR

- Production CSP is strict by default.
- Add external domains explicitly under the correct directive(s) in vite.config.ts (generateBundle meta).
- Rebuild and verify in browser DevTools.
- Prefer bundling scripts/styles over allowing external CDNs.
- Keep policies as narrow as possible for better security.
