#!/usr/bin/env bash
#
# Copy the TheCrossWild database from MongoDB Atlas into the Coolify-managed
# MongoDB on prod01.
#
#   • Copy only. Nothing is ever dropped or deleted from Atlas.
#   • The dump is kept on disk afterwards so you can re-run the restore.
#
# Two ways to reach the target — pick one:
#
#   A. TUNNEL (default, nothing exposed). Needs `ssh <SSH_HOST>` to work. Opens an
#      SSH tunnel straight to the Mongo container.
#        export SOURCE_URI='mongodb+srv://USER:PASS@thecrosswild.j8lzvdi.mongodb.net/thecrosswild'
#        export TARGET_USER='root' TARGET_PASS='...'
#        ./scripts/migrate-mongo-to-coolify.sh
#
#   B. DIRECT, via Coolify's "Make it publicly available" toggle. No SSH needed.
#      Set TARGET_HOST and the script skips the tunnel entirely.
#        export TARGET_HOST=217.216.59.240 TARGET_PORT=27417
#        export TARGET_USER='root' TARGET_PASS='...'
#        ./scripts/migrate-mongo-to-coolify.sh
#      ⚠️ A published Docker port bypasses UFW (SERVER-RUNBOOK.md §2) — the
#      database is on the open internet for as long as the toggle is on. Untick
#      it in Coolify the moment this script finishes; the script reminds you.
#
# Optional:
#   SOURCE_DB=thecrosswild   TARGET_DB=thecrosswild
#   SSH_HOST=prod01          LOCAL_PORT=27018
#   DUMP_DIR=~/crosswild-mongo-migration/<timestamp>
#
# Requires mongodump/mongorestore locally:
#   brew install mongodb-atlas-cli mongodb-database-tools
#
set -euo pipefail

SOURCE_DB="${SOURCE_DB:-thecrosswild}"
TARGET_DB="${TARGET_DB:-thecrosswild}"
SSH_HOST="${SSH_HOST:-prod01}"
LOCAL_PORT="${LOCAL_PORT:-27018}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DUMP_DIR="${DUMP_DIR:-$HOME/crosswild-mongo-migration/$STAMP}"

die() { echo "ERROR: $*" >&2; exit 1; }

for var in SOURCE_URI TARGET_USER TARGET_PASS; do
  [ -n "${!var:-}" ] || die "$var is not set — see the usage block at the top of this script."
done
command -v mongodump    >/dev/null || die "mongodump not found. brew install mongodb-database-tools"
command -v mongorestore >/dev/null || die "mongorestore not found. brew install mongodb-database-tools"

# ── 1. Dump from Atlas ────────────────────────────────────────────────────────
# The BSON lives in $DUMP_ROOT and the verification reports beside it, so
# mongorestore only ever sees database directories.
DUMP_ROOT="$DUMP_DIR/dump"
echo "==> Dumping '$SOURCE_DB' from Atlas into $DUMP_ROOT"
mkdir -p "$DUMP_ROOT"
mongodump --uri="$SOURCE_URI" --db="$SOURCE_DB" --out="$DUMP_ROOT"

[ -d "$DUMP_ROOT/$SOURCE_DB" ] || die "Dump produced no '$SOURCE_DB' directory — check SOURCE_URI."
echo "==> Dumped $(find "$DUMP_ROOT/$SOURCE_DB" -name '*.bson' | wc -l | tr -d ' ') collections"

# ── 2. Reach the target: direct if TARGET_HOST is set, else an SSH tunnel ─────
if [ -n "${TARGET_HOST:-}" ]; then
  TARGET_PORT="${TARGET_PORT:-27417}"
  CONNECT_HOST="$TARGET_HOST"
  CONNECT_PORT="$TARGET_PORT"
  echo "==> Direct connection to $TARGET_HOST:$TARGET_PORT (Coolify public port)"
  echo "    ⚠️  This port is open to the internet while the toggle is on."
else
echo "==> Locating the Coolify MongoDB container on $SSH_HOST"
CONTAINER="$(ssh "$SSH_HOST" "docker ps --format '{{.Names}}\t{{.Image}}' | awk -F'\t' '\$2 ~ /mongo/ {print \$1}'" | head -1)"
[ -n "$CONTAINER" ] || die "No running container with a mongo image found on $SSH_HOST. Deploy the database resource in Coolify first."

CONTAINER_IP="$(ssh "$SSH_HOST" "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' '$CONTAINER'" | awk '{print $1}')"
[ -n "$CONTAINER_IP" ] || die "Could not resolve an IP for container $CONTAINER."
echo "    container=$CONTAINER ip=$CONTAINER_IP"

echo "==> Opening SSH tunnel 127.0.0.1:$LOCAL_PORT -> $CONTAINER_IP:27017"
ssh -f -N -o ExitOnForwardFailure=yes -L "$LOCAL_PORT:$CONTAINER_IP:27017" "$SSH_HOST"
TUNNEL_PID="$(pgrep -f "ssh -f -N .* -L $LOCAL_PORT:$CONTAINER_IP:27017 $SSH_HOST" | head -1 || true)"
cleanup() { [ -n "${TUNNEL_PID:-}" ] && kill "$TUNNEL_PID" 2>/dev/null || true; }
trap cleanup EXIT
  CONNECT_HOST="127.0.0.1"
  CONNECT_PORT="$LOCAL_PORT"
fi

# ── 3. Restore into the Coolify MongoDB ───────────────────────────────────────
# Credentials go in as discrete flags, never inside a URI: Coolify generates
# passwords containing @ / : % which would have to be percent-encoded in a
# connection string, and a half-encoded password fails as "auth failed".
# --authenticationDatabase=admin because Coolify creates the root user there.
#
# The connection must NOT name a database. Naming one puts mongorestore in
# single-database mode, where the positional path is expected to hold .bson
# files directly — it would walk straight past the thecrosswild/ subdirectory
# and restore 0 documents while still exiting 0.
TARGET_AUTH=(--host="$CONNECT_HOST" --port="$CONNECT_PORT"
             -u "$TARGET_USER" -p "$TARGET_PASS" --authenticationDatabase=admin)

echo "==> Restoring into '$TARGET_DB'"
echo "    (no --drop: existing documents are preserved, matching _ids are skipped)"
mongorestore \
  "${TARGET_AUTH[@]}" \
  --nsFrom="$SOURCE_DB.*" --nsTo="$TARGET_DB.*" \
  --numInsertionWorkersPerCollection=4 \
  "$DUMP_ROOT"

# ── 4. Verify: compare per-collection document counts ─────────────────────────
if command -v mongosh >/dev/null; then
  echo "==> Verifying document counts (source -> target)"
  COUNT_JS='db.getCollectionNames().sort().forEach(c => print(c + "\t" + db[c].countDocuments()))'
  mongosh "$SOURCE_URI" --quiet --eval "$COUNT_JS" > "$DUMP_DIR/counts-source.txt"
  mongosh --host "$CONNECT_HOST" --port "$CONNECT_PORT" \
    -u "$TARGET_USER" -p "$TARGET_PASS" --authenticationDatabase admin \
    "$TARGET_DB" --quiet --eval "$COUNT_JS" > "$DUMP_DIR/counts-target.txt"
  # Compare in one direction only: every source collection must exist on the
  # target with the same count. Extra collections on the target are reported but
  # are not a failure — Coolify's MongoDB ships an empty `init_collection`, and a
  # plain diff would flag that as data loss when nothing is missing at all.
  MISMATCH=0
  while IFS=$'\t' read -r col src_n; do
    [ -n "$col" ] || continue
    tgt_n="$(awk -F'\t' -v c="$col" '$1 == c { print $2 }' "$DUMP_DIR/counts-target.txt")"
    if [ -z "$tgt_n" ]; then
      echo "    ❌ MISSING on target: $col ($src_n documents)" >&2
      MISMATCH=1
    elif [ "$tgt_n" != "$src_n" ]; then
      echo "    ❌ COUNT DIFFERS: $col — source=$src_n target=$tgt_n" >&2
      MISMATCH=1
    fi
  done < "$DUMP_DIR/counts-source.txt"

  EXTRA="$(awk -F'\t' 'NR==FNR { s[$1]; next } !($1 in s) { print "       - " $1 " (" $2 " documents)" }' \
           "$DUMP_DIR/counts-source.txt" "$DUMP_DIR/counts-target.txt")"

  if [ "$MISMATCH" -eq 0 ]; then
    SRC_COLS="$(wc -l < "$DUMP_DIR/counts-source.txt" | tr -d ' ')"
    SRC_DOCS="$(awk -F'\t' '{ t += $2 } END { print t }' "$DUMP_DIR/counts-source.txt")"
    echo "    ✅ all $SRC_COLS collections present with matching counts ($SRC_DOCS documents)"
    [ -n "$EXTRA" ] && { echo "    ℹ️  extra collections on the target (harmless):"; echo "$EXTRA"; }
  else
    # A restore can report success and still have moved nothing, so this
    # comparison is the real pass/fail gate for the migration.
    echo "    ❌ the copy is NOT complete — see the lines above." >&2
    echo "       Dump retained at $DUMP_ROOT; fix the cause and re-run." >&2
    exit 1
  fi
else
  echo "==> mongosh not installed; skipping count verification (brew install mongosh)"
fi

echo
echo "Done. Dump retained at: $DUMP_DIR"
echo "Atlas is untouched — keep it running until the new API has been live and verified."

if [ -n "${TARGET_HOST:-}" ]; then
  echo
  echo "┌──────────────────────────────────────────────────────────────────────┐"
  echo "│  NOW GO UNTICK 'Make it publicly available' IN COOLIFY AND SAVE.     │"
  echo "│  The database is reachable from the internet until you do.           │"
  echo "│  The API does not need it — it talks over the internal Docker net.   │"
  echo "└──────────────────────────────────────────────────────────────────────┘"
fi
