-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VideoSource" AS ENUM ('GENERATED', 'INSPIRATION');

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "LearningPath" ADD COLUMN "goalId" TEXT;
ALTER TABLE "LearningPath" ADD COLUMN "outline" JSONB;

-- Backfill one Goal per existing path
UPDATE "LearningPath" SET "goalId" = gen_random_uuid()::text WHERE "goalId" IS NULL;

INSERT INTO "Goal" ("id", "userId", "prompt", "title", "status", "createdAt", "updatedAt")
SELECT "goalId", "userId", "prompt", "title", 'ACTIVE', "createdAt", CURRENT_TIMESTAMP
FROM "LearningPath"
WHERE "goalId" IS NOT NULL;

ALTER TABLE "LearningPath" ALTER COLUMN "goalId" SET NOT NULL;

ALTER TABLE "Topic" ADD COLUMN "selectedVideoId" TEXT;

ALTER TABLE "TopicVideo" ADD COLUMN "source" "VideoSource" NOT NULL DEFAULT 'GENERATED';
ALTER TABLE "TopicVideo" ADD COLUMN "selected" BOOLEAN NOT NULL DEFAULT false;

UPDATE "TopicVideo" SET "selected" = true
WHERE "id" IN (
  SELECT DISTINCT ON ("topicId") "id"
  FROM "TopicVideo"
  ORDER BY "topicId", "order" ASC
);

UPDATE "Topic" t
SET "selectedVideoId" = tv."videoId"
FROM "TopicVideo" tv
WHERE tv."topicId" = t."id" AND tv."selected" = true;

CREATE INDEX "Goal_userId_createdAt_idx" ON "Goal"("userId", "createdAt");
CREATE INDEX "Goal_userId_status_idx" ON "Goal"("userId", "status");
CREATE INDEX "LearningPath_goalId_createdAt_idx" ON "LearningPath"("goalId", "createdAt");

ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
