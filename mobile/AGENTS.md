# Expo and TypeScript checks

From the repository root, with Node 22.13+ and npm installed:

```bash
cd mobile
npm ci
npm run typecheck
npm run check:expo
node --experimental-strip-types --test tests/*.test.mjs
npx expo export --platform all
```

Use [the contract and examples](../docs/CONTRACTS.md) to develop against the Java API before an authenticated test service is available. Keep `src/types.ts`, HTTP call sites and the consumer check consistent. Consult [the design handoff](../docs/DESIGN.md) before building screens.

For an interactive test use the root [README](../README.md#run-expo) to configure your local environment and run `npm start` from this directory. Record the device, app revision, account role and observed behavior for any claim about an iPhone. Label an Expo export as a bundle.

## Browser verification

The **Expo checks and bundles** CI job runs the member and staff experience at a 390 × 844 browser viewport and checks the shelf at 320 px. Download **stitch-ui-browser** from the workflow run to inspect the screens. The test exercises a lost submission response, idempotent retry, FIFO approval, decline reason and the resulting stock and allowance. Java verifies short-lived test JWTs. The test substitutes the Supabase password exchange and JWKS only.

To reproduce from the repository root, install Node 22.13+, JDK 21, Maven, PostgreSQL client tools, Python 3, Chrome and Docker, then run:

```bash
(
  set -eu
  db=$(docker run -d --rm -p 127.0.0.1:55432:5432 -e POSTGRES_PASSWORD=local-test -e POSTGRES_DB=pantry_ui_test postgres:17)
  trap 'docker stop "$db" >/dev/null' EXIT
  export PGHOST=127.0.0.1 PGPORT=55432 PGUSER=postgres PGPASSWORD=local-test PGDATABASE=pantry_ui_test
  until pg_isready -q; do sleep 1; done
  export EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:4188 EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ci-public-local-only EXPO_PUBLIC_API_URL=http://127.0.0.1:4189
  (cd mobile && npm ci && npx expo export --platform web)
  export CHROME_BIN="${CHROME_BIN:-$(command -v google-chrome || command -v chromium || echo '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')}"
  bash scripts/check-stitch-ui.sh
)
```

Ports 4187–4189 must be available. Screenshots are written to `.local/stitch-ui/`. Run against a new database instance each time. The fixture never changes the hosted project. Simulator and physical-device evidence are tracked separately in issue #3.
