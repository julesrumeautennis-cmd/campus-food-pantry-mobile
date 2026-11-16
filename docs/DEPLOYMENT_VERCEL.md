# Vercel deployment

## Architecture and current state

Jules chose Vercel instead of Render on 2026-11-16. The Java backend stays Java: Vercel Services runs its Docker container alongside the Expo web export in one project. Services and the container runtime are beta; verify availability and the team's actual allowance before deploying. No paid plan or usage is authorized. No pantry project or live deployment has been created in Vercel yet.

`vercel.json` routes `/api/*` and `/health` (including `/health/ready`) to the Java service, preserving the path. Other paths go to the Expo web service, whose fallback serves `index.html`. Region `cle1` keeps the API near the existing Supabase us-east-2 project. The browser uses relative API requests. Native Expo builds need the project's actual HTTPS origin in `EXPO_PUBLIC_API_URL`.

The Dockerfile uses Java 21, runs Maven verify, starts as a non-root user, and activates the `vercel` Spring profile. It binds to `0.0.0.0`, supports forwarded HTTPS origins, graceful termination, and at most three JDBC connections per instance. Durable application state and transaction locks stay in PostgreSQL, not in the container filesystem or memory.

## Project configuration

Use repository root as Vercel project root, with `vercel.json` defining both services. Do not select `mobile/` or `backend/` as the project root. The existing team is `team_jU4K2dpV1sQDAwi2zeEc43fp`; no pantry project ID is assigned yet. Git deployment is disabled in configuration so the gated GitHub workflow controls production releases.

Set production variables in Vercel project settings. Only the `EXPO_PUBLIC_*` variables below may enter the client bundle. Never prefix a server credential with `EXPO_PUBLIC_`.

| Variable | Value or purpose |
| --- | --- |
| PORT | `8080`, set explicitly in Vercel so ingress matches the Docker port |
| SPRING_PROFILES_ACTIVE | `vercel` (also the image default) |
| SUPABASE_URL | `https://mcbciclbmnjgtqoxbvzv.supabase.co` |
| RUN_MIGRATIONS | `false` for the existing schema |
| DATABASE_URL | Actual Supabase session-pooler JDBC endpoint, with `sslmode=require` |
| DATABASE_USERNAME | Actual pooler login form for the limited `pantry_app` role |
| DATABASE_PASSWORD | Existing password, transferred only to protected server settings |
| ADMIN_USER_ID | Jules's verified Supabase Auth UUID; blank grants admin access to nobody |
| CORS_ORIGINS | Empty for same-origin Vercel web; explicit trusted origins only for separate web clients |
| EXPO_PUBLIC_SUPABASE_URL | Same public Supabase project URL |
| EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Public publishable key from this Supabase project |
| EXPO_PUBLIC_API_URL | Omit for Vercel web; set to the actual project HTTPS origin for native builds |
| EXPO_PUBLIC_AUTH_REDIRECT_URL | Final web origin registered in Supabase; native builds use their registered app redirect |

`pantry_app` already exists and inherits `pantry_backend` with limited privileges. Its credential remains in Supabase Vault under the historical name `pantry_render_database_password`; the name does not create a Render dependency. Do not rerun `backend/db/provision-runtime.sql` or rotate the credential just to rename it. Read the actual endpoint and username from Supabase Connect rather than guessing a pooler hostname. Keep migrations separate from runtime startup. Check the account's aggregate database connection limit when increasing the number of container instances.

## Release sequence

1. Obtain passing PR checks and activate `main` protection before merging. See `CI_CD.md` for the verified protection limitation and importable ruleset.
2. Create/link a Vercel project for this repository only after checking its actual plan and allowance. Do not upgrade the team or create paid resources automatically.
3. Set the variables above and configure Supabase email delivery and allowed Auth redirect URLs for the final web origin. Keep `campuspantry://auth/callback` for the native development/build flow as appropriate.
4. Configure GitHub production environment secrets `VERCEL_TOKEN` and, if deployment protection is enabled, `VERCEL_AUTOMATION_BYPASS_SECRET`. Set Actions variables `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` and finally `VERCEL_DEPLOY_ENABLED=true`.
5. A successful push-to-main validation pulls production settings, builds with the pinned Vercel CLI, and deploys with `--prebuilt --prod --skip-domain`. Production domains are not reassigned yet.
6. The workflow checks staged web pages, `/health/ready`, and unauthenticated API denial, then promotes that exact deployment only if the validated commit is still current. A failed smoke test prevents promotion.
7. Verify real member/admin flows, signup and password recovery, and native API access before calling the application ready.

The CD job remains disabled until the project, credentials and repository protection exist. CI validates the configuration schema, Docker startup and bundles independently; it does not prove that a Vercel cloud build or deployment has succeeded. Container cold starts and beta changes must be measured against the actual deployed project.

## Verification

| Request | Expected |
| --- | --- |
| `GET /` and `/requests` | 200 HTML from the Expo web service |
| `GET /health` | 200; Java HTTP process is running |
| `GET /health/ready` | 200 with accessible schema, otherwise 503 without connection details |
| `GET /api/v1/items` without a token | 401 JSON, never the SPA HTML fallback |
| `GET /api/v1/me` with a member token | That member's profile and quota |
| `GET /api/v1/admin/requests` with a member token | 403 |

References: [Vercel Services configuration](https://vercel.com/docs/services/config-reference), [container runtime](https://vercel.com/docs/functions/runtimes/container), [CLI build](https://vercel.com/docs/cli/build), [Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres).
