import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { listVersions } from "@/lib/services/version.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;
  const { id } = await params;

  const result = await listVersions(userId, id);
  if (!result) {
    return NextResponse.json(
      { success: false, error: "文档不存在" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: { versions: result } });
}
