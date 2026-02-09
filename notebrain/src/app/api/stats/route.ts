import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { getUserStats } from "@/lib/services/stats.service";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const stats = await getUserStats(userId);
  return NextResponse.json({ success: true, data: stats });
}
