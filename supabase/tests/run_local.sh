#!/usr/bin/env bash
# Runs migrations 0001-0003 + the RLS/financial test suite on a throwaway local Postgres (no Supabase needed).
# Usage: PGHOST=/tmp/pgrun PGPORT=5544 PGUSER=postgres ./supabase/tests/run_local.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=kc_test_$$
psql -v ON_ERROR_STOP=1 -q -d postgres -c "create database $DB"
trap 'psql -q -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
run() { psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$1"; }
run tests/00_local_stubs.sql
run migrations/0001_schema.sql
run migrations/0002_rls_and_functions.sql
run migrations/0003_storage.sql   # 0004 needs pg_cron (Supabase only)
run tests/10_rls_and_financials.sql
echo "ALL DATABASE TESTS PASSED"
