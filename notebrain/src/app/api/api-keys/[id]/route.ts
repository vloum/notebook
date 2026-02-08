import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { toggleApiKey, deleteApiKey } from "@/lib/services/api-key.service";

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
    const { is_active } = body;

    if (is_active === undefined) {
      return NextResponse.json(
        { success: false, error: "is_active 为必填项" },
        { status: 400 }
      );
    }

    const success = await toggleApiKey(userId, id, is_active);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "密钥不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Toggle API key error:", error);
    return NextResponse.json(
      { success: false, error: "操作失败" },
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

  const success = await deleteApiKey(userId, id);
  if (!success) {
    return NextResponse.json(
      { success: false, error: "密钥不存在" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
