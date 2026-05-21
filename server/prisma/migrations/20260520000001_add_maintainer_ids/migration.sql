-- AlterTable
ALTER TABLE "MaintenancePlan" 
ADD COLUMN "maintainerIds" TEXT[];

-- 迁移数据：将现有的 maintainerId 迁移到 maintainerIds 数组中
UPDATE "MaintenancePlan" 
SET "maintainerIds" = ARRAY["maintainerId"] 
WHERE "maintainerId" IS NOT NULL;

-- 删除旧的列和索引
DROP INDEX "MaintenancePlan_maintainerId_idx";
ALTER TABLE "MaintenancePlan" 
DROP COLUMN "maintainerId";

-- 设置字段为必填
ALTER TABLE "MaintenancePlan" 
ALTER COLUMN "maintainerIds" SET NOT NULL;
