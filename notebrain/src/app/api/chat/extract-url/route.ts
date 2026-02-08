import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { extractUrlContent } from "@/lib/services/url-extract.service";

/**
 * Standalone URL extraction endpoint.
 * Can be called by MCP or frontend independently of the chat flow.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: "url 为必填项" },
        { status: 400 }
      );
    }

    const result = await extractUrlContent(url);

    if ("error" in result) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("URL extraction error:", error);
    return NextResponse.json(
      { success: false, error: "提取失败" },
      { status: 500 }
    );
  }
}
