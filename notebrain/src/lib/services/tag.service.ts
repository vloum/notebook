import { prisma } from "@/lib/db";

export async function listTags(userId: string) {
  const tags = await prisma.tag.findMany({
    where: { userId },
    include: {
      _count: { select: { entries: true } },
    },
    orderBy: { name: "asc" },
  });

  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    count: tag._count.entries,
  }));
}

/**
 * Find or create tags by name for a user.
 * Returns an array of tag IDs.
 */
export async function findOrCreateTags(
  userId: string,
  tagNames: string[]
): Promise<string[]> {
  const tagIds: string[] = [];

  for (const name of tagNames) {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) continue;

    let tag = await prisma.tag.findUnique({
      where: { userId_name: { userId, name: trimmed } },
    });

    if (!tag) {
      tag = await prisma.tag.create({
        data: { userId, name: trimmed },
      });
    }

    tagIds.push(tag.id);
  }

  return tagIds;
}
