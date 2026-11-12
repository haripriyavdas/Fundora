# frontend-fundora-starter — React app

The student-facing website. Full guide: `docs/frontend.md`. Skill: `frontend-page`.

## Layout

```
frontend-fundora-starter/
├── index.html             ← Vite entry (Vite's root is this folder)
├── public/                ← static files served as-is (favicon)
├── main.tsx, App.tsx      ← entry + routes (React Router v7)
├── index.css              ← Tailwind v4 @theme tokens (colours, fonts, animations)
├── components/
│   ├── layout/            ← Navbar, Footer, Logo
│   ├── ui/                ← Container, SectionHeading, button styles
│   └── app/               ← AppLayout, SchemeCard, SchemeDrawer, ApplicationCard…
├── features/
│   ├── schemes/           ← api.ts, useSchemes.ts, format.ts, mockData.ts
│   ├── applications/      ← store.ts (saved schemes + tracker stage)
│   └── profile/           ← api.ts, useProfile.ts, steps.ts (the wizard's steps, as data)
├── pages/
│   ├── home/              ← landing page + sections
│   ├── auth/              ← login, signup, Google sign-in
│   └── app/               ← dashboard, matches/browse, scheme detail, applications
├── i18n/                  ← react-i18next setup + locales/en.json
└── lib/                   ← api.ts (fetch wrapper), cn.ts
```

## Rules

- **Imports:** `@/` → `frontend-fundora-starter`, `@shared/` → `src/shared`. Types for schemes, profiles and saved schemes come from `@shared/schemas` (Zod). Never redefine them here.
- **API calls** go through `lib/api.ts` (`apiGet`, `apiPost`, …) from a `features/*/api.ts` file. Base URL is `/api/v1`, same origin, `credentials: 'include'`. Pages never call `fetch` directly.
- **Mock data:** `features/schemes/mockData.ts` stays until each API route works. `VITE_USE_MOCK_DATA=false` switches to the real API.
- **Every user-facing string goes through `t()`** with keys in `i18n/locales/en.json`. Kannada (`kn`) and Hindi (`hi`) come later, so no hard-coded text.
- **Styling:** Tailwind classes using the tokens in `index.css` (full list in `docs/frontend.md`): red `brand` for actions, active nav and urgency only; charcoal `accent` for the sidebar and ink buttons; `ink` / `body` / `muted` text; cream `surface`, `tile`, `line`; and the match colours `eligible` / `almost` / `not` / `info` / `warn` (each with a `-bg`). No gradients, emoji or illustrations. Don't add a UI kit or new colours without updating `index.css`.
- **Mobile-first.** Design at 360 px wide first. Students use low-end Android phones on slow networks, so lazy-load pages, use no heavy libraries and keep images small.
- **Accessibility:** real buttons and links, labels on every input, visible focus, `aria-*` on custom widgets, colour never the only signal (match states also have a word and an icon).
- **Match states** are `eligible`, `almost`, `not`, `unknown`. Always show the reason text next to the state.
- **Apply buttons** open `scheme.portal.url` in a new tab with `rel="noopener noreferrer"`. Never build a form that submits to a scheme.
- **Tracker** has three columns only: Saved, Applied, Renewal due.
- **No admin or counsellor screens.** Logged-in pages are for the student only.

## Routes (current)

`/`, `/login`, `/signup`, `/forgot`, `/reset-password`, `/verify-email`, `/dashboard`, `/profile` (wizard), `/matches`, `/browse` and `/schemes/:schemeId` (public, via `OpenLayout`), `/privacy`, `/terms`. To add: `/applications`, `/account` (export + delete), `/guides`, `/guides/:slug`.
