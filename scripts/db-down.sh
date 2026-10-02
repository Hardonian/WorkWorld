#!/usr/bin/env bash
# Stop and remove the isolated test database container.
set -Eeuo pipefail
docker rm -f workworld-pg-test >/dev/null 2>&1 || true
echo "db-down: workworld-pg-test removed"
