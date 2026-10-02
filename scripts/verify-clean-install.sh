#!/usr/bin/env bash
# Clean-install verification: extract the source archive into a clean directory,
# install from the lockfile, build, start, smoke-test, and shut down.
set -Eeuo pipefail

ARCHIVE="${1:-$(ls -t dist/workworld-source-*.tar.gz | head -1)}"
WORK="$(mktemp -d /tmp/ww-clean-XXXXXX)"
PORT="${WW_CLEAN_PORT:-3199}"

echo "clean-install: archive = $ARCHIVE"
echo "clean-install: workdir = $WORK"

tar -xzf "$ARCHIVE" -C "$WORK"
cd "$WORK/workworld-source"

npm ci --no-audit --no-fund >/dev/null
echo "clean-install: npm ci OK (lockfile install)"

npm run build >/dev/null 2>&1
echo "clean-install: build OK"

WW_PORT="$PORT" npm start >"$WORK/server.log" 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT

for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then break; fi
  sleep 1
done

HEALTH="$(curl -sf "http://127.0.0.1:$PORT/health")"
echo "clean-install: /health -> $HEALTH"

CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/")"
[ "$CODE" = "200" ] || { echo "clean-install: FAIL (GET / -> $CODE)"; exit 1; }
echo "clean-install: GET / -> 200"

# API smoke: start an episode and confirm observation round-trip.
RUN=$(curl -s -X POST "http://127.0.0.1:$PORT/api/episodes" \
  -H 'content-type: application/json' -d '{"scenarioId":"A1","condition":"human"}' \
  -c "$WORK/cookies" | grep -o '"runId":"[^"]*"' | head -1)
[ -n "$RUN" ] || { echo "clean-install: FAIL (episode start)"; exit 1; }
echo "clean-install: episode start OK ($RUN)"

kill $SERVER_PID 2>/dev/null || true
echo "clean-install: PASS"
