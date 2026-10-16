# Amenity and accommodation merge review — October 16, 2026

Scope: merge `origin/develop` into `adding-new-and-amenity-changes` in the
portal, server, and website. Preserve both accommodation/reception features and
develop's property details, hotel access, session handling, and object storage.

## Fixed integration gaps

- Portal and server restoration now retain reception mobile/landline, Other
  accommodation facilities, and room dormitory specifications. Partial revisions
  preserve these canonical values after submission clears the original draft.
- Shared portal validation now retains accommodation fields and allows dormitory
  capacity up to the documented bed count. Ordinary rooms retain the 20-person cap.
  Review completion checks enforce dormitory specifications as well as screen checks.
- Hourly-rate validation and the input minimum now match the API's 100-rupee minimum.
- Autosave keeps its trigger stable when inline error handlers change, preventing
  repeated snapshot saves on rerenders.
- Legacy authenticated document previews coexist with new signed object-storage
  previews. Legacy file reads inherit JWT and application-access guards; only
  legacy photo paths reach public static serving. Blob preview URLs are revoked.
- Amenity search combines the expanded catalog with historical aliases, retaining
  case-insensitive matching and the property-type filter.
- Removed duplicate enum members, mapping keys, imports, and test mocks produced
  by automatic merges. Reconciled dependency lockfiles with merged manifests.
- Updated old test expectations for current service labels, session-aware login,
  encrypted snapshot saves, listing status buttons, and existing KYC requirements.

## Remaining findings

1. **Document policy differs between portal and API.** The portal currently
   requires PAN, ownership/lease, cancelled cheque, business licence and applicable
   identity/entity documents. The API enforces entity-specific documents only.
   Direct API callers can submit without the extra portal-required uploads.
   Existing requirements were preserved; agree one policy before changing either
   enforcement layer. Tests now reflect each application's existing policy.
2. **Private bucket configuration is not enforced.** Storage falls back to
   `S3_BUCKET` when `S3_PRIVATE_BUCKET` is absent. Provision a separate bucket with
   public access disabled and configure it before production document uploads.
3. **New uploads require object storage.** The develop implementation replaces the
   feature branch's local upload flow. Existing local documents remain readable,
   but new uploads require the S3 configuration described in the server environment
   example. Existing local upload grants are not reintroduced.

No production migration, deployment, bucket change, or real external notification
was performed. Validation uses builds and automated unit/HTTP regression tests;
live database migration and browser end-to-end verification remain deployment checks.

## Validation

- Portal production build and 220 tests pass.
- Server production build and all 496 tests pass, including authenticated upload
  and legacy document HTTP coverage.
- Website type check, production build, and all 50 tests pass.
