# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install          # Install dependencies
bun run build        # Build with tsup (outputs ESM + CJS to dist/)
bun test             # Run all tests
bun test test/<category>/index.test.ts  # Run tests for a specific category
bun run lint         # Run ESLint
bun run lint:fix     # Run ESLint with auto-fix
bun run format       # Run Prettier
bun run typecheck    # TypeScript type check (no emit)
bun run dev          # Watch mode for examples/index.ts
bun run coverage     # Run tests with coverage
```

Tests require environment variables (copy `.env.example` to `.env`):
- `LEMON_SQUEEZY_API_KEY`
- `LEMON_SQUEEZY_STORE_ID`
- `LEMON_SQUEEZY_LICENSE_KEY`

## Architecture

This is the official Lemon Squeezy JavaScript SDK. It wraps the [Lemon Squeezy REST API](https://docs.lemonsqueezy.com/api) and is tree-shakeable — each API resource is its own function.

### Source structure

`src/` is organized by API resource category. Each category folder contains:
- `index.ts` — the exported functions for that resource
- `types.ts` — TypeScript types for that resource

`src/internal/` contains shared infrastructure:
- `setup/` — `lemonSqueezySetup()` stores the API key and error handler in a module-level key-value store
- `fetch/` — `$fetch()` is the internal HTTP client; wraps native `fetch`, injects auth headers, handles JSON:API errors, and calls the `onError` callback
- `utils/` — helpers including `convertKeys()` (camelCase → snake_case), `convertListParamsToQueryString()`, `requiredCheck()`, etc.

`src/types/` — shared generic types: `LemonSqueezyResponse<D,M,L>`, `Data`, `Params`, `Flatten`, etc.

`src/index.ts` — barrel re-exports everything for consumers.

### Data flow

1. Consumer calls `lemonSqueezySetup({ apiKey, onError })` — stored in a module KV store.
2. Consumer calls a resource function (e.g., `createCheckout(storeId, variantId)`).
3. Resource function validates required params with `requiredCheck()`, builds URL/body (converting camelCase keys to snake_case via `convertKeys()`), and delegates to `$fetch()`.
4. `$fetch()` retrieves the stored config, attaches `Authorization: Bearer <apiKey>`, calls native `fetch`, and returns `{ data, error, statusCode }`.
5. On error, `onError` is called if provided.

### Response shape

All functions return `{ data: T | null, error: Error | null, statusCode: number | null }`. The `data` type is the full JSON:API response (e.g., `Checkout`, `ListCheckouts`).

### Tests

Tests in `test/<category>/index.test.ts` mirror the `src/` structure and make live API calls (no mocking). `test/index.test.ts` validates that the expected exports exist.

### Build

`tsup` bundles `src/index.ts` into `dist/` as both ESM (`index.js`) and CJS (`index.cjs`) with TypeScript declaration files. The library is published as `@lemonsqueezy/lemonsqueezy.js`.

## Commit Convention

Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): description`.
Valid types: `feat`, `fix`, `refactor`, `docs`, `build`, `test`, `ci`, `chore`.

Pre-commit hooks run `lint-staged` (ESLint + Prettier check) and validate commit messages with `commitlint`.
