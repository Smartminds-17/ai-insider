/*
  Warnings:

  - Added the required column `lastActivityAt` to the `Conversation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "memberCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "topicTags" TEXT[];

-- CreateIndex
CREATE INDEX "Conversation_topicTags_idx" ON "Conversation"("topicTags");
