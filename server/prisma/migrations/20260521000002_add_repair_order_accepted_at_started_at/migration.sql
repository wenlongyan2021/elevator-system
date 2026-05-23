-- AlterTable: add remaining missing columns (with IF NOT EXISTS since some
-- may already exist from a previous deploy that re-applied an edited migration)
ALTER TABLE "RepairOrder"
ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);

ALTER TABLE "MaintenancePlan"
ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
