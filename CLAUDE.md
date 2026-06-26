# QuickNest — Stayflex Owner Portal

## Project Identity
**Brand:** QuickNest / Stayflex
**Portal:** Multi-role partner portal (Owner, Admin, Support)
**Stack:** Vite 5 + React 18 + TypeScript 5 strict
**Package manager:** npm

---

## Tech Stack (Locked)

| Layer | Choice |
|-------|--------|
| Build | Vite 5 |
| UI | React 18 |
| Routing | TanStack Router (file-based, `src/routes/`) |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 (persist middleware) |
| Forms | React Hook Form + Zod |
| UI components | shadcn-style (custom, `src/components/ui/`) |
| Styling | Tailwind CSS v4 (`@theme` tokens in `src/index.css`) |
| Icons | lucide-react |
| Toasts | sonner |
| Testing | Vitest + React Testing Library + MSW + Playwright |
| Fonts | Sora (display) · DM Sans (body) · JetBrains Mono (mono) |

---

## Active Skills

| Skill | When |
|-------|------|
| `token-budget` | Every session — always active |
| `senior-frontend` | Component work, bundle analysis |
| `senior-fullstack` | Architecture decisions |
| `epic-design` | UI/UX polish |
| `senior-qa` | Tests per phase |
| `review-changes` | Before each commit |
| `tdd-guide` | When writing tests |

---

## Design Tokens (from Stayflex design handoff)

| Token | Value | Usage |
|-------|-------|-------|
| `primary-600` | `#FF8F00` | CTAs, active nav, links |
| `primary-700` | `#E65100` | Hover/pressed |
| `primary-50` | `#FFF8E1` | Background tints |
| `navy-900` | `#0F172A` | Primary text |
| `navy-600` | `#475569` | Secondary text |
| `navy-100` | `#F1F5F9` | Surface |
| `navy-50` | `#F8FAFC` | Page background |
| `border` | `#E2E8F0` | All borders |
| Admin bg | `#0A0F1C` | Admin portal background |
| Admin sidebar | `#070B14` | Admin sidebar |

---

## Directory Structure

```
src/
├── routes/                  ← TanStack Router file-based routes
│   ├── __root.tsx           ← Root (Toaster)
│   ├── index.tsx            ← Role-based redirect
│   ├── login.tsx
│   ├── owner/
│   │   ├── route.tsx        ← Owner guard + OwnerShell
│   │   ├── onboarding/
│   │   │   ├── route.tsx    ← WizardShell wrapper
│   │   │   └── step1-7.tsx
│   │   ├── status.tsx
│   │   └── dashboard.tsx    ← approval-gated
│   ├── admin/
│   │   ├── route.tsx        ← Admin guard + AdminShell
│   │   └── verification.tsx
│   └── support/
│       ├── route.tsx        ← Support guard + SupportShell
│       └── dashboard.tsx
│
├── components/
│   ├── ui/                  ← Button, Input, Badge, Card, Dialog, Tabs…
│   ├── shared/              ← PhotoTile, AutoSaveIndicator, StepProgress,
│   │                          DocumentUploader, StatusTracker, FieldWrapper,
│   │                          SectionCard, EmptyState
│   ├── owner/               ← OwnerShell, WizardShell
│   ├── admin/               ← AdminShell
│   └── support/             ← SupportShell
│
├── pages/
│   ├── auth/LoginPage.tsx
│   ├── owner/
│   │   ├── onboarding/      ← Step1–7 pages (Phase 2)
│   │   ├── portal/          ← Post-approval screens (Phase 3)
│   │   └── OwnerStatusPage.tsx
│   ├── admin/               ← Phase 4
│   └── support/             ← Phase 5
│
├── modules/
│   ├── auth/mocks/api.ts    ← 4 demo users, mock JWT
│   └── owner/mocks/api.ts   ← IFSC, GST, penny-drop, pincode mocks
│
├── store/
│   ├── auth.store.ts        ← user, token, onboarding status (persisted)
│   ├── onboarding.store.ts  ← wizard step, auto-save state (persisted)
│   └── ui.store.ts          ← sidebar collapsed
│
├── hooks/
│   ├── useAuth.ts
│   ├── usePermission.ts     ← role + approval gate
│   └── useAutoSave.ts       ← debounced save with indicator
│
├── lib/
│   ├── utils.ts             ← cn(), formatINR(), maskPhone()…
│   ├── api.ts               ← Axios client + 401 interceptor
│   ├── queryClient.ts       ← TanStack Query defaults
│   └── permissions.ts       ← ROLE_PERMISSIONS matrix + APPROVAL_GATED
│
├── types/index.ts           ← User, Role, OnboardingStatus, Permission
└── test/
    ├── setup.ts             ← jest-dom + MSW server
    └── mocks/               ← handlers.ts + server.ts
```

---

## Role Access Model

```
Owner login
 ├── onboardingStatus: not_started | in_progress  → /owner/onboarding/step1
 ├── onboardingStatus: submitted | under_review    → /owner/status
 ├── onboardingStatus: revision_requested          → /owner/status (+ revision banner)
 └── onboardingStatus: approved                    → /owner/dashboard (full portal)

Admin login  → /admin/verification
Support login → /support/dashboard
```

Sidebar nav items with `needsApproval: true` show lock icon + tooltip when owner is pending.

---

## Demo Credentials

| User | Email | Password | State |
|------|-------|----------|-------|
| Owner (onboarding) | owner@demo.com | demo1234 | Step 1 in progress |
| Owner (approved) | approved@demo.com | demo1234 | Full portal access |
| Admin | admin@demo.com | demo1234 | Verification queue |
| Support | support@demo.com | demo1234 | Support dashboard |

---

## Onboarding — 7 Steps

| Step | Screen | Key fields |
|------|--------|-----------|
| 1 | Account & Owner | Legal contact, phone, email, business entity |
| 2 | Property Info | Name, type, address, map pin, description |
| 3 | Media & Gallery | Cover image, gallery checklist, photo upload quality rules |
| 4 | Rooms & Pricing | Room types, capacity, hourly pricing, dynamic pricing |
| 5 | Documents & KYC | Entity-specific doc uploads (ownership, trade license, fire NOC, PAN, Aadhaar...) |
| 6 | Bank & Payouts | IFSC lookup, account type, penny-drop, payout schedule, tax info panel |
| 7 | Review & Submit | Confirmation checklist and final submission |

Auto-save on blur → debounced 1.5s → `AutoSaveIndicator` in wizard header.

---

## Build & Test Commands

```bash
npm run dev          # tsr generate + vite dev (port 3000)
npm run build        # tsr generate + tsc + vite build
npm run test         # vitest run
npm run test:watch   # vitest watch
npm run test:coverage # vitest coverage (80% threshold)
npm run e2e          # playwright test
npm run format       # prettier write
npm run tsr          # regenerate route tree after adding routes
```

---

## Coding Rules

- Plan → confirm → code (never implement without user sign-off on module spec)
- No comments unless WHY is non-obvious
- No abstraction beyond task scope
- All forms: react-hook-form + zod
- All async: async/await
- Zustand for cross-component state; useState for local UI only
- `cn()` for all className merging
- Tailwind tokens via CSS `@theme` — never hardcode hex values in components
- Route guards in `beforeLoad` — never in component body
- Auto-save: useAutoSave hook → ownerApi.autoSave → store state
- Add new routes → run `npm run tsr` to regenerate routeTree.gen.ts

---

## Phase Build Order

```
Phase 0  ✅ Scaffold (complete)
Phase 1  → Auth (Login page — full implementation)
Phase 2  → Owner Onboarding (7 steps, full implementation)
Phase 3  → Owner Inside Portal (post-approval, 9 screens)
Phase 4  → Admin Portal (dark theme, 7 screens)
Phase 5  → Support Portal (3 screens)
Phase 6  → CI/CD GitHub Actions (5 pipelines)
```

---

## Performance Rules

See `.claude/performance-rules.md`. Key targets:
- Initial JS < 200KB gzipped (currently 76KB app chunk ✅)
- LCP < 2.5s, INP < 200ms, CLS < 0.1
- Chunks: vendor-react, vendor-router, vendor-query, vendor-radix, vendor-form, vendor-ui
- Code-split: lazy() wrap for phase 3–5 heavy screens

---

## CI/CD (Phase 6)

Five GitHub Actions pipelines to deliver:
1. `pr-checks.yml` — lint, typecheck, unit tests, 80% coverage gate
2. `e2e.yml` — Playwright role flows on PR to main
3. `preview.yml` — Cloudflare Pages preview deploy on PR
4. `deploy-prod.yml` — build + deploy on merge to main
5. `security.yml` — weekly npm audit + CodeQL
