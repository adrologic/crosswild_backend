#!/usr/bin/env bash
# Refresh the local MongoDB with a copy of the live database.
#
# One-way only: live → local. Nothing here ever writes to the remote, so a
# local experiment can't leak into production. Run it whenever the local copy
# has drifted or you've mangled it and want a clean start.
#
#   npm run db:pull
#
# Requires: mongodb-database-tools (brew install mongodb-database-tools)
#           a local mongod (brew services start mongodb-community)

set -euo pipefail

cd "$(dirname "$0")/.."

LOCAL_URI="mongodb://127.0.0.1:27017"
DB_NAME="${MONGODB_DB:-thecrosswild}"
DUMP_DIR="$(mktemp -d)"
trap 'rm -rf "$DUMP_DIR"' EXIT

# Read the live connection string straight out of .env so the credentials stay
# in exactly one place. Strip surrounding quotes if the value has any.
SOURCE_URI="$(grep -E '^MONGODB_URI=' .env | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"

if [ -z "$SOURCE_URI" ]; then
  echo "❌ No MONGODB_URI found in .env — nothing to pull from." >&2
  exit 1
fi

case "$SOURCE_URI" in
  *127.0.0.1*|*localhost*)
    echo "❌ MONGODB_URI in .env points at localhost — that's the destination, not a source." >&2
    exit 1
    ;;
esac

if ! mongosh --quiet "$LOCAL_URI" --eval 'db.adminCommand({ping:1})' >/dev/null 2>&1; then
  echo "❌ No local MongoDB on 27017. Start it with: brew services start mongodb-community" >&2
  exit 1
fi

echo "⬇️  Dumping live database..."
mongodump --uri="$SOURCE_URI" --out="$DUMP_DIR" --quiet

echo "⬆️  Restoring into local $DB_NAME (existing local collections are replaced)..."
mongorestore --uri="$LOCAL_URI" --nsInclude="${DB_NAME}.*" --drop --quiet "$DUMP_DIR"

echo "✅ Local $DB_NAME refreshed."
mongosh --quiet "${LOCAL_URI}/${DB_NAME}" --eval \
  'db.getCollectionNames().sort().forEach(c => { const n = db[c].countDocuments(); if (n) print("   " + c + ": " + n) })'
