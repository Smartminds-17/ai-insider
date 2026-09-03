import { userJobTimestamps } from "@/infrastructure/queues/pathGeneration.queue";
import { NextResponse } from "next/server";

export async function POST() {
  // Clear all in-memory rate limit timestamps
  userJobTimestamps.clear();
  console.log("✅ Cleared all in-memory rate limit timestamps");
  return NextResponse.json({ 
    success: true, 
    message: "All rate limits cleared - you can generate paths again!" 
  });
}