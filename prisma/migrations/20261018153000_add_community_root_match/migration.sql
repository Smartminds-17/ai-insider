-- Create a unique, optional key for topic-based learning communities.
-- Legacy path-specific conversations remain valid with a NULL key.
ALTER TABLE "Conversation" ADD COLUMN "communityKey" TEXT;

CREATE UNIQUE INDEX "Conversation_communityKey_key"
ON "Conversation"("communityKey");
