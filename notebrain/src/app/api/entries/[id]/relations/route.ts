import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { listRelations, createRelation } from "@/lib/services/relation.service";
import type { RelationType } from "@/generated/prisma/enums";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;
  const { id } = await params;

  const result = await listRelations(userId, id);
  if (!result) {
    return NextResponse.json(
      { success: false, error: "文档不存在" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: { relations: result } });
}

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
    const { to_id, type } = body;

    if (!to_id || !type) {
      return NextResponse.json(
        { success: false, error: "to_id 和 type 为必填项" },
        { status: 400 }
      );
    }

    const result = await createRelation(userId, {
      fromId: id,
      toId: to_id,
      type: type as RelationType,
    });

    if ("error" in result) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error("Create relation error:", error);
    return NextResponse.json(
      { success: false, error: "创建关联失败" },
      { status: 500 }
    );
  }
}
