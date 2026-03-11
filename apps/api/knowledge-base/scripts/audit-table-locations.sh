#!/usr/bin/env bash
# audit-table-locations.sh — Show current table/schema layout and FK inventory.
# Bash 3.2-compatible.
#
# Usage:
#   ./scripts/audit-table-locations.sh

set -euo pipefail

DB_HOST="${KB_DB_HOST:-localhost}"
DB_PORT="${KB_DB_PORT:-5433}"
DB_USER="${KB_DB_USER:-kbuser}"
DB_NAME="${KB_DB_NAME:-knowledgebase}"

if [ -n "${KB_DB_PASSWORD:-}" ]; then
  export PGPASSWORD="$KB_DB_PASSWORD"
fi

psql_query() {
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 --no-psqlrc -c "$1"
}

echo "=== Table Inventory by Schema ==="
echo ""
psql_query "
SELECT table_schema, table_name, table_type
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;
"

echo ""
echo "=== Foreign Key Inventory ==="
echo ""
psql_query "
SELECT
  tc.table_schema || '.' || tc.table_name AS source_table,
  kcu.column_name AS fk_column,
  ccu.table_schema || '.' || ccu.table_name AS target_table,
  ccu.column_name AS target_column,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
  AND tc.table_schema = ccu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_schema, tc.table_name;
"

echo ""
echo "=== Schema Summary ==="
echo ""
psql_query "
SELECT table_schema, count(*) AS table_count
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
GROUP BY table_schema
ORDER BY table_schema;
"
