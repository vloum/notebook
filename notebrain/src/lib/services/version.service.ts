import { prisma } from "@/lib/db";

export async function listVersions(userId: string, entryId: string) {
  // Verify ownership
  const entry = await prisma.entry.findFirst({
    where: { id: entryId, userId },
    select: { id: true },
  });
  if (!entry) return null;

  const versions = await prisma.entryVersion.findMany({
    where: { entryId },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      title: true,
      changeSummary: true,
      source: true,
      wordCount: true,
      createdAt: true,
    },
  });

  return versions.map((v) => ({
    id: v.id,
    version: v.version,
    title: v.title,
    changeSummary: v.changeSummary,
    source: v.source,
    wordCount: v.wordCount,
    createdAt: v.createdAt.toISOString(),
  }));
}
