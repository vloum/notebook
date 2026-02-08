import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { listApiKeys, createApiKeyForUser } from "@/lib/services/api-key.service";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const keys = await listApiKeys(userId);
  return NextResponse.json({ success: true, data: { keys } });
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  try {
    const body = await req.json();
    const { name, expires_at } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "密钥名称为必填项" },
        { status: 400 }
      );
    }

    const result = await createApiKeyForUser(userId, {
      name,
      expiresAt: expires_at,
    });

    if ("error" in result) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error("Create API key error:", error);
    return NextResponse.json(
      { success: false, error: "创建密钥失败" },
      { status: 500 }
    );
  }
}
