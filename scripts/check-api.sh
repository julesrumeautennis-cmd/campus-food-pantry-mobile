#!/usr/bin/env bash
# Isolated CI database only. Never point these fixtures at a real Supabase project.
set -euo pipefail
test "${PGDATABASE:-}" = pantry_test || { echo 'Requires the disposable pantry_test database.'; exit 1; }
psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
SQL
psql -v ON_ERROR_STOP=1 -f backend/src/main/resources/db/migration/V1__pantry_schema.sql
psql -v ON_ERROR_STOP=1 -f backend/db/demo-seed.sql
psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE pantry_ci LOGIN PASSWORD 'ci-only-password';
GRANT pantry_backend TO pantry_ci;
SQL

container="pantry-api-ci-${GITHUB_RUN_ID:-local}"
body=$(mktemp)
cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then docker logs "$container" || true; fi
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -f "$body"
  exit "$status"
}
trap cleanup EXIT
docker run --detach --rm --network host --name "$container" \
  -e PORT=9090 -e SUPABASE_URL=https://example.supabase.co \
  -e DATABASE_URL=jdbc:postgresql://localhost:5432/pantry_test \
  -e DATABASE_USERNAME=pantry_ci -e DATABASE_PASSWORD=ci-only-password \
  -e RUN_MIGRATIONS=false -e CORS_ORIGINS= \
  campus-pantry-api:ci >/dev/null

ready=false
for attempt in $(seq 1 45); do
  if curl --fail --silent --max-time 5 http://localhost:9090/health/ready >"$body"; then ready=true; break; fi
  sleep 2
done
test "$ready" = true || { echo 'Container never became ready.'; exit 1; }
python3 -c 'import json,sys; assert json.load(open(sys.argv[1])) == {"status":"ready"}' "$body"

expect_status() {
  expected=$1; shift
  actual=$(curl --silent --show-error --max-time 10 --output "$body" --write-out '%{http_code}' "$@")
  test "$actual" = "$expected" || { echo "Expected HTTP $expected, got $actual"; cat "$body"; exit 1; }
}
expect_status 200 http://localhost:9090/health
expect_status 401 http://localhost:9090/api/v1/items
python3 -c 'import json,sys; assert json.load(open(sys.argv[1]))["code"] == "UNAUTHENTICATED"' "$body"
expect_status 401 http://localhost:9090/api/v1/admin/requests
# Vercel forwards the public host/protocol. Same-origin web requests must not fail CORS.
expect_status 401 -H 'Origin: https://pantry.example' -H 'X-Forwarded-Host: pantry.example' -H 'X-Forwarded-Proto: https' http://localhost:9090/api/v1/items
expect_status 403 -H 'Origin: https://untrusted.example' -H 'X-Forwarded-Host: pantry.example' -H 'X-Forwarded-Proto: https' http://localhost:9090/api/v1/items
psql -v ON_ERROR_STOP=1 -c 'REVOKE pantry_backend FROM pantry_ci;'
expect_status 503 http://localhost:9090/health/ready
python3 -c 'import json,sys; assert json.load(open(sys.argv[1])) == {"status":"unavailable"}' "$body"
psql -v ON_ERROR_STOP=1 -c 'GRANT pantry_backend TO pantry_ci;'
echo 'PASS: non-root Vercel profile, custom port, limited JDBC login, health, authentication, forwarded origin, CORS and unavailable-database response.'
