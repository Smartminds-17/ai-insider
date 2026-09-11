-- Adds real time-based watch tracking to Progress, replacing the binary-only
-- watched flag. Existing rows default to 0 watched/last-position seconds.
ALTER TABLE "Progress" ADD COLUMN "watchedSeconds" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Progress" ADD COLUMN "lastPositionSec" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Progress" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
