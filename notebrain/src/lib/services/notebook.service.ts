import { prisma } from "@/lib/db";

export async function listNotebooks(userId: string) {
  const notebooks = await prisma.notebook.findMany({
    where: { userId, isArchived: false },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { entries: true } },
    },
  });

  return notebooks.map((nb) => ({
    id: nb.id,
    name: nb.name,
    description: nb.description,
    icon: nb.icon,
    isDefault: nb.isDefault,
    entryCount: nb._count.entries,
    createdAt: nb.createdAt.toISOString(),
  }));
}

export async function createNotebook(
  userId: string,
  data: { name: string; description?: string; icon?: string }
) {
  const notebook = await prisma.notebook.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      icon: data.icon || "📓",
    },
  });

  return {
    id: notebook.id,
    name: notebook.name,
    description: notebook.description,
    icon: notebook.icon,
    isDefault: notebook.isDefault,
    createdAt: notebook.createdAt.toISOString(),
  };
}

export async function updateNotebook(
  userId: string,
  id: string,
  data: { name?: string; description?: string; icon?: string }
) {
  const notebook = await prisma.notebook.updateMany({
    where: { id, userId },
    data,
  });

  if (notebook.count === 0) return null;

  return prisma.notebook.findUnique({ where: { id } });
}

export async function deleteNotebook(userId: string, id: string) {
  // Find user's default notebook
  const defaultNotebook = await prisma.notebook.findFirst({
    where: { userId, isDefault: true },
  });

  if (!defaultNotebook) return null;
  if (defaultNotebook.id === id) {
    return { error: "不能删除默认笔记本" };
  }

  // Move entries to default notebook
  await prisma.entry.updateMany({
    where: { notebookId: id, userId },
    data: { notebookId: defaultNotebook.id },
  });

  // Delete the notebook
  const result = await prisma.notebook.deleteMany({
    where: { id, userId },
  });

  return result.count > 0 ? { success: true } : null;
}

/**
 * Ensure user has a default notebook (called on first login / register)
 */
export async function ensureDefaultNotebook(userId: string) {
  const existing = await prisma.notebook.findFirst({
    where: { userId, isDefault: true },
  });
  if (existing) return existing;

  return prisma.notebook.create({
    data: {
      userId,
      name: "默认笔记本",
      icon: "📓",
      isDefault: true,
    },
  });
}
