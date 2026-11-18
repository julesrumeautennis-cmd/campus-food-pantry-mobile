# Backend checks

Run these commands from the repository root. Java owns the service implementation and tests. Data/Auth owns the versioned SQL and grants. Share the affected query, migration and wire response in a PR when work crosses this boundary.

## Java and domain checks

With JDK 21 and Maven installed:

```bash
mkdir -p .local/legacy-classes
javac -encoding UTF-8 -d .local/legacy-classes legacy-console/*.java legacy-console/tests/RegressionTests.java
java -cp .local/legacy-classes RegressionTests
mvn -f backend/pom.xml -B -ntp verify
```

The first two Java commands run the original program's regressions. Maven exercises the adapted domain and Spring tests. The production build and database integration checks run in the existing workflow.

## Disposable database checks

With Docker available, run the following as one Bash block. A new container uses PostgreSQL 17 and an isolated Auth fixture. The connection goes through that container's local socket.

```bash
(
  set -eu
  db=$(docker run -d --rm -e POSTGRES_PASSWORD=temporary -e POSTGRES_DB=pantry_test postgres:17)
  trap 'docker stop "$db" >/dev/null' EXIT
  # TCP becomes available after the entrypoint has completed initial database setup.
  for attempt in {1..45}; do
    docker exec "$db" pg_isready -h 127.0.0.1 -U postgres -d pantry_test >/dev/null && break
    sleep 1
  done
  query() { docker exec -i "$db" psql -X -U postgres -d pantry_test -v ON_ERROR_STOP=1; }
  query <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
SQL
  for migration in backend/src/main/resources/db/migration/V*.sql; do query < "$migration"; done
  query < backend/db/demo-seed.sql
  query < backend/db/verify-constraints.sql
)
```

The final SQL statement reports the constraint and table-access checks. Supabase Auth configuration, JDBC credentials and role assignment on a hosted instance need separate evidence. Real migrations require a reviewed deployment plan.

## Reproduce the concurrent decision on Linux

Run from the root with Docker, Maven, JDK 21, curl, Python 3 and psql. This mirrors the Java job. Ports 5432 and 9090 must be available. The smoke script creates the schema and runtime role in the disposable database, so start with a fresh container.

```bash
(
  set -eu
  export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGDATABASE=pantry_test PGPASSWORD=ci-only-password
  db=$(docker run -d --rm -p 127.0.0.1:5432:5432 -e POSTGRES_PASSWORD="$PGPASSWORD" -e POSTGRES_DB="$PGDATABASE" postgres:17)
  trap 'docker stop "$db" >/dev/null' EXIT
  docker build -t campus-pantry-api:ci backend
  for attempt in {1..45}; do pg_isready >/dev/null && break; sleep 1; done
  bash scripts/check-api.sh
  mvn -f backend/pom.xml -B -ntp -Dtest=ApprovalConcurrencyIT test
)
```
