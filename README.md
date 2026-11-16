# Campus Food Pantry

CST250 app: Java Spring Boot, Supabase Auth/PostgreSQL, and React Native/Expo. Open signup; MEMBER for everyone except the one verified server-side ADMIN_USER_ID. Requests are FIFO with a five-unit weekly quota.

## Layout

| Directory | Purpose |
| --- | --- |
| backend/ | Java API, Maven tests, private database migration and SQL checks |
| mobile/ | Expo app and TypeScript screens |
| legacy-console/ | Original course program and regression tests, preserved byte-for-byte |
| .github/ | PR validation, gated deployment and main-branch ruleset |
| scripts/ | Local PowerShell launch and domain checks |
| docs/ | Architecture, code reuse, deployment and verified status |

Generated bundles, dependencies, local caches and credentials are ignored. Never commit .env, database passwords or privileged Supabase keys.

## Run the Java API

Requirements: Java 21+, Maven 3.6.3+, and a configured PostgreSQL/Supabase project.

1. Copy backend/.env.example to backend/.env and fill in the server connection settings.
2. Use the limited pantry_app database login. Retrieve the actual JDBC host and username from Supabase's Connect panel; keep its password server-side.
3. Set ADMIN_USER_ID only after verifying Jules's Supabase Auth UUID. Empty grants admin access to nobody.
4. From the repository root:

```powershell
.\scripts\start-api.ps1
```

If Maven is bundled with NetBeans and is not in PATH, pass its executable using -MavenCommand.

GET /health checks HTTP availability; /health/ready also checks database access. Business routes under /api/v1 require a Supabase bearer token. The existing project's schema is already provisioned: keep RUN_MIGRATIONS=false until a deliberate migration baseline is established.

## Run Expo

Requirements: Node.js 22.13+ and npm. Copy mobile/.env.example to mobile/.env and set EXPO_PUBLIC_API_URL to a reachable Java API. The Supabase publishable key is public and grants no direct access to private pantry tables.

```powershell
cd mobile
npm ci
npm run typecheck
npm run check:expo
npm start
```

Use Expo Go on a phone, or npm run web in a browser. A phone cannot reach the PC API through localhost: use a reachable LAN address or deployed HTTPS API. An Expo tunnel does not also expose Java. TestFlight requires a separate signed native build and Apple configuration.

Run npm run build:web for a static web bundle. Configure the API's CORS_ORIGINS with the exact web origin. Supabase email delivery and allowed redirect URLs must be configured before testing signup and password recovery end to end.

## Tests and pull requests

```powershell
.\scripts\check-domain.ps1
cd backend
mvn -B -ntp verify
```

Every PR to main runs original console tests, Java/Spring tests and Docker build, SQL checks on isolated PostgreSQL, TypeScript, Expo dependency checks, and iOS/Android/web JavaScript bundling. The aggregate check is **CI passed**. Bundling is not a signed native build or a device test.

[CI/CD setup](docs/CI_CD.md) explains mandatory PR checks and deployment configuration. Committing a workflow or ruleset file alone does not protect main.

## Deployment and status

render.yaml declares one free Java Docker service. Render auto-deploy stays off; the GitHub deployment job is enabled only after its protected secret and repository variable are configured. It runs only for a validated push to main, never for a PR.

Read [Render setup](docs/DEPLOYMENT_RENDER.md), [verified status](docs/STATUS.md), [architecture](docs/ARCHITECTURE.md), [course-code reuse](docs/REUSE.md), and [CONTEXT.md](CONTEXT.md) before changing product decisions.
