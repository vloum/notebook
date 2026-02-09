import { prisma } from "@/lib/db";

export async function getUserStats(userId: string) {
  const [
    entryCount,
    notebookCount,
    tagCount,
    entryByType,
    entryBySource,
    recentActivity,
    topTags,
  ] = await Promise.all([
    // Total entries
    prisma.entry.count({ where: { userId, isArchived: false } }),
    // Total notebooks
    prisma.notebook.count({ where: { userId, isArchived: false } }),
    // Total tags
    prisma.tag.count({ where: { userId } }),
    // Entries by type
    prisma.entry.groupBy({
      by: ["type"],
      where: { userId, isArchived: false },
      _count: true,
    }),
    // Entries by source
    prisma.entry.groupBy({
      by: ["source"],
      where: { userId, isArchived: false },
      _count: true,
    }),
    // Recent 30 days activity (entries created/updated per day)
    prisma.entry.groupBy({
      by: ["createdAt"],
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      _count: true,
      orderBy: { createdAt: "asc" },
    }),
    // Top tags by usage
    prisma.entryTag.groupBy({
      by: ["tagId"],
      where: { entry: { userId } },
      _count: true,
      orderBy: { _count: { tagId: "desc" } },
      take: 10,
    }),
  ]);

  // Calculate total word count
  const wordCountResult = await prisma.entry.aggregate({
    where: { userId, isArchived: false },
    _sum: { wordCount: true },
  });

  // Fetch tag names for top tags
  const tagIds = topTags.map((t) => t.tagId);
  const tagDetails = tagIds.length > 0
    ? await prisma.tag.findMany({
        where: { id: { in: tagIds } },
        select: { id: true, name: true, color: true },
      })
    : [];
  const tagMap = new Map(tagDetails.map((t) => [t.id, t]));

  // Agent operation count (last 30 days)
  const agentLogCount = await prisma.agentLog.count({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });

  // API key count
  const apiKeyCount = await prisma.apiKey.count({
    where: { userId, isActive: true },
  });

  const typeLabels: Record<string, string> = {
    note: "笔记",
    diary: "日记",
    experience: "经验",
    document: "文档",
  };

  return {
    overview: {
      totalEntries: entryCount,
      totalNotebooks: notebookCount,
      totalTags: tagCount,
      totalWords: wordCountResult._sum.wordCount || 0,
      activeApiKeys: apiKeyCount,
      agentOperations30d: agentLogCount,
    },
    byType: entryByType.map((item) => ({
      type: item.type,
      label: typeLabels[item.type] || item.type,
      count: item._count,
    })),
    bySource: entryBySource.map((item) => ({
      source: item.source,
      label: item.source === "agent" ? "AI 创建" : item.source === "manual" ? "手动创建" : "导入",
      count: item._count,
    })),
    topTags: topTags.map((item) => {
      const tag = tagMap.get(item.tagId);
      return {
        name: tag?.name || "unknown",
        color: tag?.color || null,
        count: item._count,
      };
    }),
    recentActivityDays: recentActivity.length,
  };
}
