import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { getEntry, updateEntry, deleteEntry } from "@/lib/services/entry.service";
import type { EntryType, EntrySource } from "@/generated/prisma/enums";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;
  const { id } = await params;

  const url = req.nextUrl.searchParams;
  const mode = url.get("mode") as "full" | "outline" | null;
  const offset = url.get("offset") ? parseInt(url.get("offset")!) : undefined;
  const limit = url.get("limit") ? parseInt(url.get("limit")!) : undefined;

  const result = await getEntry(userId, id, { mode: mode ?? undefined, offset, limit });

  if (!result) {
    return NextResponse.json(
      { success: false, error: "文档不存在" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: result });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;
  const { id } = await params;

  try {
    const body = await req.json();
    const { title, content, summary, tags, notebook_id, type, version, source, change_summary } = body;

    if (version === undefined) {
      return NextResponse.json(
        { success: false, error: "version 为必填项（乐观锁）" },
        { status: 400 }
      );
    }

    const result = await updateEntry(userId, id, {
      title,
      content,
      summary,
      tags,
      notebookId: notebook_id,
      type: type as EntryType,
      version,
      source: source as EntrySource,
      changeSummary: change_summary,
    });

    if ("error" in result) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Update entry error:", error);
    return NextResponse.json(
      { success: false, error: "更新文档失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;
  const { id } = await params;

  const success = await deleteEntry(userId, id);
  if (!success) {
    return NextResponse.json(
      { success: false, error: "文档不存在" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
