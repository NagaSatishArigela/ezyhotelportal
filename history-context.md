# ezyhotelsportal — history & context

> Handoff doc for developers picking up this repo. Complements `CLAUDE.md`
> (coding rules / structure). Last updated: 2026-08.

---

## What this is

The **partner portal** for **EzyHotels.com** — a multi-role app for **Owner**,
**Admin**, **Support**, and **Super Admin**. Owners onboard/manage properties;
admins review & approve listings; support handles tickets. Vite 5 + React 18 +
TypeScript (strict). Runs on **port 3000**, proxies API calls to the backend at
`:4000` (see `vite.config.ts`).

## The three apps

| Repo | Role | Port |
|------|------|------|
| ezyhotelsserver | Backend API + DB | 4000 |
| ezyhotelsweb | Public storefront (guests) | 3001 |
| **ezyhotelsportal** (this) | Owner / Admin / Support portal | 3000 |

Stack: TanStack Router (file-based, `src/routes`), TanStack Query v5, Zustand v5
(persist), React Hook Form + Zod, custom shadcn-style UI, Tailwind v4.

## Auth model (important)

- **Access/refresh tokens are kept in memory only** (stripped from persistence)
  to reduce XSS blast radius. The auth store persists only `{ user, role }`.
- **Consequence:** a hard browser reload drops the token. Route guards + an
  `onRehydrateStorage` reset force a clean unauthenticated state on reload, so
  the user re-logs in. **Do not rely on surviving a reload mid-flow** (e.g.
  mid-onboarding) during demos.
- `mapRole` maps server `GlobalRole` → portal role (`SUPER_ADMIN→super_admin,
  ADMIN→admin, SUPPORT→support, else owner`).

## Current state

- **Onboarding wizard**: 7-step UX mapped onto the server's 5 steps via
  `src/lib/onboarding-mapping.ts` (`completeServerSteps` only PATCHes a server
  step once all its UX fields are present — avoids per-step 400s). Real photo +
  KYC uploads. `businessEntity`-driven conditional docs/GSTIN.
- **Owner post-approval screens are on LIVE data** (`OwnerPortalPages.tsx` +
  `src/lib/api/owner*.ts`): dashboard, bookings, rooms (pricing), settings
  (incl. `isActive` kill-switch), analytics, availability.
- **Support portal on live data** (`SupportPortalPages.tsx` + `lib/api/support.ts`):
  ticket queue, resolve (with note), escalate, real user lookup.
- Admin verification queue + Super Admin (admins/settings) present.

## Rebrand (this session)

- **EzyHotels.com** brand: all 5 shells (Owner/Admin/Support/SuperAdmin/Wizard)
  + Login/Forgot-Password use `components/brand/EzyLogo.tsx` (`EzyMark` renders
  `/public/ezyhotels-mark.png`; `EzyWordmark` = Ezy orange · Hotels navy · .com
  orange). `Stayflex` → `EzyHotels` in copy; emails → `@ezyhotels.com`.
- Tab title → "EzyHotels.com Partner Portal"; favicon → `public/favicon.png`.
- **Brand color `#F05A00`** — `primary-*` ramp reharmonized in `src/index.css`;
  focus-ring glows updated from the old amber.
- Internal identifiers deliberately left as-is for now (Phase 2): the
  `stayflex-auth` / `stayflex-onboarding` localStorage persist keys.

## How to run

**Prerequisites:** Node 20. The backend must be running for anything data-driven
(see `ezyhotelsserver/history-context.md` → docker compose + `start:dev`).

```bash
npm install
npm run dev        # → http://localhost:3000 (proxies /api etc. to :4000)
npm run build      # tsr generate + tsc -b + vite build
npm test           # vitest (unit)
npm run e2e        # playwright
```

## Gotchas / watch-outs

- **Don't reload the portal mid-onboarding** — tokens are memory-only (see Auth
  above).
- **Mocked integrations** (in `src/lib/portal-api.ts` / `modules/owner`): IFSC
  lookup, penny-drop, pincode — they only accept known inputs (e.g. IFSC
  `HDFC0001234`, pincode `400001`). Use those in demos.
- Pre-existing failing tests: 3 in `LoginPage.test.tsx` (unrelated to current
  work).
- Ports: this app is **3000**, the storefront is **3001** — they don't clash.
  (If a tool forces the portal onto 3001 you'll collide with the storefront.)

## Next steps / TODO

- Replace mocked IFSC/pincode/penny-drop with real providers.
- Fix the 3 `LoginPage.test.tsx` failures.
- Phase-2 rebrand cleanup: rename the `stayflex-*` localStorage keys.
- Going forward: **feature branches + PRs** (this session went straight to
  `master` as a one-time catch-up).

## Related

- Backend + DB setup: `ezyhotelsserver/history-context.md`
- Storefront: `ezyhotelsweb/history-context.md`
