# Alternatives to CSP (Defense-in-Depth Playbook)

There is no single browser feature that fully replaces Content Security Policy (CSP). If you choose to delay or reduce CSP enforcement, use a layered set of controls to mitigate the same classes of risks (XSS, supply-chain tampering, clickjacking, unsafe third‑party content). This document lists practical substitutes and complements, with copy/paste examples.

Related: See SECURITY_CSP_README.md for how CSP is configured and adjusted in this app.


## TL;DR

- CSP is the only browser-enforced, centralized allowlist for all resource types.
- Without CSP, adopt defense-in-depth:
  - Bundle JS/CSS (avoid CDNs); no inline/eval; sanitize any HTML.
  - Use Subresource Integrity (SRI) on any CDN assets you cannot bundle.
  - Isolate third‑party content (iframes + sandbox), and lock down permissions.
  - Apply strict security headers (frame-ancestors, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
  - Centralize network calls with a host allowlist.
  - Use Service Worker cautiously (do not proxy/cache unknown origins).
  - Consider CSP Report-Only to measure risks as you harden.


## 1) Strict Bundling and “No Inline” Policy

- Prefer local bundling of all scripts/styles.
- Forbid inline/eval patterns at the lint/build level.

ESLint suggestions (in your root eslint config):
```js
// eslint.config.js excerpt
import js from '@eslint/js'
import pluginSecurity from 'eslint-plugin-security'

export default [
  js.configs.recommended,
  {
    plugins: { security: pluginSecurity },
    rules: {
      // Ban dynamic code execution
      'no-eval': 'error',
      'no-new-func': 'error',
      // Reduce XSS sinks in React
      'react/no-danger': 'error',
      // Security plugin rules
      'security/detect-eval-with-expression': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-unsafe-regex': 'warn'
    }
  }
]
```

HTML rule of thumb:
- No inline `<script>` tags.
- No inline `<style>` tags.
- No `on*` HTML attributes (onclick, onerror, …).


## 2) Subresource Integrity (SRI) for Any CDN Assets

If you must load a script or stylesheet from a CDN, pin it with SRI to prevent tampering:

```html
<link
  rel="stylesheet"
  href="https://cdn.example.com/library@1.2.3/dist/library.min.css"
  integrity="sha384-BASE64_HASH_FROM_CDN_OR_SRI_TOOL"
  crossorigin="anonymous"
/>

<script
  src="https://cdn.example.com/library@1.2.3/dist/library.min.js"
  integrity="sha384-BASE64_HASH_FROM_CDN_OR_SRI_TOOL"
  crossorigin="anonymous">
</script>
```

Notes:
- When the file changes, the integrity hash must be updated or the browser will refuse to load it.
- Prefer bundling to avoid CDNs altogether.


## 3) Output Encoding and Safe HTML Sanitization

React escapes by default. If you must inject HTML (e.g., CMS content), sanitize it:

```tsx
import DOMPurify from 'dompurify'

type Props = { html: string }

export function SafeHtml({ html }: Props) {
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    // Optional hardening
    ALLOW_UNKNOWN_PROTOCOLS: false,
    ADD_ATTR: ['target'], // if you need specific attrs
  })
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
```

Rules:
- Avoid `dangerouslySetInnerHTML` unless sanitized first.
- Disable or validate risky URLs (javascript:, data: without need).


## 4) Third‑Party Isolation with Iframes

Wrap untrusted/third‑party widgets in an `<iframe>` with a strict sandbox:

```html
<iframe
  src="https://widgets.partner.com/embed"
  sandbox="allow-scripts allow-forms"  <!-- add only the minimal capabilities needed -->
  referrerpolicy="no-referrer"
  allow="geolocation 'none'; microphone 'none'; camera 'none'">
</iframe>
```

- Omit `allow-same-origin` unless absolutely necessary (it disables most sandboxing).
- Only add the permissions needed in `sandbox` and `allow` (Permissions Policy).


## 5) Security Headers (Non-CSP) You Should Still Set

Even without CSP, configure these headers at your reverse proxy or static host:

- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin (or stricter)
- Permissions-Policy: disable unneeded APIs, e.g. `camera=(), microphone=(), geolocation=()`
- Frame protection:
  - Preferred: `Content-Security-Policy: frame-ancestors 'none'` (blocks clickjacking)
  - Legacy fallback: `X-Frame-Options: DENY`

Example (Express middleware):
```ts
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  // If not using CSP, at least use X-Frame-Options:
  res.setHeader('X-Frame-Options', 'DENY')
  next()
})
```


## 6) Cross-Origin Isolation and CORP/COOP/COEP

For advanced isolation and to protect against certain cross-origin leaks:

- Cross-Origin-Opener-Policy: same-origin
- Cross-Origin-Embedder-Policy: require-corp
- Cross-Origin-Resource-Policy: same-origin (or resource-specific)

Example:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```

These do not replace CSP, but reduce attack surface for certain classes of vulnerabilities and enable powerful features (e.g., SharedArrayBuffer).


## 7) Centralized Network Client with Allowlist

Create a fetch wrapper that only allows requests to approved hosts:

```ts
const ALLOWED_HOSTS = new Set([
  self.location.origin,                    // same-origin
  'https://api.example.com',               // explicit external API
  // add more as needed
])

export async function safeFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === 'string' ? new URL(input, self.location.origin) :
             input instanceof URL ? input : new URL(input.url)

  const origin = `${url.protocol}//${url.host}`
  if (!ALLOWED_HOSTS.has(origin)) {
    throw new Error(`Blocked fetch to disallowed origin: ${origin}`)
  }
  return fetch(url.toString(), init)
}
```

- Use this wrapper instead of raw `fetch` across the app.
- For RTK Query, plug the wrapper into your `baseQuery` implementation.


## 8) Service Worker Guardrails

If you use a Service Worker (PWA), avoid proxying or caching unknown origins:

```ts
// In your Workbox routes/config:
workbox.routing.registerRoute(
  ({ url }) => ['https://api.example.com', self.location.origin].includes(url.origin),
  new workbox.strategies.NetworkFirst({ cacheName: 'api-cache' })
)
// Do NOT register broad handlers like /^https:\/\// unless strictly needed
```

- Keep runtime caching origin-scoped.
- Do not import scripts from unknown origins in SW.


## 9) CSP Report-Only Mode (Observation Without Blocking)

If you’re not ready to enforce CSP, run it in Report-Only to collect telemetry:

```html
<!-- Example meta (header is preferred for production) -->
<meta http-equiv="Content-Security-Policy-Report-Only"
      content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:;
               connect-src 'self'; report-to csp-endpoint;">
<meta http-equiv="Report-To"
      content='{"group":"csp-endpoint","max_age":10886400,"endpoints":[{"url":"https://reports.example.com/csp"}]}'>
```

Or via header (preferred):
```
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self'; report-uri https://reports.example.com/csp
```

Use this to see what would break, then gradually fix and move to enforcement.


## 10) Rollout Plan Without Immediate CSP

1) Enforce bundling/no-inline via lint + code review.
2) Replace CDN assets with bundled versions; where impossible, add SRI.
3) Sanitize any HTML; remove unsafe sinks and dynamic script URLs.
4) Isolate third‑party widgets in sandboxed iframes.
5) Apply security headers (Section 5).
6) Add centralized fetch allowlist (Section 7).
7) Tighten Service Worker routes (Section 8).
8) Run CSP in Report-Only for visibility; fix violations incrementally.
9) When clean, consider enabling a minimal enforcement CSP (even if not fully strict).


## 11) Risks and Trade-offs

- Without CSP, there’s no browser-level blocklist/allowlist for all resource types.
- SRI protects only the specific CDN files you pin; it does not stop inline/script injection or dynamic URL swaps in your code.
- Sanitization is hard; prefer escaping over trusting HTML.
- Iframe sandboxing can break widgets; grant the minimum capabilities necessary.
- Cross-origin isolation headers may affect integration with other services; test thoroughly.


## References

- SECURITY_CSP_README.md (how CSP is used in this repo)
- MDN: Subresource Integrity
- MDN: Iframe sandbox
- MDN: Permissions Policy
- MDN: COOP / COEP / CORP
- DOMPurify docs
