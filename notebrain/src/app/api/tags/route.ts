import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { listTags } from "@/lib/services/tag.service";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const tags = await listTags(userId);
  return NextResponse.json({ success: true, data: { tags } });
}
