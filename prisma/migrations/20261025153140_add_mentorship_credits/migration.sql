-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mentorship_credits_last_refreshed" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "mentorship_credits_remaining" INTEGER NOT NULL DEFAULT 0;
