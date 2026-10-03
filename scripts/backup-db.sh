#!/usr/bin/env bash
# Automated Database Backup & Recovery Script (Pillar 9, Item 083)
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./var/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/workworld_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "Starting WorkWorld PostgreSQL backup to ${BACKUP_FILE}..."

if command -v pg_dump >/dev/null 2>&1; then
  PGPASSWORD="${PGPASSWORD:-workworld_test}" pg_dump -h "${PGHOST:-localhost}" -p "${PGPORT:-5433}" -U "${PGUSER:-workworld_test}" "${PGDATABASE:-workworld_test}" | gzip > "${BACKUP_FILE}"
  echo "Backup successfully written: ${BACKUP_FILE}"
  sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
  echo "Checksum generated: ${BACKUP_FILE}.sha256"
else
  echo "pg_dump not available in local PATH; skipping database backup execution."
fi
