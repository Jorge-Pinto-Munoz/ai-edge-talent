#!/usr/bin/env bash
# Prueba la migración y las políticas RLS en un Postgres local (requiere psql y un servidor accesible como 'postgres').
set -euo pipefail
DIR="$(cd "$(dirname "$0")/../.." && pwd)"
DB=aet_rls_test
TMP="$(mktemp -d)"; cp "$DIR"/tests/db/*.sql "$DIR"/supabase/migrations/*.sql "$DIR"/supabase/seed.sql "$TMP"/; chmod -R a+rX "$TMP"
run() { if [ "$(id -un)" = postgres ]; then "$@"; else su postgres -c "$(printf '%q ' "$@")"; fi; }
run dropdb --if-exists "$DB"; run createdb "$DB"
MIGS=$(cd "$DIR/supabase/migrations" && ls *.sql | sort)
ARGS=(-f "$TMP/supabase-stub.sql"); for m in $MIGS; do ARGS+=(-f "$TMP/$m"); done; ARGS+=(-f "$TMP/seed.sql")
run psql -v ON_ERROR_STOP=1 -q -d "$DB" "${ARGS[@]}"
# Las migraciones deben poder re-ejecutarse (p.ej. tras una ejecución parcial en el SQL Editor).
REARGS=(); for m in $MIGS; do REARGS+=(-f "$TMP/$m"); done; REARGS+=(-f "$TMP/seed.sql")
run psql -v ON_ERROR_STOP=1 -q -d "$DB" "${REARGS[@]}" 2>&1 | grep -v "NOTICE" || true
echo "re-ejecución de migraciones: OK"
OUT="$(run psql -q -d "$DB" -f "$TMP/rls_test.sql" -f "$TMP/journey_rls_test.sql" -f "$TMP/talent_rls_test.sql" -f "$TMP/profesor_hub_rls_test.sql" 2>&1)"; echo "$OUT"
run dropdb "$DB"
if echo "$OUT" | grep -q "MAL:"; then echo "FALLÓ"; exit 1; fi
if echo "$OUT" | grep -qE '\| f$'; then echo "FALLÓ (aserción falsa)"; exit 1; fi
echo "RLS OK"
