---
"@lemonsqueezy/lemonsqueezy.js": minor
---

Add `verifyWebhookSignature(rawBody, secret, signature)` utility to verify incoming Lemon Squeezy webhook payloads using HMAC-SHA256. Uses `crypto.subtle` for broad runtime compatibility and a constant-time comparison to prevent timing attacks.
