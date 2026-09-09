-- AlterTable
ALTER TABLE "Progress" ADD COLUMN     "lastWatchedAt" TIMESTAMP(3),
ADD COLUMN     "positionSec" INTEGER NOT NULL DEFAULT 0;
