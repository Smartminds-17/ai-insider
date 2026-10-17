/*
  Warnings:

  - You are about to drop the column `isTyping` on the `ConversationParticipant` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ConversationParticipant_conversationId_isTyping_idx";

-- AlterTable
ALTER TABLE "ConversationParticipant" DROP COLUMN "isTyping";
