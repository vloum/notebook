import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { requireUuid } from "@/lib/utils/validation";
import { deleteRelation } from "@/lib/services/relation.service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; relationId: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;
  const { relationId } = await params;
  const ridOrError = requireUuid(relationId);
  if (ridOrError instanceof NextResponse) return ridOrError;

  const success = await deleteRelation(userId, ridOrError);
  if (!success) {
    return NextResponse.json(
      { success: false, error: "关联不存在或无权限" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
