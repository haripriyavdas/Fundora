---
name: frontend-page
description: Build or change a page, section or component in Fundora's React app (src/client) following its design tokens, i18n, mobile-first and accessibility rules. Use for any UI work - new pages, forms, the profile wizard, tracker, scheme cards, landing page sections.
---

# Build frontend UI

Read `src/client/CLAUDE.md` and `docs/frontend.md` first. Look at two existing components nearby (for example `components/app/SchemeCard.tsx`, `pages/auth/SignupPage.tsx`) and match their style.

## Steps

1. **Route:** add it in `App.tsx`; logged-in pages go inside `AppLayout`. Lazy-load the page with `React.lazy`.
2. **Data:** fetch through `features/<area>/api.ts` → `lib/api.ts`, with types from `@shared`. Keep fetch logic out of the page. Respect `VITE_USE_MOCK_DATA` until the API route exists.
3. **Text:** every visible string uses `t('area.key')`; add keys to `i18n/locales/en.json`, grouped by page. Short, plain English for first-generation students.
4. **Style:** Tailwind with the tokens in `index.css` (`brand`, `accent`, `ink`, `muted`, `surface`, `line`, `eligible`/`almost`/`not`/`info` + `-bg`). Cards `rounded-2xl border border-line bg-white`. No new colours or UI libraries.
5. **Mobile first:** build at 360 px, then add `sm:`/`lg:` layouts. Tap targets at least 44 px. No horizontal scroll.
6. **States:** loading (skeleton), empty (what to do next), error (retry), and for forms: inline field errors plus `animate-shake` on a failed submit.
7. **Accessibility:** semantic HTML, labels tied to inputs, `aria-invalid`/`aria-describedby` for errors, focus visible, match states shown with icon + word + colour.
8. **Check:** `npm run lint`, `npm run typecheck`, then look at it in `npm run dev` at 360 px and desktop widths.

## Fundora-specific

- Apply buttons: `<a href={scheme.portal.url} target="_blank" rel="noopener noreferrer">`. Never a form that posts to a portal.
- Show the match `reason` wherever a match state appears, and "Last verified {date}" on scheme details.
- Sensitive profile fields get a one-line note on why they're asked and that they're encrypted.
- Tracker columns are Saved, Applied, Renewal due, nothing else.
- No admin, counsellor or NGO screens.
