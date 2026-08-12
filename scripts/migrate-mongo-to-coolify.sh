#!/usr/bin/env bash
#
# Copy the TheCrossWild database from MongoDB Atlas into the Coolify-managed
# MongoDB on prod01.
#
#   • Copy only. Nothing is ever dropped or deleted from Atlas.
#   • The dump is kept on disk afterwards so you can re-run the restore.
#   • The target is reached through an SSH tunnel to the Mongo container, so the
#     database never has to be exposed on the public internet. (Coolify's
#     "public port" toggle would publish 0.0.0.0:27017, which bypasses UFW —
#     see the Docker/UFW warning in SERVER-RUNBOOK.md §2.)
#
# Usage:
#   export SOURCE_URI='mongodb+srv://USER:PASS@thecrosswild.j8lzvdi.mongodb.net/thecrosswild'
#   export TARGET_USER='...'          # Coolify Mongo username (from the DB resource)
#   export TARGET_PASS='...'          # Coolify Mongo password
#   ./scripts/migrate-mongo-to-coolify.sh
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
echo "==> Dumping '$SOURCE_DB' from Atlas into $DUMP_DIR"
mkdir -p "$DUMP_DIR"
mongodump --uri="$SOURCE_URI" --db="$SOURCE_DB" --out="$DUMP_DIR"

[ -d "$DUMP_DIR/$SOURCE_DB" ] || die "Dump produced no '$SOURCE_DB' directory — check SOURCE_URI."
echo "==> Dumped $(find "$DUMP_DIR/$SOURCE_DB" -name '*.bson' | wc -l | tr -d ' ') collections"

# ── 2. Find the Mongo container on prod01 and tunnel to it ────────────────────
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

# ── 3. Restore into the Coolify MongoDB ───────────────────────────────────────
# authSource=admin: Coolify's Mongo creates the user in the admin database.
TARGET_URI="mongodb://$TARGET_USER:$TARGET_PASS@127.0.0.1:$LOCAL_PORT/$TARGET_DB?authSource=admin&directConnection=true"

echo "==> Restoring into '$TARGET_DB' on $SSH_HOST"
echo "    (no --drop: existing documents are preserved, matching _ids are skipped)"
mongorestore \
  --uri="$TARGET_URI" \
  --nsFrom="$SOURCE_DB.*" --nsTo="$TARGET_DB.*" \
  --numInsertionWorkersPerCollection=4 \
  "$DUMP_DIR"

# ── 4. Verify: compare per-collection document counts ─────────────────────────
if command -v mongosh >/dev/null; then
  echo "==> Verifying document counts (source -> target)"
  COUNT_JS='db.getCollectionNames().sort().forEach(c => print(c + "\t" + db[c].countDocuments()))'
  mongosh "$SOURCE_URI"  --quiet --eval "$COUNT_JS" > "$DUMP_DIR/counts-source.txt"
  mongosh "$TARGET_URI"  --quiet --eval "$COUNT_JS" > "$DUMP_DIR/counts-target.txt"
  if diff -u "$DUMP_DIR/counts-source.txt" "$DUMP_DIR/counts-target.txt"; then
    echo "    ✅ identical collections and document counts"
  else
    echo "    ⚠️  counts differ — review the diff above before cutting traffic over" >&2
  fi
else
  echo "==> mongosh not installed; skipping count verification (brew install mongosh)"
fi

echo
echo "Done. Dump retained at: $DUMP_DIR"
echo "Atlas is untouched — keep it running until the new API has been live and verified."
