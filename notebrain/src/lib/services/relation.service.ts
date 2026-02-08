import { prisma } from "@/lib/db";
import { RelationType } from "@/generated/prisma/enums";

export async function listRelations(userId: string, entryId: string) {
  const entry = await prisma.entry.findFirst({
    where: { id: entryId, userId },
    include: {
      relationsFrom: {
        include: { toEntry: { select: { id: true, title: true, summary: true } } },
      },
      relationsTo: {
        include: { fromEntry: { select: { id: true, title: true, summary: true } } },
      },
    },
  });

  if (!entry) return null;

  return [
    ...entry.relationsFrom.map((r) => ({
      relationId: r.id,
      targetId: r.toEntry.id,
      targetTitle: r.toEntry.title,
      targetSummary: r.toEntry.summary,
      type: r.type,
      direction: "outgoing" as const,
      createdAt: r.createdAt.toISOString(),
    })),
    ...entry.relationsTo.map((r) => ({
      relationId: r.id,
      targetId: r.fromEntry.id,
      targetTitle: r.fromEntry.title,
      targetSummary: r.fromEntry.summary,
      type: r.type,
      direction: "incoming" as const,
      createdAt: r.createdAt.toISOString(),
    })),
  ];
}

export async function createRelation(
  userId: string,
  data: { fromId: string; toId: string; type: RelationType }
) {
  // Verify both entries belong to user
  const [from, to] = await Promise.all([
    prisma.entry.findFirst({ where: { id: data.fromId, userId } }),
    prisma.entry.findFirst({ where: { id: data.toId, userId } }),
  ]);

  if (!from || !to) return { error: "文档不存在或无权限" };

  try {
    const relation = await prisma.entryRelation.create({
      data: {
        fromId: data.fromId,
        toId: data.toId,
        type: data.type,
      },
    });
    return { id: relation.id };
  } catch {
    return { error: "关联已存在" };
  }
}

export async function deleteRelation(userId: string, relationId: string) {
  // Verify ownership through the entry
  const relation = await prisma.entryRelation.findFirst({
    where: { id: relationId },
    include: { fromEntry: { select: { userId: true } } },
  });

  if (!relation || relation.fromEntry.userId !== userId) return false;

  await prisma.entryRelation.delete({ where: { id: relationId } });
  return true;
}
