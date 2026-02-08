import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { listNotebooks, createNotebook } from "@/lib/services/notebook.service";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const notebooks = await listNotebooks(userId);
  return NextResponse.json({ success: true, data: { notebooks } });
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  try {
    const body = await req.json();
    const { name, description, icon } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "名称为必填项" },
        { status: 400 }
      );
    }

    const notebook = await createNotebook(userId, { name, description, icon });
    return NextResponse.json({ success: true, data: notebook }, { status: 201 });
  } catch (error) {
    console.error("Create notebook error:", error);
    return NextResponse.json(
      { success: false, error: "创建笔记本失败" },
      { status: 500 }
    );
  }
}
