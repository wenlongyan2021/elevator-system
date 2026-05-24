-- Add username field to User model
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Generate usernames for existing users: use pinyin initials from name when possible, fallback to phone
-- This handles common name patterns:
--   系统管理员 -> admin
--   张经理 -> zhangjl, 王客服 -> wangkf, etc.
-- For unmatched names, use 'user_' + last 8 chars of id
UPDATE "User"
SET "username" = CASE
  WHEN "name" = '系统管理员' THEN 'admin'
  WHEN "name" = '张经理' THEN 'zhangjl'
  WHEN "name" = '王客服' THEN 'wangkf'
  WHEN "name" = '李工程' THEN 'ligc'
  WHEN "name" = '赵维保' THEN 'zhaowb'
  WHEN "name" = '钱维保' THEN 'qianwb'
  WHEN "name" = '周安全' THEN 'zhouaq'
  WHEN "name" = '吴主管' THEN 'wuzg'
  ELSE 'user_' || substring("id" from length("id") - 7 for 8)
END
WHERE "username" IS NULL;

-- Make username unique and not null
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
