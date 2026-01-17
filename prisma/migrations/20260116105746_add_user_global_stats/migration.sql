-- AlterTable
ALTER TABLE "User" ADD COLUMN "totalCompletedMilestones" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "totalCompletedProjects" INTEGER NOT NULL DEFAULT 0;

-- 更新现有数据：从数据库中计算并填充历史统计数据
-- SQLite 兼容语法
-- 更新每个用户的总完成小目标数
UPDATE "User"
SET "totalCompletedMilestones" = (
  SELECT COUNT(*)
  FROM "Milestone" m
  INNER JOIN "Project" p ON m."projectId" = p."id"
  WHERE p."userId" = "User"."id" AND m."isCompleted" = 1
);

-- 更新每个用户的总完成计划数
UPDATE "User"
SET "totalCompletedProjects" = (
  SELECT COUNT(*)
  FROM "Project" p
  WHERE p."userId" = "User"."id" AND p."isCompleted" = 1
);



