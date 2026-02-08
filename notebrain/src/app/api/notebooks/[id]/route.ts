import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { updateNotebook, deleteNotebook } from "@/lib/services/notebook.service";

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
    const { name, description, icon } = body;

    const result = await updateNotebook(userId, id, { name, description, icon });
    if (!result) {
      return NextResponse.json(
        { success: false, error: "笔记本不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Update notebook error:", error);
    return NextResponse.json(
      { success: false, error: "更新笔记本失败" },
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

  const result = await deleteNotebook(userId, id);
  if (!result) {
    return NextResponse.json(
      { success: false, error: "笔记本不存在" },
      { status: 404 }
    );
  }
  if ("error" in result) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
