---
"@lemonsqueezy/lemonsqueezy.js": minor
---

Add `paginate(fn, params)` async generator that iterates through all pages of any list endpoint automatically. Manages `page.number` internally while forwarding filters, includes, and `page.size` unchanged. Fully type-safe — infers item type and valid params from the list function passed in.
