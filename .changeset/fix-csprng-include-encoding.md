---
"@lemonsqueezy/lemonsqueezy.js": patch
---

Use `crypto.getRandomValues()` instead of `btoa(Date.now())` in `generateDiscount()` to produce cryptographically random codes rather than predictable timestamp-derived ones. Use `URLSearchParams` in `convertIncludeToQueryString()` for consistent, properly encoded query string building.
