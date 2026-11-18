#!/usr/bin/env bash
# Drive the exported Expo app against the actual Java API with isolated member and admin identities.
set -euo pipefail
cd "$(dirname "$0")/.."
[[ "${PGHOST:-}" == 127.0.0.1 && "${PGDATABASE:-}" == pantry_ui_test ]] || {
  echo 'Set PGHOST=127.0.0.1 and PGDATABASE=pantry_ui_test on a fresh disposable PostgreSQL instance.' >&2
  exit 1
}
screens=.local/stitch-ui
mkdir -p "$screens"
psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA auth;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
INSERT INTO auth.users VALUES ('20000000-0000-4000-8000-000000000002'), ('30000000-0000-4000-8000-000000000003');
SQL
psql -v ON_ERROR_STOP=1 -f backend/src/main/resources/db/migration/V1__pantry_schema.sql
psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE pantry_ui LOGIN PASSWORD 'isolated-ui-test';
GRANT pantry_backend TO pantry_ui;
INSERT INTO pantry.item_lots(item_id,name,category,quantity,expiration_date) VALUES
  (101,'Rice','Food',20,CURRENT_DATE + 90), (102,'Pasta','Food',15,CURRENT_DATE + 90),
  (105,'Fresh Milk','Food',3,CURRENT_DATE + 7), (203,'Toothpaste','Hygiene',2,NULL),
  (109,'Canned Beans','Food',0,CURRENT_DATE + 30), (110,'Rolled Oats','Food',5,CURRENT_DATE - 2);
SQL
mvn -B -ntp -f backend/pom.xml -DskipTests package
PORT=4189 SERVER_ADDRESS=127.0.0.1 SUPABASE_URL=http://127.0.0.1:4188 ADMIN_USER_ID=30000000-0000-4000-8000-000000000003 \
  DATABASE_URL="jdbc:postgresql://127.0.0.1:${PGPORT:-5432}/pantry_ui_test" \
  DATABASE_USERNAME=pantry_ui DATABASE_PASSWORD=isolated-ui-test RUN_MIGRATIONS=false CORS_ORIGINS=http://127.0.0.1:4187 \
  java -jar backend/target/campus-pantry-api-*.jar >"$screens/java.log" 2>&1 &
api_pid=$!
python3 -m http.server 4187 --bind 127.0.0.1 --directory mobile/dist >"$screens/web.log" 2>&1 &
web_pid=$!
trap 'kill "$api_pid" "$web_pid" 2>/dev/null || true; wait "$api_pid" "$web_pid" 2>/dev/null || true' EXIT
for _ in {1..45}; do
  if curl -fsS --max-time 2 http://127.0.0.1:4189/health/ready >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS --max-time 3 http://127.0.0.1:4189/health/ready >/dev/null || { tail -40 "$screens/java.log"; exit 1; }
if [[ -n "${PANTRY_BROWSER_IMAGE:-}" ]]; then
  # Use the browsers and system libraries matching the locked Playwright version.
  # Host networking lets the isolated test read the local Java, web and JWKS fixtures.
  docker run --rm --init --network host --shm-size=512m -e PANTRY_TEST_WEBKIT=1 \
    -v "$PWD:/pantry:ro" -v "$PWD/$screens:/pantry/$screens" -w /pantry \
    "$PANTRY_BROWSER_IMAGE" node --test mobile/tests/browser/*.mjs
else
  CHROME_BIN="${CHROME_BIN:-google-chrome}" node --test mobile/tests/browser/*.mjs
fi
