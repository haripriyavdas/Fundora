# Decisions

Newest first. Add a row whenever the team makes a choice someone might later ask "why?" about.

| Date | Decision | Why |
| --- | --- | --- |
| 2026-11-04 | **`jsdom` pinned to 26.** | Version 30 needs Node 22+; production and CI run Node 20. |
| 2026-11-04 | **`PUT /profile`: a missing field is unchanged, `null` clears it, unknown keys are a 400.** | Partial saves need a way to clear a value, and a rejected `aadhaarNumber` is safer than one silently dropped. |
| 2026-11-04 | **`parentOccupation` and `nationality` are fixed lists**, not free text. | Scheme rules only compare exact values, so free text could never match. Add a value to `constants.ts` when a scheme needs it. |
| 2026-11-04 | **Profile routes check that the account still exists.** | A session cookie can outlive its account, and the upsert would otherwise recreate a deleted student's data. |
| 2026-11-03 | **Register logs the student in** (sets the session cookie) before the email is verified. | Docs already let unverified students log in and build a profile; `resend-verification` needs a session; saves a second login. |
| 2026-11-03 | **Vitest 4, not 5.** | Vitest 5 requires Node 22+; production and CI run Node 20. |
| 2026-11-03 | **`EMAIL_PROVIDER=console`** for local development. | New teammates can run the app without an email API key; env validation refuses it in production. |
| 2026-11-03 | **Client written fresh in `src/client`** instead of moving `Fundora-frontend/`. | That folder wasn't in this repo; the team chose to build here rather than copy it in. |
| 2026-11-03 | **One folder, one `package.json`.** React app, API and shared code under `src/`, served by one Express process (Vite middleware in dev). | Simpler for a student team: one install, one dev command, one deploy, no CORS. |
| 2026-11-03 | **One Render web service** instead of Vercel + Render. | Follows from one folder; same-origin cookies; one free tier to manage. |
| 2026-11-03 | **Tracker stages: Saved, Applied, Renewal due.** "Applying" and "Awarded" dropped. | Fewer stages are easier for students; Fundora can't confirm awards anyway. |
| 2026-11-03 | **Students are the only users.** No admin, counsellor or NGO accounts. | Smaller scope and attack surface; nobody else ever sees a student's data. |
| 2026-11-03 | **Scheme data as JSON files in the repo**, seeded by CI. | Replaces the admin panel: reviewable PRs, git history as audit log, no admin auth to secure. |
| 2026-11-03 | API and field names follow the existing frontend types (`closesOn`, `verifiedOn`, `portal`, `/saved`). | The UI was already built against them. |
| 2026-10-27 | **Guide and list, never apply.** Students apply on the official portal via its link. | Trust, legal safety, no credentials held. |
| 2026-10-27 | MERN stack + TypeScript + Zod shared between client and server. | Team knows JavaScript; shared schemas stop the client and server drifting. |
| 2026-10-27 | Encrypt income, category and disability; never collect ID or bank numbers. | DPDP Act 2023; this is the most sensitive data we hold. |
