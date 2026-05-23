-- AlterTable
ALTER TABLE "RepairOrder"
ADD COLUMN "isTrapped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "trappedCount" INTEGER;
