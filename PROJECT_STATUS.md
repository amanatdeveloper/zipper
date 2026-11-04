# PROJECT_STATUS.md

Persistent project history for **Zippper** (product/brand name: **Scalefire**), a Google Ads + ecommerce profitability dashboard.

> This file is the running log of *what happened and why*. Stable conventions and commands live in `CLAUDE.md`. Future Claude Code sessions should read this file before making significant changes, and should append to it whenever an important feature, bug fix, architectural decision, API/DB/auth/deployment change, or meaningful status change lands.

## Current Status

- **Active development**, single branch `main`, no feature branches in regular use. 48 commits total.
- Working tree contains the temporary production login diagnostics in `lib/auth-options.js` and `lib/prisma.js`; no commits have been made.
- Remotes: `origin/main` and `zipperscooters/main`.
- Most recent work (2026-11-01) was the **Cloudflare Workers migration** (Next 15 + OpenNext + Neon driver adapter + REST integrations). Before that: the marketing landing-page redesign and onboarding OAuth fixes (Shopify + Google Ads).
- **Production login investigation (2026-11-04):** temporary safe diagnostics now record the Prisma client's captured database endpoint metadata, runtime `DATABASE_URL` metadata, auth operation failures, and Neon HTTP request outcomes. Production root cause remains unconfirmed pending deployment and Worker logs.
- No CI pipeline, no test suite, no staging environment configured. Deploy target is now **Cloudflare Workers** (see "Cloudflare Workers Migration").
- The app runs but is pre-GA: several debug artifacts and known tech debt remain (see below).

## Implemented Features

- **Authentication & accounts** — NextAuth credentials login, bcrypt password hashing, JWT sessions, self-service `/register`, role-based access (`SUPER_ADMIN`, `STORE_USER`).
- **Multi-tenant store management** — create/read/update/delete stores; each store holds its own Google Ads + WooCommerce (and optionally Shopify) credentials.
- **Onboarding wizard** (`app/(dashboard)/onboarding/page.js`) — 3 steps: (1) store details + platform selection, (2) platform credentials (WooCommerce keys **or** Shopify OAuth connect), (3) Google Ads OAuth connect. Completing it creates the first `Store` linked to the user.
- **Google Ads OAuth** (`/api/auth/google-ads/*`) — exchanges the auth code, calls `listAccessibleCustomers` + `googleAds:search`, and returns the refresh token + account list to the onboarding page.
- **Shopify OAuth** (`/api/auth/shopify/*`) — HMAC-validated callback, exchanges the code for a permanent token, stashes it in short-lived httpOnly cookies, and clears them once onboarding persists the store.
- **Profitability dashboard** — `GET /api/report` joins Google Ads Shopping data, WooCommerce orders/products, and Prisma meta into a per-SKU report (ACOS, conversion rate, ad cost per sale, profit per sale, total profit, stock days remaining). `DashboardClient.js` renders it with date-range filtering, editable per-product targets, and optimization recommendations.
- **Optimization engine** — `/api/optimize` writes an `OptimizationLog` entry and (when metrics are present) an `OptimizationHistory` snapshot; a 14-day "learning phase" suppresses further suggestions after an optimization.
- **AI page auditor** (`/api/audit`, `lib/page-audit.js`) — fetches a product page with `cheerio`, runs heuristic `AUDIT_CHECKS`, then calls OpenAI (`gpt-4o-mini`, JSON mode) for a 0–100 score, checklist, and summary. Results are cached in `PageAudit` for 7 days.
- **Product metadata** — cost price, lead time, minimum sales target, and archive/hide flag per SKU (`ProductMeta` + `/api/product-meta`).
- **Admin panel** (`/admin`) — super-admin management of users and stores.
- **Marketing site** — landing/pricing/product/solution/start-free-trial pages built from `content/landing-content.js` and `components/landing/*`.
- **Global no-cache middleware** — every non-static request is sent `Cache-Control: no-store`.

## Work In Progress

- Nothing is mid-flight at the time of writing (clean tree, last commit landed cleanly).
- The marketing redesign just landed: `app/(marketing)/page.js` was gutted and rebuilt on top of new landing components, and the previous version was kept as `app/(marketing)/page-old.js`.

## Recent Important Changes

| Commit | Change |
|--------|--------|
| `f855b68` | Marketing landing redesign: new `components/landing/*`, `content/landing-content.js`, new pricing/product/solution/start-free-trial pages; old page moved to `page-old.js`. |
| `dad98c5` | Onboarding "connect Google" button now routes to the real `/api/auth/google-ads/login` OAuth flow. |
| `5ef8dd3` | Fixed Shopify onboarding redirect path; added `debug-products` endpoint. |
| `59e456d` | Shopify callback now uses `NEXTAUTH_URL` as the canonical redirect origin (avoids proxy-host mismatches). |
| `f0b6c66` | Added Shopify fields to the `Store` model and persisted Shopify onboarding data. |
| `88ae6f5` | Added optimization history snapshots, dashboard alerts, archive/hide, and profit-logic updates. |
| `3321ee9` | Implemented the Google Ads OAuth2 flow for onboarding step 3. |
| `a61dd86` | Added self-service register route and onboarding APIs. |
| `fecaab6` | Disabled route caching; added the global no-store middleware. |

## Important Architectural Decisions

- **Plain JavaScript, App Router.** The repo has a `tsconfig.json`, but it is `allowJs`/`strict: false` and the codebase is `.js`. There is no build-time type checking. Don't introduce TS unless the team decides to migrate.
- **Route groups split the product**: `app/(marketing)/` (public) vs. `app/(dashboard)/` (authenticated shell). The dashboard layout is the single auth guard for the whole group.
- **Server-guard + client-fetch pattern.** Dashboard pages are thin server components that check the session, resolve `storeId`, and redirect when needed; all data fetching and interactivity lives in `'use client'` components (`DashboardClient.js`, `admin/page.js`, `onboarding/page.js`). Keep new pages on this pattern.
- **Authorization is centralized in `lib/auth-helpers.js`.** Routes call `getAuthenticatedUser()` and `getAccessibleStore()`; they never query Prisma directly for store access. Ownership is enforced per request; `SUPER_ADMIN` bypasses it.
- **SKU normalization is the join key.** `normalizeSku` (lowercase/trim/collapse whitespace) is applied to Google Ads `product_item_id`, WooCommerce line-item SKUs, and inventory SKUs before joining. `ProductMeta` stores both raw and normalized forms with a unique `(storeId, normalizedSku)`.
- **Defensive Prisma storage checks are deliberate.** `isMissingProductMetaStorage`, `isMissingPageAuditStorage`, and `runStoreOperationWithAuditPrompt` catch Prisma `P2021`/`P2022` and degrade gracefully when a table/column isn't migrated yet. This keeps the app functional across partially-migrated databases. Do not remove these as "dead code".
- **Uniform API envelope.** Every route returns `{ success, data?, error? }` with an explicit HTTP status. Preserve it.
- **Everything is dynamic.** `middleware.js` sets `no-store` globally and pages export `force-dynamic`/`revalidate = 0`. This was a deliberate, hard-won choice (see "Approaches tried" below).
- **Audit results are cached 7 days** in `PageAudit` and served with `cached: true` before any new scrape/OpenAI call.
- **Recommendation targets are editable and persisted client-side** in `localStorage` (`zipper_global_targets`), with per-product overrides falling back to globals.

### Report pipeline data flow

`GET /api/report?storeId=&start=&end=` runs one `Promise.all`:
1. Google Ads `shopping_performance_view` → `product_item_id`, clicks, `cost_micros`.
2. WooCommerce orders for the selected window **and** a trailing 30-day window, plus all published products (paginated 100/page).
3. Prisma `OptimizationLog` (last 14 days), `ProductMeta`, latest `PageAudit`.

Joined by normalized SKU → `acos`, `convRate`, `adCostPerSale`, `profitPerSale`, `totalProfit`, `stockDaysRemaining`. Default filters: 30-day window, `adCost > 0` (unless `showAll=true`), exclude hidden (unless `showArchived=true`).

### Recommendation engine (`DashboardClient.getDynamicRec`)

Priority-ordered rules (first match wins, with learning-phase overrides): out-of-stock → pause; high ACOS + low stock → reduce bids; ≥100 clicks + low conversion → reduce price (unless learning); high ACOS + low conversion → reduce bid (unless learning); learning phase → hold; ACOS ≤ target + sales ≥ target → optimal. Then overrides for negative margin, lead-time-based restock, and below-target sales. Targets default to 15% ACOS / 1% conversion / 5 sales.

## Known Issues & Technical Debt

- **`next.config.js` shadows `next.config.mjs`.** Next resolves `.js` first, so `skipTrailingSlashRedirect: true` in the `.mjs` file is silently ignored. One of the two should be removed.
- **Leftover `app/(marketing)/page-old.js`** — the pre-redesign landing page, no longer routed. Safe to delete once the redesign is confirmed.
- **Temporary debug endpoint** `app/api/auth/shopify/debug-products/route.js` — fetches 5 Shopify products for troubleshooting. Should be removed before GA.
- **Debug logging left in production paths** — `console.log` in `app/login/page.js` (sign-in result) and `app/api/auth/google-ads/callback/route.js` (customer IDs/status). Should be downgraded to structured/server-only logs or removed.
- **Database schema is behind the Prisma schema.** `prisma migrate status` reports `0_init` and `20260521_add_shopify_fields_to_store` as **not applied**, yet the tables already exist (the DB was originally created with `db push`). The live DB is missing `Store.platform`, `Store.shopifyShopDomain`, and `Store.shopifyAccessToken`; anything selecting those columns (onboarding, admin store edits) fails with Prisma `P2022`. The diff is purely additive — `npx prisma db push` or applying the three `ALTER TABLE` statements fixes it. Do not run `migrate deploy` blindly: `0_init` would try to create existing tables.
- **`prisma/migrations/0_init/migration.sql` is binary** (48 bytes) rather than readable SQL — suspicious; verify migrations are actually reproducible.
- **README terminology mismatch** — README says "Target CPA" but the code and UI use **ACOS**. README should be corrected.
- **No tests, no CI.** Regressions are caught only by manual verification.
- **WooCommerce stores with invalid/self-signed TLS certificates no longer work.** The old client disabled verification via a custom `https.Agent`; Cloudflare Workers' `fetch` cannot do that. Stores must present a valid certificate.
- **Targets persist only in `localStorage`**, so they are per-browser and not shared across devices/users.

## Pending Tasks

*(Derived from the known issues above; confirm with the team before treating as committed work.)*

- [ ] Delete `app/(marketing)/page-old.js` once the redesign is signed off.
- [ ] Remove `app/api/auth/shopify/debug-products/route.js` before GA.
- [ ] Resolve the `next.config.js` / `next.config.mjs` duplication.
- [ ] Sync the live database with the Prisma schema (add the three missing `Store` columns).
- [ ] Configure Cloudflare build/deploy commands and Worker secrets; update OAuth redirect URIs.
- [ ] Remove or gate debug `console.log` calls in login and the Google Ads callback.
- [ ] Fix README "CPA" → "ACOS" and refresh the setup instructions.
- [ ] Investigate the binary `0_init/migration.sql`.
- [ ] Introduce at least smoke tests and a CI check (lint + build).

## Backend / API Dependencies

| Dependency | Purpose |
|------------|---------|
| `next` 15.5 (App Router) + `react` 19 | Framework |
| `@prisma/client` + `prisma` 6.19 (`engineType = "client"`) | PostgreSQL ORM / migrations |
| `@prisma/adapter-neon` + `@neondatabase/serverless` | Neon HTTP driver (Workers-compatible) |
| `next-auth` 4 | Credentials auth (JWT) |
| `bcryptjs` | Password hashing |
| Google Ads REST API (`fetch`, `lib/api-clients.js`) | Google Ads Shopping reporting |
| WooCommerce REST API (`fetch`, `lib/api-clients.js`) | WooCommerce products/orders |
| `openai` 6 | Page-auditor scoring (`gpt-4o-mini`) |
| `cheerio` | HTML scraping for the auditor |
| `lucide-react` | Icons |
| `tailwindcss` + `postcss` + `autoprefixer` | Styling |
| `@opennextjs/cloudflare` + `wrangler` | Cloudflare Workers build/deploy |

No backend other than the Next.js server (API routes + server components) and the external APIs. There is no separate microservice.

## Database-Related Decisions

- **PostgreSQL via Prisma.** `DATABASE_URL` for the main connection, `DIRECT_URL` for migrations/direct access.
- **Schema** (`prisma/schema.prisma`): `User` 1—* `Store` 1—* `OptimizationLog` / `OptimizationHistory` / `PageAudit` / `ProductMeta`. Child rows cascade on store delete.
- **Roles are an enum** (`SUPER_ADMIN`, `STORE_USER`) on `User`, not a separate table.
- **`Store` is the tenant boundary** and carries all third-party credentials (Google Ads, WooCommerce, optional Shopify). Credentials are stored in plaintext in the DB — no KMS/encryption layer.
- **`auditPrompt` on `Store`** with a fallback path so a missing column doesn't break store reads (`runStoreOperationWithAuditPrompt`).
- **SKU identity**: `ProductMeta` has `@@unique([storeId, normalizedSku])`; the report join depends on this normalization.
- **Migrations are hand-managed** under `prisma/migrations/`; there is no squash/reset workflow. Existing migration folders must be preserved.
- **`db:seed`** upserts the super-admin (`admin@amanatdev.com`) and a demo "Zipper Mobility" store from env vars.

## Authentication / Authorization Decisions

- **Credentials provider only** (email + password). No OAuth social sign-in for the app itself; Google/Shopify OAuth are *platform connections*, not login.
- **JWT session strategy**, 30-day max age, custom sign-in page at `/login`.
- **Role is embedded in the JWT and session** via `jwt`/`session` callbacks (`token.id/email/role` → `session.user.*`).
- **Ownership enforced server-side** through `getAccessibleStore`; clients also gate on `session.user.role` but that is UX only.
- **Graceful session fallback**: if the JWT is valid but the DB user is gone, `getAuthenticatedUser` still returns a user so the dashboard doesn't redirect-loop.
- **Post-auth routing** is role- and state-aware: super-admin → `/admin`; user with a linked store → `/dashboard?storeId=...`; user with no store → `/onboarding`.
- **Shopify token handoff** uses short-lived (30 min) httpOnly `sameSite=lax` cookies, cleared after onboarding persists the store. In production they are `secure`.
- **`NEXTAUTH_URL` is treated as the canonical app origin** for OAuth redirect URIs (both Google and Shopify) to avoid proxy-host mismatches.

## Deployment-Related Decisions

- **Target: Cloudflare Workers** via `@opennextjs/cloudflare` (config in `wrangler.jsonc` + `open-next.config.ts`). Vercel is no longer the intended target.
- **Cloudflare build settings**: Build command `npm run cf:build`, Deploy command `npx wrangler deploy`. `cf:build` runs `prisma generate` and then the OpenNext build.
- **Worker bundle** is ~2.65 MB gzip (under the 3 MB free-plan limit); the Prisma query compiler is bundled as WASM.
- **`postinstall` runs `prisma generate`**, and both `npm run build` and `npm run cf:build` run it again, so the client is always present.
- **All env vars must be configured as Worker secrets/vars** (`npx wrangler secret put <NAME>`) — nothing is baked into the build. Locally, `wrangler dev` reads `.dev.vars` (gitignored).
- **`NEXTAUTH_URL`** must be set to the public deployment URL for OAuth callbacks to work.
- **Google Cloud / Shopify app redirect URIs** must point at the deployed domain: `https://<domain>/api/auth/google-ads/callback` and `https://<domain>/api/auth/shopify/oauth-callback`.
- **No caching anywhere**: global no-store middleware + `force-dynamic` on pages. This is intentional to avoid stale Ads/sales data, at the cost of always hitting the APIs.
- **No staging environment**; `main` is effectively production.

## Cloudflare Workers Migration (2026-11-01)

The first Cloudflare deploy failed with `Next.js version 14.2.35 is not supported`. The repo had no committed Cloudflare config, so Wrangler's auto-config installed the latest `@opennextjs/cloudflare` (1.20.15), whose peer range is Next `>=15.5.28`. Fixing only the version would not have been enough: the runtime also had three hard blockers (Prisma's native engine, `google-ads-api`'s gRPC transport, and a Node `https.Agent` for WooCommerce).

**What changed**

- **Next 14.2 → 15.5.28, React 18 → 19.3.1.** Fixed the Next 15 async APIs: `searchParams` is awaited in `app/(dashboard)/dashboard/page.js`; route handlers in `app/api/stores/[id]` and `app/api/admin/users/[id]` await `params`.
- **Prisma 6.0.1 → 6.19.3 with `engineType = "client"`** (Rust-free WASM query compiler) plus `@prisma/adapter-neon` and `@neondatabase/serverless` (`neonConfig.poolQueryViaFetch = true`). `lib/prisma.js` imports `PrismaClient` from `@prisma/client` — **not** `@prisma/client/edge`; Prisma 6.19 rejects the `/edge` entry when a driver adapter is supplied.
- **Google Ads** is now called over the REST API (`lib/api-clients.js`): OAuth refresh-token exchange (with a per-isolate token cache) + `googleAds:search` with `pageToken` pagination, `developer-token` and optional `login-customer-id` headers. The `google-ads-api` package was removed. The onboarding callback was moved from API `v17` to `v23`.
- **WooCommerce** is now a `fetch` client with `queryStringAuth`-style `consumer_key`/`consumer_secret` query params; `@woocommerce/woocommerce-rest-api` was removed.
- **Cloudflare config committed**: `wrangler.jsonc` (nodejs_compat, `.open-next/worker.js`, assets binding), `open-next.config.ts` (no incremental cache — everything is dynamic), `public/_headers`.
- **`prisma.config.js` is CommonJS and intentionally minimal.** Prisma 6.19's `@prisma/config` loader rejects ESM syntax and rejects a top-level `datasource` key. When a config file is present Prisma stops auto-loading `.env`, so the file calls `require('dotenv/config')` and sets inert `DATABASE_URL`/`DIRECT_URL` fallbacks so `prisma generate` works during the Cloudflare build (where DB secrets are runtime-only).
- `next.config.js` sets `images.unoptimized` (no Node image optimizer on Workers) and `.eslintrc.json` was added so `next lint` is non-interactive.
- `.env.local.template` now lists the variables the code actually reads.

**Verified locally** with `wrangler dev` against the real Neon DB: credentials login, Prisma reads (`/api/stores`, `/api/admin/users`), Google Ads REST (`adsRows: 14` for Zipper Mobility), and WooCommerce products (`wooCount: 1` for Fino Stone). Not exercised: the AI audit route (would call OpenAI), Shopify OAuth, and a full report for a store where both integrations work.

## Approaches That Were Tried (Don't Repeat)

- **Marketing page prerender failures — a long, instructive saga.** Commits `1c72802` → `c5af671` → `eece264` → `9371fba` → `6267c3e` → `2723a7c` show the team cycling through: converting the page to a client component, adding `dynamic` exports, converting it *back* to a static server component, then finally landing on the current setup. **Lessons:** (1) `useSearchParams` in a client component during prerender requires a `<Suspense>` boundary — see `a87ac2f`, which wrapped `Header`/`Sidebar`; (2) `revalidate`/`dynamic` are **server-only exports** and must not appear in `'use client'` files — see `839f809`; (3) prefer `force-dynamic` + Suspense over converting whole pages to client components.
- **Store-access 403s were patched twice** (`0135818` "fix 403", `81ff6f5` "fix 403 with 404") before the centralized `getAccessibleStore` ownership check existed. Don't hand-patch status codes in individual routes — route them through `auth-helpers`.
- **`revalidate` was removed from client components** (`839f809`) — never add it there again.
- **Caching was disabled globally** (`fecaab6`) after stale-data pain. Don't reintroduce route-level caching without a deliberate invalidation story.

## Project Conventions (summary)

See `CLAUDE.md` for the full, stable set. Highlights: JavaScript only; relative imports (the `@/*` alias exists but is unused); `{ success, data, error }` API envelope; always use `lib/auth-helpers.js` for authz; `normalizeSku` before any cross-source join; keep the defensive Prisma fallbacks.
