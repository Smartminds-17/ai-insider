import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUserId } from "@/infrastructure/auth/getOrCreateUserId";
import { getPath } from "@/application/getPath";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getOrCreateUserId();
  const path = await getPath(id, userId);

  if (!path) {
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "RESOURCE_NOT_FOUND", message: "Path not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: path, meta: {}, error: null });
}
