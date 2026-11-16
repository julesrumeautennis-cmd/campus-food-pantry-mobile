# CI/CD and main protection

## PR validation

.github/workflows/ci-cd.yml runs for every PR to main, pushes to main, and manual dispatches. No path filters leave a required check pending. New commits cancel obsolete validation runs.

| Check | Validation |
| --- | --- |
| Java and Docker | Original regressions; Docker Maven verify; real container startup against limited PostgreSQL login; custom port, health, unauthenticated routes, forwarded same-origin CORS and unavailable database |
| PostgreSQL constraints | Fresh PostgreSQL 17, minimal Supabase Auth fixture, real migration, demo seed, five constraints and private-table access |
| Expo checks and bundles | Locked npm install, strict TypeScript, Expo compatibility, web/native API URL tests, JavaScript bundles for iOS, Android and web |
| Vercel configuration | Validate vercel.json against Vercel's official published schema |
| CI passed | Fails if any validation failed, was skipped or was cancelled |

PR jobs use no production database, Auth account or deployment credentials. PostgreSQL's fixed CI password belongs only to a disposable container. Schema checks do not substitute for API transaction/concurrency tests; bundles do not substitute for signed native builds or phone tests.

## Require checks before merging

The importable .github/rulesets/main.json requires a PR, **CI passed**, an up-to-date branch and resolved review threads. It blocks branch deletion and force pushes without bypass actors. A second person's review is optional because this personal repo may have only one maintainer.

**Activate the ruleset in GitHub; committing its file does not enable protection.** The current connector publishes files and PRs but does not expose repository ruleset administration.

1. Download .github/rulesets/main.json from the PR.
2. Open repository Settings > Rules > Rulesets > New ruleset > Import a ruleset.
3. Import the JSON, confirm main and CI passed, and save enforcement as Active.
4. Verify the rule appears and a failing PR cannot merge.

On 2026-11-16, Jules reported making the repository public. The subsequent connector checks still returned `private=true` and HTTP 403 on rulesets: "Upgrade to GitHub Pro or make this repository public to enable this feature." Recheck the actual visibility and active ruleset; do not treat the intended visibility change as proof of protection. PR #1 remains a draft until protection can be verified. No paid upgrade is authorized. The connector does not expose ruleset writes, so import the prepared JSON through GitHub Settings once available.

## Delivery after merge

Deployment stays disabled until the Vercel project, server variables and main protection are configured:

1. Follow `DEPLOYMENT_VERCEL.md`. Keep Vercel Git deployment disabled as specified in `vercel.json`.
2. Set production environment secret `VERCEL_TOKEN`; add `VERCEL_AUTOMATION_BYPASS_SECRET` if needed for protected deployment checks. Tokens are passed through environment variables, never CLI arguments.
3. Set Actions variables `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`, then `VERCEL_DEPLOY_ENABLED=true` only when configuration is complete.

After a push to main, validation runs again. The release job refuses an unprotected branch or obsolete commit. Actions are pinned to reviewed commit SHAs and Vercel CLI to 65.4.0. It pulls production settings, runs `vercel build --prod`, stages with `vercel deploy --prebuilt --prod --skip-domain`, then checks web pages, database readiness and API authentication denial. Only after success does it promote that exact deployment, rechecking main's SHA. Releases are serialized; PRs never receive deployment secrets. Configure the production environment's review policy before enabling delivery.

The workflow creates no project or paid plan and does not distribute iOS. When explicitly enabled, it deploys both the Expo web export and Java API to the preconfigured Vercel project. Its staging/promotion path has not yet been exercised against a real Vercel project; passing CI alone is not a cloud deployment test.

References: [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets), [import rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository), [Vercel CLI](https://vercel.com/docs/cli).
