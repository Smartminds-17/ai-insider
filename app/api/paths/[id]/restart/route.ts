import { getOrCreateUserId } from "@/infrastructure/auth/getOrCreateUserId";
import { restartStuckPath } from "@/infrastructure/queues/pathGeneration.queue";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getOrCreateUserId();
    const { id: pathId } = await context.params;

    const result = await restartStuckPath(pathId, userId);
    return NextResponse.json({ 
      success: true, 
      jobId: result.jobId,
      message: "Path restarted successfully" 
    });
  } catch (err) {
    console.error("Failed to restart path:", err);
    return NextResponse.json(
      { 
        success: false, 
        error: err instanceof Error ? err.message : "Failed to restart path" 
      },
      { status: 500 }
    );
  }
}