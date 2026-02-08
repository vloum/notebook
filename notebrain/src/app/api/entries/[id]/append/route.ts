import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { appendEntry } from "@/lib/services/entry.service";
import type { EntrySource } from "@/generated/prisma/enums";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;
  const { id } = await params;

  try {
    const body = await req.json();
    const { content, version, source } = body;

    if (!content || version === undefined) {
      return NextResponse.json(
        { success: false, error: "content 和 version 为必填项" },
        { status: 400 }
      );
    }

    const result = await appendEntry(userId, id, {
      content,
      version,
      source: source as EntrySource,
    });

    if ("error" in result) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Append entry error:", error);
    return NextResponse.json(
      { success: false, error: "追加内容失败" },
      { status: 500 }
    );
  }
}
