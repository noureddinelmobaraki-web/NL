# Security Policy — NL Portfolio

## 🌐 Scope

This repository hosts the personal portfolio and music archive of
**Noureddin El Mobaraki (NL)** at:
- https://noureddinelmobaraki-web.github.io/NL/

It is a static SPA (React + Vite) deployed via GitHub Pages.
There is **no backend that processes user data**. The only third-party
service is **EmailJS** (used as a contact-form relay, public keys only).

## 📅 Supported Versions

Only the `main` branch (deployed live) is supported. Older tags are
archives and will not receive security updates.

| Branch | Supported |
|--------|-----------|
| `main` | ✅ Yes    |
| Other  | ❌ No     |

## 🐛 Reporting a Vulnerability

If you believe you have found a security vulnerability, **please do
not open a public issue**.

Instead, report it privately using either of these channels:

1. **Preferred**: GitHub's *Private Vulnerability Reporting*
   → https://github.com/noureddinelmobaraki-web/NL/security/advisories/new
2. **Alternative**: Use the contact form on the website.

Please include:
- A clear description of the issue
- Steps to reproduce (URL, browser, payload if any)
- Potential impact

I will acknowledge within **72 hours** and aim to resolve confirmed
vulnerabilities within **14 days** for high-severity issues.

## 🛡️ Security Measures in Place

- Strict Content-Security-Policy (CSP) header on every page
- `Permissions-Policy` blocks camera/microphone/geolocation
- All external assets served via HTTPS only
- Automated Dependabot updates (weekly)
- Automated CodeQL scans (weekly + on push)
- Trivy filesystem scan on every deploy
- No secrets in client bundles (verified by `verify-build.mjs`)

## 🙏 Thanks

Responsible disclosure is appreciated. Researchers who report valid
vulnerabilities will be credited in this file (with permission).
