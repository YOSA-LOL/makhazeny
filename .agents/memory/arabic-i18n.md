---
name: Arabic i18n / RTL setup
description: How the Arabic language toggle and RTL support are implemented in Makhazeny.
---

The app has a full EN/AR toggle using a React context in `src/lib/i18n.tsx`.

## Pattern
- `LanguageProvider` wraps the entire app in `App.tsx`
- `useLanguage()` returns `{ lang, isAr, toggleLang, t }`
- `t(englishString)` returns the Arabic translation or falls back to the key
- On toggle: `document.documentElement.dir = 'rtl'` and `document.documentElement.lang = 'ar'`

## Font
- Cairo font loaded from Google Fonts in `index.html`
- Applied via CSS: `:root[dir="rtl"] { font-family: 'Cairo', sans-serif; }`

## RTL layout
- Sidebar uses `side={isAr ? 'right' : 'left'}` (shadcn Sidebar prop)
- Table columns use `ps-4`/`pe-4`/`text-end` (CSS logical properties) instead of `pl`/`pr`/`text-right`
- Search icon uses `start-2.5` instead of `left-2.5`

**Why:** Physical CSS properties (left/right) don't mirror in RTL. Logical properties (start/end) do.

## Dictionary
- Full AR dictionary in the `AR` object in `i18n.tsx` (~200 keys)
- Menu items, page headers, tab labels, table headers, status pills, buttons, empty states
- If a key is missing, `t()` returns the original English string as fallback
