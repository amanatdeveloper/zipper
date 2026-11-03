# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Zippper (branded "Scalefire") is a Next.js 15 (App Router, React 19) SaaS dashboard that joins **Google Ads** Shopping performance data with **WooCommerce** (and, more recently, Shopify) sales data to produce per-SKU profitability and optimization recommendations. It is plain JavaScript, not TypeScript, despite the presence of a `tsconfig.json` (see Gotchas). It deploys to **Cloudflare Workers** through `@opennextjs/cloudflare`.

> **Before making significant changes, read [`PROJECT_STATUS.md`](./PROJECT_STATUS.md).** It holds the evolving project history: current status, recent changes, known issues/tech debt, pending tasks, and decisions that were tried and should not be repeated. Update it whenever an important feature, bug fix, architectural decision, API/DB/auth/deployment change, or meaningful status change lands. Keep this file limited to stable conventions and commands.

## Commands

```bash
npm install                # also runs `prisma generate` via postinstall
npm run dev                # next dev (http://localhost:3000)
npm run build              # prisma generate && next build
npm start                  # next start
npm run lint               # next lint (eslint-config-next)
npm run db:seed            # node prisma/seed.js — creates the SUPER_ADMIN + demo store
npx prisma generate        # regenerate client after schema changes
npx prisma migrate dev     # create/apply a migration
npx prisma migrate deploy  # apply migrations in production
npm run cf:build           # prisma generate && opennextjs-cloudflare build (Cloudflare build command)
npm run preview            # build + run the worker locally (wrangler dev)
npm run deploy             # build + deploy to Cloudflare Workers
```

There is **no test runner** configured (no jest/vitest, no `test` script). Verify changes by running `npm run dev` and exercising the relevant route, or by `npm run lint`.

## Architecture

### Routing & rendering split

- `app/(marketing)/` — public landing/pricing/product/solution pages (route group, no URL prefix). `page-old.js` is a leftover duplicate of `page.js`.
- `app/(dashboard)/layout.js` — the authenticated shell. It calls `getServerSession(authOptions)` and **redirects to `/login` when unauthenticated**; every page inside this group inherits that guard. It also sets `dynamic = 'force-dynamic'`, `revalidate = 0`, `fetchCache = 'force-no-store'`.
- `app/(dashboard)/dashboard/page.js` is a thin **server component** that resolves the active store (`?storeId=`) and redirects to `/onboarding` when the user has no linked store, then renders the client component `DashboardClient.js`, which does all data fetching.
- Other dashboard pages (`stores`, `inventory`, `optimization-logs`, `admin`, `onboarding`) follow the same server-guard + client-component pattern.

### Auth & authorization

- NextAuth **CredentialsProvider** only (`lib/auth-options.js`), JWT sessions (`strategy: 'jwt'`, 30-day maxAge), password hashing via `bcryptjs`. Sign-in page is `/login`.
- Two roles: `SUPER_ADMIN` and `STORE_USER` (Prisma enum `UserRole`). Registration always creates `STORE_USER`; super-admins are created via `db:seed` or the admin panel.
- Authorization helpers live in `lib/auth-helpers.js` — **always go through these, never query Prisma directly from a route**:
  - `getAuthenticatedUser()` → `{ session, user }`; falls back to the JWT payload if the DB user is missing (avoids redirect loops).
  - `getAccessibleStore(user, storeId)` → enforces ownership for `STORE_USER`, allows any store for `SUPER_ADMIN`.
  - `getStoreCountForUser` / `getDefaultStoreIdForUser` / `isSuperAdmin`.
- Post-login routing is role- and state-aware (`lib/post-auth-redirect.js`, plus client-side checks in `app/login/page.js`): super-admin → `/admin`; user with a store → `/dashboard?storeId=...`; user with no store → `/onboarding`.

### Data model (Prisma, PostgreSQL)

`User` 1—* `Store` 1—* `OptimizationLog` / `OptimizationHistory` / `PageAudit` / `ProductMeta`. A `Store` holds the platform credentials: Google Ads (client id/secret, developer token, refresh token, customer id, login customer id), WooCommerce (`wooUrl/wooCk/wooCs`), and optional Shopify (`shopifyShopDomain/shopifyAccessToken`). All child models cascade on store delete. SKUs are matched across sources via `normalizeSku` (lowercase, trimmed, whitespace-collapsed) — `ProductMeta` stores both raw `sku` and `normalizedSku` with a unique `(storeId, normalizedSku)` constraint.

### The report pipeline (core feature)

`GET /api/report?storeId=&start=&end=` (`app/api/report/route.js`) is the heart of the dashboard. In one `Promise.all` it:
1. Queries Google Ads `shopping_performance_view` for `product_item_id`, clicks, and `cost_micros`.
2. Fetches WooCommerce orders for the selected window **and** a trailing 30-day window, plus all published products (paginated, 100/page).
3. Loads Prisma `OptimizationLog` (last 14 days → "learning phase"), `ProductMeta`, and latest `PageAudit`.
4. Joins everything by normalized SKU and computes `acos`, `convRate`, `adCostPerSale`, `profitPerSale`, `totalProfit`, and `stockDaysRemaining`.

Defaults: 30-day window, filter to `adCost > 0` (`showAll=true` disables), exclude hidden products (`showArchived=true` disables). The README's recommendation rules describe targets (15% ACOS, 1% conv, 5 sales); the dashboard holds these as editable `globalTargets` in `DashboardClient.js`.

Other API routes mirror this shape: `stores`, `stores/[id]`, `inventory`, `optimize` (GET history / POST log+history / DELETE), `product-meta` (+ `/archive`), `audit`, `onboarding`, `admin/users` (+ `/[id]`), `register`.

### External integrations

- **Google Ads** — `lib/api-clients.js` talks to the **REST API** (`googleads.googleapis.com/v23`) with `fetch`: it exchanges the store's refresh token at `oauth2.googleapis.com/token` (cached per isolate) and calls `googleAds:search` with `pageToken` pagination. OAuth connect (`/api/auth/google-ads/login` → `/callback`) exchanges the code, calls `listAccessibleCustomers` + `googleAds:search`, and redirects back to `/onboarding` with the refresh token and account list in query params. The `google-ads-api`/gRPC package is **not** used — Workers cannot run gRPC.
- **WooCommerce** — `lib/api-clients.js` is a `fetch` client that appends `consumer_key`/`consumer_secret` to the query string (matching the old `queryStringAuth: true` behaviour). It exposes `.get/.post/.put/.delete` returning `{ data, headers }`. TLS verification cannot be disabled on Workers, so stores must have valid certificates.
- **Shopify** — OAuth via `/api/auth/shopify/login` → `/oauth-callback` (HMAC-validated, sets httpOnly `shopify_access_token` / `shopify_shop_domain` cookies that `/api/onboarding` reads and clears). `callback/route.js` simply re-exports `oauth-callback`. The token is stored on the `Store` at onboarding time.
- **OpenAI** — `app/api/audit/route.js` scrapes a product page with `cheerio`, runs heuristic `AUDIT_CHECKS` (defined in `lib/page-audit.js`), and calls OpenAI for the score/summary.

## Conventions & gotchas

- **API response envelope**: every route returns `{ success: boolean, data?: ..., error?: string }` with an explicit HTTP status. Preserve this when adding routes.
- **Defensive Prisma checks are intentional.** `lib/product-meta.js` and `app/api/report/route.js` contain `isMissingProductMetaStorage` / `isMissingPageAuditStorage` / `runStoreOperationWithAuditPrompt` helpers that catch Prisma `P2021`/`P2022` and degrade gracefully when a table or column isn't migrated yet. Don't "simplify" these away — they keep the app working across partially-migrated databases.
- **`next.config.js` shadows `next.config.mjs`.** Next.js resolves `next.config.js` before `next.config.mjs`, so the `skipTrailingSlashRedirect: true` in the `.mjs` file is currently **ignored**. Edit `next.config.js` (or delete one of the two).
- **`tsconfig.json` is not a TypeScript project.** It has `allowJs: true`, `jsx: "preserve"`, `strict: false`, and includes `**/*.ts` — but the codebase is `.js`. Don't assume type safety; there is none at build time. `jsconfig.json` defines a `@/*` path alias, but the code consistently uses **relative imports** — follow that convention.
- **Environment variables** (authoritative list in `.env.local.template`): `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_ADS_CALLBACK_URL`, `OPENAI_API_KEY`. `WOO_URL`/`WOO_CK`/`WOO_CS` and the `GOOGLE_ADS_*`/`GOOGLE_CUSTOMER_*` names are only read by `prisma/seed.js`. `GOOGLE_ADS_CALLBACK_URL` and `SHOPIFY_DEVELOPER_TOKEN` are dead.
- **`prisma.config.js` must stay CommonJS and minimal.** Prisma 6.19's config loader rejects ESM syntax and a top-level `datasource` key. When a config file exists Prisma stops auto-loading `.env`, so the file requires `dotenv/config` and sets inert `DATABASE_URL`/`DIRECT_URL` fallbacks so `prisma generate` works during builds without secrets.
- **Prisma runs Rust-free on Workers.** `prisma/schema.prisma` sets `engineType = "client"`, and `lib/prisma.js` constructs `PrismaClient` from `@prisma/client` (never `@prisma/client/edge`) with `PrismaNeon`. Do not revert either: the native engine cannot load on Workers.
- **Global no-cache middleware** (`middleware.js`) sets `Cache-Control: no-store` on every non-static request. This is why pages also opt into `force-dynamic`; leave it in place when debugging stale data before assuming a caching bug.
- **`prisma.config.js` loads `dotenv/config`**, but route code reads `process.env` directly — Next.js loads `.env*` files itself, so this only matters for standalone Prisma/seed runs.
- Migrations are hand-managed under `prisma/migrations/`; there is no migration squash workflow, so preserve existing migration folders. Note: the live database was created with `db push` and has **no applied migrations**; `prisma migrate status` will list `0_init` as pending even though the tables exist. Sync schema changes with `prisma db push` unless the migration history is rebuilt.

### Cloudflare Workers deployment

- Config: `wrangler.jsonc` (worker name `zipper`, `nodejs_compat`, `.open-next/worker.js`, `.open-next/assets`) and `open-next.config.ts` (no incremental cache — every page is dynamic).
- Cloudflare dashboard build command: `npm run cf:build`; deploy command: `npx wrangler deploy`.
- Secrets are set with `npx wrangler secret put <NAME>`; local `wrangler dev` reads `.dev.vars` (gitignored).
- Workers limits: no gRPC, no Node TLS agents, no native binaries, and `fetch` cannot disable certificate verification. Keep new integrations `fetch`-based.
- `next.config.js` sets `images.unoptimized` because the Node image optimizer is unavailable; the app only uses static logos.
