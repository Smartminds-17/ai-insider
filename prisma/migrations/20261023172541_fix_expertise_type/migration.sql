/*
  Warnings:

  - The `expertise` column on the `MentorProfile` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "MentorProfile" DROP COLUMN "expertise",
ADD COLUMN     "expertise" TEXT[];

-- CreateIndex
CREATE INDEX "MentorProfile_expertise_idx" ON "MentorProfile"("expertise");
