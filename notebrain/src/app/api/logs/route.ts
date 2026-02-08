import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { listAgentLogs, getRecentLogs } from "@/lib/services/log.service";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const url = req.nextUrl.searchParams;
  const recent = url.get("recent");

  if (recent) {
    const logs = await getRecentLogs(userId, parseInt(recent));
    return NextResponse.json({ success: true, data: { logs } });
  }

  const result = await listAgentLogs(userId, {
    page: url.get("page") ? parseInt(url.get("page")!) : undefined,
    pageSize: url.get("page_size") ? parseInt(url.get("page_size")!) : undefined,
    action: url.get("action") ?? undefined,
  });

  return NextResponse.json({ success: true, data: result });
}
