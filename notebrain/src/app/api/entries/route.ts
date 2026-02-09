import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { listEntries, createEntry } from "@/lib/services/entry.service";
import { sanitizeUuid } from "@/lib/utils/validation";
import type { EntryType, EntrySource } from "@/generated/prisma/enums";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const url = req.nextUrl.searchParams;
  const result = await listEntries(userId, {
    notebookId: sanitizeUuid(url.get("notebook_id")),
    tagNames: url.get("tags") ? url.get("tags")!.split(",") : undefined,
    type: (url.get("type") as EntryType) ?? undefined,
    sortBy: url.get("sort_by") ?? undefined,
    sortOrder: (url.get("sort_order") as "asc" | "desc") ?? undefined,
    page: url.get("page") ? parseInt(url.get("page")!) : undefined,
    pageSize: url.get("page_size") ? parseInt(url.get("page_size")!) : undefined,
  });

  return NextResponse.json({ success: true, data: result });
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  try {
    const body = await req.json();
    const { title, content, notebook_id, tags, type, summary, source, metadata } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: "标题和内容为必填项" },
        { status: 400 }
      );
    }

    const result = await createEntry(userId, {
      title,
      content,
      notebookId: sanitizeUuid(notebook_id),
      tags,
      type: type as EntryType,
      summary,
      source: source as EntrySource,
      metadata,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error("Create entry error:", error);
    return NextResponse.json(
      { success: false, error: "创建文档失败" },
      { status: 500 }
    );
  }
}
