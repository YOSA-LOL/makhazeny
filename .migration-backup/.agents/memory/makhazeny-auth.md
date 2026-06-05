---
name: Makhazeny auth and UI patterns
description: Key non-obvious patterns in the Makhazeny warehouse app migration
---

## Auth fallback
requireAuth and requireAdmin middlewares fall back to DEFAULT_USER (admin@makhazeny.local, ADMIN role) when no valid cookie is present. This matches the original Next.js behavior and allows the app to work without login.

**Why:** Original Next.js app had the same pattern — the app is designed for single-user/internal use where login is optional.

**How to apply:** Keep DEFAULT_USER in middlewares. If stricter auth is needed later, remove the fallback.

## apiFetch wrapper
All frontend fetch calls must use `apiFetch()` from `@/lib/api.ts` (not bare `fetch()`) to ensure `credentials: 'include'` is always sent.

**Why:** Cookie-based JWT auth requires credentials on every request; bare fetch doesn't send cookies cross-origin.

## shadcn/ui SelectItem empty string
`<SelectItem value="">` causes a runtime crash. Use a non-empty sentinel like `value="all"` and adjust filter logic accordingly.

**Why:** shadcn/ui Select uses empty string to indicate cleared/unset state.

## Tailwind v4 oklch colors
index.css uses `@theme inline` with oklch color variables (not HSL). The original globals.css used `@import 'tailwindcss'` with oklch — the scaffold used HSL placeholders that had to be replaced.
