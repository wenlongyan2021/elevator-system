#!/bin/sh
set -e

echo "=== Elevator System API Entrypoint ==="

# Generate Prisma client if needed
echo "Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Seed data (idempotent: only inserts if no data exists)
if [ -f prisma/seed.js ]; then
  echo "Seeding default data..."
  node prisma/seed.js 2>/dev/null || echo "Seed skipped or already done"
fi

echo "Starting application..."
exec node dist/src/main
