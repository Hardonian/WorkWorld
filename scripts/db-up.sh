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

for i in $(seq 1 30); do
  if docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

docker exec -i "$NAME" psql -U postgres -d workworld_test < db/migrations/0001_init.sql >/dev/null
echo "db-up: migrations applied (db/migrations/0001_init.sql)"
echo "db-up: WW_TEST_PG_URL=postgres://postgres:postgres@127.0.0.1:${PORT}/workworld_test"
