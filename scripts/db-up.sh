#!/usr/bin/env bash
# Start an isolated local Postgres for WorkWorld RLS integration tests.
# Supabase-compatible roles/claims; NOT a hosted project. Never touches
# any existing database.
set -Eeuo pipefail

NAME="workworld-pg-test"
PORT="${WW_TEST_PG_PORT:-54329}"
IMAGE="postgres:16-alpine"

if docker ps --format '{{.Names}}' | grep -qx "$NAME"; then
  echo "db-up: $NAME already running on port $PORT"
else
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker run -d --name "$NAME" \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=workworld_test \
    -p "127.0.0.1:${PORT}:5432" \
    "$IMAGE" >/dev/null
  echo "db-up: started $NAME ($IMAGE) on 127.0.0.1:$PORT"
fi

# Wait for the FINAL server to accept TCP on the published host port.
# pg_isready via `docker exec` (no -h) also succeeds against the short-lived
# initdb temp server, which caused a race: migrations ran too early, failed,
# the script still continued, and tests later found an unmigrated DB.
ready=0
for i in $(seq 1 90); do
  if timeout 1 bash -c "exec 3<>/dev/tcp/127.0.0.1/${PORT}" 2>/dev/null; then
    if docker exec "$NAME" pg_isready -h 127.0.0.1 -p 5432 -U postgres -d workworld_test >/dev/null 2>&1; then
      ready=1
      break
    fi
  fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  echo "db-up: postgres never became TCP-ready on ${PORT}; removing container" >&2
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  exit 1
fi

export WW_TEST_PG_URL="postgres://postgres:postgres@127.0.0.1:${PORT}/workworld_test"
if ! node scripts/apply-migrations.mjs; then
  echo "db-up: migrations failed; removing container so tests skip honestly" >&2
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  exit 1
fi

# Prove the schema is queryable before declaring success.
if ! docker exec "$NAME" psql -U postgres -d workworld_test -tAc \
    "select to_regclass('workworld.assessments') is not null" | grep -qx "t"; then
  echo "db-up: schema verification failed (workworld.assessments missing)" >&2
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  exit 1
fi

echo "db-up: all ordered migrations applied + schema verified"
echo "db-up: WW_TEST_PG_URL=$WW_TEST_PG_URL"
