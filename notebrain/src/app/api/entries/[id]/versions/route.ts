import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { requireUuid } from "@/lib/utils/validation";
import { listVersions } from "@/lib/services/version.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;
  const idOrError = requireUuid((await params).id);
  if (idOrError instanceof NextResponse) return idOrError;

  const result = await listVersions(userId, idOrError);
  if (!result) {
    return NextResponse.json(
      { success: false, error: "文档不存在" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: { versions: result } });
}
