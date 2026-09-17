# Hotel-scoped portal roles

Global USER accounts enter the portal as applicants. Operational access comes from approved property memberships returned by the server. Hotel admin, manager and staff roles remain inside a property; platform ADMIN and SUPER_ADMIN remain separate.

## Server deployment dependency

Do not deploy this portal before the matching EzyHotels Server role changes and property-membership migration are validated and deployed. This PR alone does not enforce authorization: the server must validate the current membership, property approval and required permission on every operation.

Required contracts:

- GET /me/properties returns propertyId, name, status, isActive, isApplicant, role (nullable), roleName (nullable), and permissions for each application/membership. Non-approved memberships must have no operational permissions.
- GET /properties/:propertyId/team returns permissions, standard roles, customRoles and members. POST/PATCH/DELETE role routes and POST/DELETE member routes are property scoped. Owner access cannot be assigned or removed through these endpoints. Custom assignments send hotelRoleId; standard assignments send HOTEL_ADMIN, MANAGER or STAFF. Users register before assignment.
- GET /super-admin/users and /super-admin/properties accept q, page and limit and return items and total. User PATCH accepts globalRole/status; property status PATCH accepts suspended. These routes require SUPER_ADMIN.
- Booking check-in/out and hotel operations must authorize server-issued permissions. Availability room-type reads must allow view_availability as well as manage_rooms; write endpoints still require manage_rooms.
- Property approval activates OWNER membership atomically. Suspended properties retain recoverable ownership but lose operational permissions. Migration and backend regression verification remain separate server work.

Payouts and notification screens retain their existing owner-only policy. Team management is reserved for the approved owner and platform administrators. Client permission refresh runs every 15 seconds; backend authorization must reject revoked access immediately.

## Verification

- npm run build: passed (existing bundle-size and dependency annotation warnings).
- npm test -- --reporter=dot: 91 tests passed.
- npx playwright test --config playwright.roles.config.ts: 4 Chromium scenarios passed (applicant gating, staff switching, custom role assignment, platform user/hotel operations).
- ESLint on all changed TypeScript files: passed with zero warnings.
- npm run lint: fails on 17 existing warnings in public/mockServiceWorker.js and src/pages/owner/onboarding/OnboardingScreens.tsx; neither file is changed here.

Browser tests mock API responses, block external requests and use a dedicated local port. They do not establish live server/database integration coverage. The legacy browser suite targets old demo flows and was not run against the production API proxy. Run live integration verification in an isolated environment after the server dependency is deployed.
