# Security Management Guide

This document explains how to manage, monitor, and maintain security in this application, based on the current security hardening implementation.

---

## 1. Security Headers Enforcement

- **Where:** Security headers are injected by Vite (both dev and production) via plugins in `vite.config.base.ts` and each app's `vite.config.ts`.
- **What:**
  - `Content-Security-Policy` (CSP): Restricts sources for scripts, styles, images, etc.
  - `X-Frame-Options`: Prevents clickjacking.
  - `X-Content-Type-Options`: Prevents MIME sniffing.
  - `X-XSS-Protection`: Enables browser XSS filter.
  - `Referrer-Policy`, `Permissions-Policy`: Restrict sensitive browser features.
- **How to verify:**
  - Run `pnpm run security:headers:test` to check headers in dev/prod.
  - Inspect HTTP responses in browser dev tools (Network tab > Response Headers).

---

## 2. Security Linting & Audits

### Linting
- **Run:** `pnpm run security:lint`
- **Config:** Uses `eslint.config.security.js` (strict rules for XSS, prototype pollution, unsafe code, etc.)
- **Scope:** Ignores test, dist, build, and node_modules files.
- **What to fix:**
  - All `error`-level issues must be fixed before merging.
  - Warnings (e.g., `no-console`) should be reviewed and removed from production code.

### Dependency Audits
- **Run:** `pnpm run security:audit` (checks for known vulnerabilities)
- **Fix:** `pnpm run security:fix` (attempts to auto-fix vulnerabilities)
- **Interpret:**
  - Moderate/High/Critical vulnerabilities must be addressed before release.
  - Some issues may be in upstream dependencies; document and track if unfixable.

---

## 3. CI Security Automation

- **Workflow:** `.github/workflows/security.yml`
- **Runs on:** Every PR, push to main/develop, and weekly schedule.
- **Jobs:**
  - Linting, audit, header tests, CodeQL analysis, container scan (Trivy), and security report artifact.
- **Failing builds:**
  - Any security job failure blocks merge.
  - Review the security report artifact for details.

---

## 4. Updating & Tuning Security Rules

- **Headers:**
  - Edit CSP and other headers in `vite.config.base.ts` and app-level `vite.config.ts`.
  - For custom needs (e.g., allowing a CDN), update the relevant directive.
- **Linting Rules:**
  - Edit `eslint.config.security.js` to add/remove rules or adjust severity.
  - To relax a rule, change `'error'` to `'warn'` or remove it.
- **CI Workflow:**
  - Edit `.github/workflows/security.yml` to add new jobs or adjust triggers.

---

## 5. Handling Vulnerabilities

- **When a vulnerability is found:**
  1. Run `pnpm run security:audit` and review the output.
  2. Run `pnpm run security:fix` to auto-fix if possible.
  3. If not fixable, check for upstream patches or workarounds.
  4. Document unresolved issues in the security report or issue tracker.
  5. For critical issues, escalate to the security lead and consider a hotfix.

- **Reporting:**
  - Never disclose vulnerabilities publicly before a fix is released.
  - Use the process in `SECURITY.md` for responsible disclosure.

---

## 6. Best Practices for Developers

- **Always:**
  - Run `pnpm run security:lint` and `pnpm run security:audit` before pushing code.
  - Fix all security lint errors and address audit warnings.
  - Use parameterized queries and sanitize all user input.
  - Avoid `eval`, `new Function`, and direct DOM manipulation.
  - Never commit secrets or credentials.
  - Review security headers after any config change.

- **Before release:**
  - Ensure CI security workflow passes.
  - Review the security report artifact.
  - Confirm all dependencies are up to date and patched.

---

## 7. Further Reading

- [SECURITY.md](../SECURITY.md): Full security policy, best practices, and incident response.
- [Vite Security Docs](https://vitejs.dev/guide/security.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Maintaining strong security is a continuous process.**
- Review this guide regularly.
- Keep dependencies and rules up to date.
- Encourage a security-first mindset in all code reviews and releases.