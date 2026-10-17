-- AlterTable - add new columns with defaults for existing users
ALTER TABLE "User" ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Set updatedAt to match createdAt for all existing users
UPDATE "User" SET "updatedAt" = "createdAt";

-- CreateIndex
CREATE INDEX "User_isOnline_lastActiveAt_idx" ON "User"("isOnline", "lastActiveAt");

-- Add this to your existing migration
ALTER TABLE "ConversationParticipant" ADD COLUMN "isTyping" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "ConversationParticipant_conversationId_isTyping_idx" ON "ConversationParticipant"("conversationId", "isTyping");