ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "finalGoal" JSONB;

WITH parsed_project_meta AS (
  SELECT
    "id",
    substring("description" from 22)::jsonb AS meta
  FROM "Project"
  WHERE "finalGoal" IS NULL
    AND left(COALESCE("description", ''), 21) = '__ECHO_PROJECT_META__'
)
UPDATE "Project" AS project
SET "finalGoal" = parsed_project_meta.meta -> 'finalGoal'
FROM parsed_project_meta
WHERE project."id" = parsed_project_meta."id"
  AND jsonb_typeof(parsed_project_meta.meta -> 'finalGoal') = 'object';
