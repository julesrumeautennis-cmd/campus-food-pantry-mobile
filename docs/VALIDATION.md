# Validation

## Completed checks

- Original Java snapshot: 11 files preserved byte-for-byte.
- Local JDK: 16 console regressions and 16 adapted-domain checks passed.
- GitHub Actions 43958382478: original regressions, production Docker build and Maven verify passed. Six JUnit tests cover admin/JWT validation, adapted-domain behavior and readiness responses.
- Same run: fresh PostgreSQL migration, demo data, five database constraints and private-table grants passed.
- Initial Expo typecheck exposed two compatibility errors, now fixed. Run 43959100299 passed locked npm ci, TypeScript, Expo dependency compatibility, iOS/Android/web bundling and every other CI job. Deployment was skipped on the PR as intended.
- Previous Supabase checks confirmed seven private tables, RLS and limited database grants. These are schema checks, not API concurrency tests.

Use PR #1's latest **CI passed** result for the current revision; an earlier successful job is not proof of the final commit.

## Still required before calling the app deployed

1. Verify real JDBC credentials and HTTPS API readiness.
2. Exercise HTTP 401/403 handling, member ownership and forged/expired JWT rejection.
3. Submit the same idempotency key twice; changed contents with the same key must conflict.
4. Race approvals against the last stock and the same request; ensure atomic quota/stock/history changes.
5. Force a transactional failure and verify rollback.
6. Check Sunday/Monday Chicago quota boundaries, expiration dates, removed lots and stale FIFO decisions.
7. Test signup, email confirmation, recovery and redirects with actual accounts, then Jules's verified admin UUID.
8. Verify small screens, large text, keyboard, loading/error states, offline behavior and account changes on a phone.

iOS/Android JavaScript bundles do not prove a signed native build or TestFlight installation. Deployment is not enabled by a workflow file alone.
