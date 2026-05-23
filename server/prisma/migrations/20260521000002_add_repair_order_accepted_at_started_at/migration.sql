-- AlterTable: add remaining missing columns to RepairOrder and MaintenancePlan
-- These were added to the Prisma schema but the earlier migration
-- (20260521000001) was already applied with only isTrapped/trappedCount.
ALTER TABLE "RepairOrder"
ADD COLUMN "acceptedAt" TIMESTAMP(3),
ADD COLUMN "startedAt" TIMESTAMP(3);

ALTER TABLE "MaintenancePlan"
ADD COLUMN "startedAt" TIMESTAMP(3);
