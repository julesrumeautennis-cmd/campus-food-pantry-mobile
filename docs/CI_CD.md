# CI/CD and main protection

## PR validation

.github/workflows/ci-cd.yml runs for every PR to main, pushes to main, and manual dispatches. No path filters leave a required check pending. New commits cancel obsolete validation runs.

| Check | Validation |
| --- | --- |
| Java and Docker | Original console regressions; production Docker build runs Maven verify, including adapted-domain, JWT and readiness tests |
| PostgreSQL constraints | Fresh PostgreSQL 17, minimal Supabase Auth fixture, real migration, demo seed, five constraints and private-table access |
| Expo checks and bundles | Locked npm install, strict TypeScript, Expo compatibility, JavaScript bundles for iOS, Android and web |
| CI passed | Fails if any validation failed, was skipped or was cancelled |

PR jobs use no production database, Auth account or deployment credentials. PostgreSQL's fixed CI password belongs only to a disposable container. Schema checks do not substitute for API transaction/concurrency tests; bundles do not substitute for signed native builds or phone tests.

## Require checks before merging

The importable .github/rulesets/main.json requires a PR, **CI passed**, an up-to-date branch and resolved review threads. It blocks branch deletion and force pushes without bypass actors. A second person's review is optional because this personal repo may have only one maintainer.

**Activate the ruleset in GitHub; committing its file does not enable protection.** The current connector publishes files and PRs but does not expose repository ruleset administration.

1. Download .github/rulesets/main.json from the PR.
2. Open repository Settings > Rules > Rulesets > New ruleset > Import a ruleset.
3. Import the JSON, confirm main and CI passed, and save enforcement as Active.
4. Verify the rule appears and a failing PR cannot merge.

Private personal repositories require GitHub Pro or another eligible plan for rulesets. Check the existing account entitlement; do not change repository visibility or buy a plan for this setup.

## Delivery after merge

Deployment stays disabled until the free Render service is configured:

1. Configure the service using render.yaml and DEPLOYMENT_RENDER.md; keep Render auto-deploy off.
2. Save the service's secret deploy-hook URL as RENDER_DEPLOY_HOOK_URL in GitHub's production environment.
3. Set the repository Actions variable RENDER_DEPLOY_ENABLED to true only when server configuration is complete.

After a push to main, validation runs again. Only a passing run can trigger the hook with the exact validated SHA. The job checks that this is still the latest main commit, and production triggers are serialized. Hook success means Render accepted the request, not that rollout or end-to-end behavior succeeded. Verify Render's deployment state, /health/ready, and authenticated application flows.

The workflow creates no paid resources, never deploys PR code, and does not distribute iOS or publish the Expo web bundle.

References: [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets), [import rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository), [Render hooks](https://render.com/docs/deploy-hooks).
