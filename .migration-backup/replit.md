# Makhazeny Warehouse

Full-stack warehouse management system with products, customers, suppliers, sales POS, treasury, debts, returns, and reports.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/makhazeny run dev` — run the frontend (port 25085)
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: Vite + React, wouter routing, shadcn/ui, Tailwind v4 (oklch colors), sonner toasts
- API: Express 5 with cookie-parser, JWT auth via httpOnly cookies
- Data: In-memory store (store.ts) with bcryptjs-seeded users — no DB needed
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/lib/store.ts` — in-memory data store with seeded data (source of truth)
- `artifacts/api-server/src/lib/authLib.ts` — JWT sign/verify helpers
- `artifacts/api-server/src/middlewares/requireAuth.ts` — auth middleware (falls back to DEFAULT_USER if no cookie)
- `artifacts/api-server/src/routes/` — all API routes (auth, products, categories, customers, suppliers, sales, debts, returns, treasury, reports)
- `artifacts/makhazeny/src/App.tsx` — wouter router with all page routes
- `artifacts/makhazeny/src/pages/` — page components (dashboard, products, customers, suppliers, sales, debts, returns, treasury, reports, login)
- `artifacts/makhazeny/src/components/` — feature components (products, customers, suppliers, sales, debts, returns, treasury) + shadcn/ui
- `artifacts/makhazeny/src/lib/api.ts` — apiFetch() wrapper that includes credentials: 'include'
- `artifacts/makhazeny/src/index.css` — Tailwind v4 with oklch theme variables

## Architecture decisions

- No database — store.ts is an in-memory store with rich seed data (bcrypt-hashed passwords, 100+ sample transactions). Restarting the API server resets all data.
- Auth uses DEFAULT_USER fallback (admin@makhazeny.local / ADMIN role) so the app works without logging in — matches original Next.js behavior.
- Frontend uses `apiFetch()` helper instead of `fetch()` directly to ensure `credentials: 'include'` is always set for cookie-based auth.
- shadcn/ui SelectItem components cannot have `value=""` — use a non-empty sentinel like `"all"` and filter on that.
- CORS configured with `origin: true, credentials: true` to allow cookie forwarding from the Vite dev server.

## Product

- Dashboard: live stats (products, customers, sales, outstanding debts) with recent sales and low-stock alerts
- Products: CRUD with categories, SKU, stock levels, low-stock indicators
- Customers: manage profiles, credit limits, outstanding debt tracking
- Suppliers: manage contacts and purchase balances
- Sales/POS: point-of-sale with product cart, customer selection, payment method
- Treasury: daily cash register, income/expense tracking, transaction history
- Debts: outstanding installment management with payment recording
- Returns: return request review with approve/reject workflow
- Reports: date-range reports for sales, products, customers, debts, inventory with CSV export

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always use `apiFetch()` (from `@/lib/api`) in components — never bare `fetch()` — or cookies won't be sent and you'll get 401s.
- shadcn/ui `<SelectItem>` cannot have `value=""` — use a sentinel string like `"all"` instead.
- Restarting the API server resets all in-memory data to seed values.
- Tailwind v4 uses oklch color variables (not HSL) — the `@theme inline` block in index.css maps them to Tailwind color names.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Original Next.js backup at `.migration-backup/`
