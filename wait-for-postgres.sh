#!/bin/sh

set -e

host="$1"
shift
cmd="$@"

echo "🔍 Waiting for PostgreSQL at $host:5432..."

until PGPASSWORD=$DB_PASSWORD psql -h "$host" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; do
  echo "⏳ PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is up - executing command: $cmd"
exec $cmd