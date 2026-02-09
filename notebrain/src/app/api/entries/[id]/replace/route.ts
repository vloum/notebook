import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { requireUuid } from "@/lib/utils/validation";
import { replaceEntryText } from "@/lib/services/entry.service";
import type { EntrySource } from "@/generated/prisma/enums";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;
  const idOrError = requireUuid((await params).id);
  if (idOrError instanceof NextResponse) return idOrError;
  const id = idOrError;

  try {
    const body = await req.json();
    const { old_text, new_text, version, source } = body;

    if (!old_text || new_text === undefined || version === undefined) {
      return NextResponse.json(
        { success: false, error: "old_text, new_text, version 为必填项" },
        { status: 400 }
      );
    }

    const result = await replaceEntryText(userId, id, {
      oldText: old_text,
      newText: new_text,
      version,
      source: source as EntrySource,
    });

    if ("error" in result && result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error.includes("冲突") ? 409 : 400 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Replace text error:", error);
    return NextResponse.json(
      { success: false, error: "替换失败" },
      { status: 500 }
    );
  }
}
