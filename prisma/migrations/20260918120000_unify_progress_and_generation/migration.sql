-- Progress originally used positionSec/lastWatchedAt, then gained a second,
-- incompatible watchedSeconds/lastPositionSec representation. Keep the latter
-- as the canonical API contract and preserve existing resume positions.
UPDATE "Progress"
SET "lastPositionSec" = GREATEST("lastPositionSec", "positionSec"),
    "updatedAt" = COALESCE("lastWatchedAt", "updatedAt")
WHERE "positionSec" > 0 OR "lastWatchedAt" IS NOT NULL;

ALTER TABLE "Progress"
  DROP COLUMN "positionSec",
  DROP COLUMN "lastWatchedAt";

-- A retry must reuse a topic at a given position instead of duplicating it.
CREATE UNIQUE INDEX "Topic_learningPathId_order_key" ON "Topic"("learningPathId", "order");
