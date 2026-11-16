# Verified status — 2026-11-16

## Source and CI

- Sources are published on branch setup/app-ci-cd in PR #1: https://github.com/julesrumeautennis-cmd/campus-food-pantry-mobile/pull/1. The original remote main commit is preserved. The PR is not merged.
- The original 11 console files remain unchanged. Local JDK checks passed: 16 original regressions and 16 adapted-domain checks.
- GitHub Actions run 43958382478 passed the console regressions, production Docker build and Maven verify (6 JUnit tests, including the 16 adapted-domain checks).
- The same run passed the real SQL migration, demo seed, five database constraints and private-table checks on an isolated PostgreSQL 17 container.
- Its first Expo typecheck found two React Native compatibility errors. The initial URL callback now accepts undefined; the removed StatusBar backgroundColor property is no longer passed.
- GitHub Actions run 43959100299 passed every validation: locked npm ci, TypeScript, Expo compatibility, all three platform bundles, Java/Docker and PostgreSQL. The aggregate CI passed check succeeded. Production deployment was correctly skipped for the PR.
- PR validation ends with CI passed, which fails if any prerequisite fails, skips or is cancelled.
- The main ruleset is prepared at .github/rulesets/main.json. Jules reports making the repository public, but subsequent connector reads still returned private=true and HTTP 403 for rulesets. Protection is not verified active. PR #1 stays a draft pending that check; no paid plan upgrade is authorized.

## Existing cloud resources

- Supabase project mcbciclbmnjgtqoxbvzv: seven private pantry tables, RLS, demo inventory and limited pantry_backend grants were provisioned and checked earlier.
- After Jules explicitly approved provisioning, pantry_app was created by migration provision_pantry_runtime_login. Its password was generated inside PostgreSQL and stored in Supabase Vault, never in Git. A real application JDBC login still needs verification.
- The last Auth check found no users. Jules's verified ADMIN_USER_ID is still unknown; never provision a guessed UUID or make the first registrant admin.
- Jules replaced Render with Vercel on 2026-11-16. The connected Vercel team is team_jU4K2dpV1sQDAwi2zeEc43fp. No pantry project, deployment or live URL has been created. The team's actual billing allowance is not established by the connector response.
- vercel.json defines an Expo web service and Java container service under the same origin; this Vercel capability is beta. Render configuration has been removed. PostgreSQL and Auth stay with Supabase.
- The CD job stays disabled until Vercel project variables, protected credentials, main protection and VERCEL_DEPLOY_ENABLED are configured. PRs cannot deploy. The staged cloud build, smoke test and promotion flow has not yet been exercised.

## Remaining work

1. Verify the reported public visibility change, then activate main's ruleset before merging. Check the latest CI result for the Vercel migration.
2. Configure the Vercel project after checking its allowance, limited JDBC credentials, same-origin web settings, email delivery and Auth redirects.
3. Verify Jules's Auth UUID, configure ADMIN_USER_ID, and test actual member/admin HTTP flows with distinct accounts.
4. Validate idempotency, FIFO/stock/quota concurrency and rollback through the real API, then test on a phone.
5. Only after these checks, publish a preview; signed TestFlight builds are a separate later step.

Local Git/npm/Maven network access remains unavailable. GitHub's connector and Actions are used to publish and validate; this is not evidence of an end-to-end deployed application.
