#!/bin/sh
set -e

echo "=== Elevator System API Entrypoint ==="

# Generate Prisma client if needed
echo "Generating Prisma client..."
npx prisma generate

# Resolve any failed migrations so the deploy step can retry them
echo "Resolving any failed migrations..."
echo 'DELETE FROM "_prisma_migrations" WHERE "finished_at" IS NULL;' | \
  npx prisma db execute --stdin 2>/dev/null || true

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Seed data
if [ -f prisma/seed.js ]; then
  echo "Seeding default data..."
  node prisma/seed.js
  echo "Seed completed successfully"
fi

echo "Starting application..."
exec node dist/src/main
