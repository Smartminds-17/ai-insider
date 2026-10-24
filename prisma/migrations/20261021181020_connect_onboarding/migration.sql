/*
  Warnings:

  - A unique constraint covering the columns `[stripeAccountId]` on the table `MentorProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripePaymentIntentId]` on the table `Mentorship` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- AlterTable
ALTER TABLE "MentorProfile" ADD COLUMN     "stripeAccountId" TEXT,
ADD COLUMN     "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "expertise" SET NOT NULL,
ALTER COLUMN "expertise" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Mentorship" ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "stripePaymentIntentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MentorProfile_stripeAccountId_key" ON "MentorProfile"("stripeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Mentorship_stripePaymentIntentId_key" ON "Mentorship"("stripePaymentIntentId");
