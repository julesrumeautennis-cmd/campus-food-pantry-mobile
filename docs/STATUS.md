# Verified status

## Stitch UI integration — 2026-11-18

The five exported Stitch views are implemented in Expo and use the existing Java routes and Supabase session. The browser integration run uses the exported app, signed fixture identities, Spring Security, a limited JDBC login and disposable PostgreSQL. The mobile CI job publishes its captured screens as **stitch-ui-browser**. See [design decisions](DESIGN.md) and [reproduction](../mobile/AGENTS.md#browser-verification). Hosted Supabase Auth, physical iPhone and production observations remain outstanding.

## Integration handoff — 2026-11-18

The application baseline is PR #1 at `dfc183d`. The [build plan](BUILD.md) links four ready issues and their dependencies. The [contract](CONTRACTS.md) links the executable shared example. The new concurrency check uses independent database sessions in disposable PostgreSQL. See the integration PR checks for evidence on its latest revision.

GitHub returned an empty list of effective rules for main and reported the branch as unprotected. The checked-in ruleset targets main, requires **CI passed** and allows a sole maintainer. Importing it requires repository administration access.

## Earlier observations — 2026-11-16

## Source and CI

- Sources are published on branch setup/app-ci-cd in PR #1: https://github.com/julesrumeautennis-cmd/campus-food-pantry-mobile/pull/1. The original remote main commit is preserved. The PR is not merged.
- The original 11 console files remain unchanged. Local JDK checks passed: 16 original regressions and 16 adapted-domain checks.
- GitHub Actions run 43958382478 passed the console regressions, production Docker build and Maven verify (6 JUnit tests, including the 16 adapted-domain checks).
- The same run passed the real SQL migration, demo seed, five database constraints and private-table checks on an isolated PostgreSQL 17 container.
- Its first Expo typecheck found two React Native compatibility errors. The initial URL callback now accepts undefined; the removed StatusBar backgroundColor property is no longer passed.
- GitHub Actions run 43959100299 passed every validation: locked npm ci, TypeScript, Expo compatibility, all three platform bundles, Java/Docker and PostgreSQL. The aggregate CI passed check succeeded. Production deployment was correctly skipped for the PR.
- PR validation ends with CI passed, which fails if any prerequisite fails, skips or is cancelled.
- The main ruleset is prepared at .github/rulesets/main.json. The latest GitHub reads now confirm public visibility, an empty ruleset list and main protected=false. The connector cannot write repository administration settings, and no authenticated GitHub CLI is available locally. Activate the prepared ruleset in Settings before merging. PR #1 remains a draft; no paid plan upgrade is required or authorized.

## Vercel migration validation

- Run [43965027169](https://github.com/julesrumeautennis-cmd/campus-food-pantry-mobile/actions/runs/43965027169) passed every validation on migration commit `3f0615baba4025d25008cc1031ccfcc192950ff3`: Java/Docker, PostgreSQL, Expo, Vercel schema and the aggregate **CI passed**.
- The real container starts with the Vercel profile, a custom port and a limited database login. HTTP checks verify health/readiness, unauthenticated business/admin routes, forwarded same-origin access, rejection of an untrusted origin, and a safe 503 when database rights are removed.
- These checks exposed and fixed the CORS bean name: Spring Security now uses the intended origin policy. The schema validator uses Draft 7 because Vercel's published schema contains modern keywords despite its Draft 4 declaration. It validates both the full schema and project configuration.
- Three API-base tests cover same-origin web, explicit native origins and invalid configuration. TypeScript and iOS/Android/web exports all pass. Production deployment is skipped for PRs; no live Vercel test is claimed.

## Figma design

- [Campus Pantry — Mobile experience](https://www.figma.com/design/0yQ1YSKVzvgdbivmssuHS2?node-id=13-1286) was created in the selected jules rumeau's team.
- 56 screens/states, ten reusable component families and five prototype starting points cover member, authentication, FIFO administration, inventory, reports, movements and inspections.
- The visual review corrected text reflow; the final screen audit found no unintended child overflow or undersized linked targets. See [DESIGN.md](DESIGN.md) for scope, reference patterns and limitations.
- The proposal is editable and persistent in Figma. It is not yet implemented in React Native and uses illustrative data.

## Existing cloud resources

- Supabase project mcbciclbmnjgtqoxbvzv: seven private pantry tables, RLS, demo inventory and limited pantry_backend grants were provisioned and checked earlier.
- After Jules explicitly approved provisioning, pantry_app was created by migration provision_pantry_runtime_login. Its password was generated inside PostgreSQL and stored in Supabase Vault, never in Git. A real application JDBC login still needs verification.
- The last Auth check found no users. Jules's verified ADMIN_USER_ID is still unknown; never provision a guessed UUID or make the first registrant admin.
- Jules replaced Render with Vercel on 2026-11-16. The connected Vercel team is team_jU4K2dpV1sQDAwi2zeEc43fp. No pantry project, deployment or live URL has been created. The team's actual billing allowance is not established by the connector response.
- vercel.json defines an Expo web service and Java container service under the same origin; this Vercel capability is beta. Render configuration has been removed. PostgreSQL and Auth stay with Supabase.
- The CD job stays disabled until Vercel project variables, protected credentials, main protection and VERCEL_DEPLOY_ENABLED are configured. PRs cannot deploy. The staged cloud build, smoke test and promotion flow has not yet been exercised.

## Remaining work

1. Activate main's prepared ruleset before merging; public visibility is confirmed. Require the latest CI passed result.
2. Configure the Vercel project after checking its allowance, limited JDBC credentials, same-origin web settings, email delivery and Auth redirects.
3. Verify Jules's Auth UUID, configure ADMIN_USER_ID, and test actual member/admin HTTP flows with distinct accounts.
4. Validate idempotency, FIFO/stock/quota concurrency and rollback through the real API, then test on a phone.
5. Only after these checks, publish a preview; signed TestFlight builds are a separate later step.

Local Git/npm/Maven network access remains unavailable. GitHub's connector and Actions are used to publish and validate; this is not evidence of an end-to-end deployed application.
