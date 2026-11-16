# Render Free deployment

## Current state

The source is published in PR #1. No Render service or API URL is deployed yet. The existing connection previously confirmed My Workspace (tea-dbqe4fjncjis73a317mg). Do not recreate the GitHub repository or Supabase project.

render.yaml declares one Docker web service, campus-food-pantry-api, in Ohio on the free plan. It declares no database, disk, worker or paid resource. Supabase provides Auth and PostgreSQL. The Dockerfile uses Java 21, runs Maven verify, and starts as a non-root user.

## Server configuration

| Variable | Configuration |
| --- | --- |
| SPRING_PROFILES_ACTIVE | render |
| SUPABASE_URL | https://mcbciclbmnjgtqoxbvzv.supabase.co |
| RUN_MIGRATIONS | false for the existing schema |
| DATABASE_URL | Actual JDBC endpoint from Supabase Connect, with TLS |
| DATABASE_USERNAME | Actual login/pooler form for pantry_app |
| DATABASE_PASSWORD | Existing credential in Supabase Vault, transferred only to protected server settings |
| ADMIN_USER_ID | Jules's verified Auth UUID; empty means no administrator |
| CORS_ORIGINS | Exact allowed web origins, comma-separated |

pantry_app already exists and inherits pantry_backend with limited privileges. Do not rerun backend/db/provision-runtime.sql or rotate its credential during deployment. Use the actual session-pooler connection if IPv4 is required; do not guess a hostname. The SQL login and live Java connection still need an end-to-end check.

## Deployment sequence

1. Obtain passing PR checks, activate main protection, then merge the source.
2. Link this private repository in Render; Render's GitHub authorization is separate from ChatGPT's.
3. Review the Blueprint plan: exactly one free web service, no paid additions or replacements.
4. Configure the protected variables and apply the reviewed free plan. Keep Render auto-deploy off.
5. Inspect the Docker build and application logs, then check /health/ready and authenticated API behavior.
6. Configure GitHub delivery as described in CI_CD.md. Only successful main validation can trigger the exact tested commit.
7. Set the actual HTTPS API URL in Expo and test the complete member and administrator flows.

Free services can sleep between requests; allow for cold starts in development. Do not purchase a plan to bypass a limit.

## Verification

| Request | Expected |
| --- | --- |
| GET /health | HTTP 200; process is running |
| GET /health/ready | 200 with accessible schema, otherwise 503 without connection details |
| GET /api/v1/items without a token | 401 |
| GET /api/v1/me with a real member token | That member's profile and quota |
| GET /api/v1/admin/requests with a member token | 403 |

A successful deploy-hook response only acknowledges the request. Confirm Render's rollout and test the API; it is not proof of a successful deployment.
