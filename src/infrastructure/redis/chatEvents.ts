import { createRedisClient } from "@/infrastructure/redis/client";

const publisher = createRedisClient("chat-message-publisher");
const CHAT_MESSAGE_CHANNEL = "chat-message-events";

/** Notify authorized conversation streams that they should reload from the database. */
export async function publishChatMessageCreated(conversationId: string): Promise<void> {
  if (!publisher) return;

  try {
    await publisher.publish(CHAT_MESSAGE_CHANNEL, JSON.stringify({ conversationId }));
  } catch (error) {
    // The database write is authoritative; a missed notification must not fail message sending.
    console.warn(
      "[chat-events] Failed to publish a message notification:",
      error instanceof Error ? error.message : "Unknown Redis error"
    );
  }
}
