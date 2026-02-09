import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { requireUuid } from "@/lib/utils/validation";
import { getEntrySection, updateEntrySection } from "@/lib/services/entry.service";
import type { EntrySource } from "@/generated/prisma/enums";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;
  const { id, index } = await params;
  const idOrError = requireUuid(id);
  if (idOrError instanceof NextResponse) return idOrError;

  const sectionIndex = parseInt(index);
  if (isNaN(sectionIndex)) {
    return NextResponse.json(
      { success: false, error: "无效的 section index" },
      { status: 400 }
    );
  }

  const result = await getEntrySection(userId, idOrError, sectionIndex);
  if (!result) {
    return NextResponse.json(
      { success: false, error: "文档或 section 不存在" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: result });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;
  const { id, index } = await params;
  const idOrError = requireUuid(id);
  if (idOrError instanceof NextResponse) return idOrError;

  const sectionIndex = parseInt(index);
  if (isNaN(sectionIndex)) {
    return NextResponse.json(
      { success: false, error: "无效的 section index" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { content, version, source } = body;

    if (!content || version === undefined) {
      return NextResponse.json(
        { success: false, error: "content 和 version 为必填项" },
        { status: 400 }
      );
    }

    const result = await updateEntrySection(userId, idOrError, sectionIndex, {
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
    console.error("Update section error:", error);
    return NextResponse.json(
      { success: false, error: "更新 section 失败" },
      { status: 500 }
    );
  }
}
