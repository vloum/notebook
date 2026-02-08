import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-key";
import { listEntries } from "@/lib/services/entry.service";
import type { EntryType } from "@/generated/prisma/enums";

/**
 * Phase 1: Simple keyword search (title + content ILIKE).
 * Phase 2 will upgrade this to hybrid search (BM25 + vector + RRF).
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  try {
    const body = await req.json();
    const { query, filters, limit = 5 } = body;

    if (!query) {
      return NextResponse.json(
        { success: false, error: "query 为必填项" },
        { status: 400 }
      );
    }

    // Phase 1: Simple keyword search using list + filter
    // This will be replaced by hybrid search in Phase 2
    const result = await listEntries(userId, {
      notebookId: filters?.notebook_id,
      tagNames: filters?.tags,
      type: filters?.type as EntryType,
      pageSize: limit,
    });

    // Simple relevance scoring based on title/summary match
    const lowerQuery = query.toLowerCase();
    const scored = result.entries.map((entry) => {
      let score = 0;
      if (entry.title.toLowerCase().includes(lowerQuery)) score += 0.5;
      if (entry.summary?.toLowerCase().includes(lowerQuery)) score += 0.3;
      return { ...entry, relevanceScore: Math.min(score + 0.2, 1) };
    });

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return NextResponse.json({
      success: true,
      data: {
        results: scored.slice(0, limit),
        totalCount: result.total,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: "搜索失败" },
      { status: 500 }
    );
  }
}
