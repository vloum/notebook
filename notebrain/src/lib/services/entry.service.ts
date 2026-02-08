import { prisma } from "@/lib/db";
import { EntryType, EntrySource } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import {
  countWords,
  countLines,
  parseSections,
  getLineRange,
  getSectionContent,
  replaceSectionContent,
  replaceExactText,
} from "@/lib/markdown/parser";
import { findOrCreateTags } from "./tag.service";
import { ensureDefaultNotebook } from "./notebook.service";
import { createAgentLog } from "./log.service";

const LONG_DOC_THRESHOLD = parseInt(
  process.env.LONG_DOC_THRESHOLD || "2000",
  10
);

// ============================================================
// List entries
// ============================================================
export async function listEntries(
  userId: string,
  opts: {
    notebookId?: string;
    tagNames?: string[];
    type?: EntryType;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }
) {
  const {
    notebookId,
    tagNames,
    type,
    sortBy = "updatedAt",
    sortOrder = "desc",
    page = 1,
    pageSize = 20,
  } = opts;

  const where: Record<string, unknown> = { userId, isArchived: false };
  if (notebookId) where.notebookId = notebookId;
  if (type) where.type = type;
  if (tagNames && tagNames.length > 0) {
    where.tags = {
      some: { tag: { name: { in: tagNames }, userId } },
    };
  }

  const [entries, total] = await Promise.all([
    prisma.entry.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        tags: { include: { tag: true } },
        notebook: { select: { id: true, name: true } },
      },
    }),
    prisma.entry.count({ where }),
  ]);

  return {
    entries: entries.map((e) => ({
      id: e.id,
      title: e.title,
      summary: e.summary,
      type: e.type,
      source: e.source,
      wordCount: e.wordCount,
      isPinned: e.isPinned,
      tags: e.tags.map((et) => ({
        id: et.tag.id,
        name: et.tag.name,
        color: et.tag.color,
      })),
      notebook: e.notebook,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}

// ============================================================
// Get single entry (full / outline / paginated)
// ============================================================
export async function getEntry(
  userId: string,
  id: string,
  opts: { mode?: "full" | "outline"; offset?: number; limit?: number }
) {
  const entry = await prisma.entry.findFirst({
    where: { id, userId },
    include: {
      tags: { include: { tag: true } },
      notebook: { select: { id: true, name: true } },
      relationsFrom: {
        include: { toEntry: { select: { id: true, title: true, summary: true } } },
      },
      relationsTo: {
        include: { fromEntry: { select: { id: true, title: true, summary: true } } },
      },
    },
  });

  if (!entry) return null;

  const tags = entry.tags.map((et) => ({
    id: et.tag.id,
    name: et.tag.name,
    color: et.tag.color,
  }));

  const relations = [
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

  const totalLines = countLines(entry.content);

  // Mode 3: offset + limit (paginated)
  if (opts.offset !== undefined) {
    const limit = opts.limit || 100;
    const { content, hasMore } = getLineRange(entry.content, opts.offset, limit);
    return {
      mode: "page" as const,
      id: entry.id,
      title: entry.title,
      version: entry.version,
      totalLines,
      showing: { offset: opts.offset, limit, hasMore },
      content,
    };
  }

  // Determine mode
  const mode = opts.mode || (entry.wordCount >= LONG_DOC_THRESHOLD ? "outline" : "full");

  if (mode === "outline") {
    const sections = parseSections(entry.content);
    return {
      mode: "outline" as const,
      id: entry.id,
      title: entry.title,
      summary: entry.summary,
      type: entry.type,
      source: entry.source,
      version: entry.version,
      wordCount: entry.wordCount,
      totalLines,
      sections,
      tags,
      notebook: entry.notebook,
      relations,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }

  // full mode
  return {
    mode: "full" as const,
    id: entry.id,
    title: entry.title,
    content: entry.content,
    summary: entry.summary,
    type: entry.type,
    source: entry.source,
    version: entry.version,
    wordCount: entry.wordCount,
    totalLines,
    tags,
    notebook: entry.notebook,
    relations,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

// ============================================================
// Get section
// ============================================================
export async function getEntrySection(
  userId: string,
  entryId: string,
  sectionIndex: number
) {
  const entry = await prisma.entry.findFirst({
    where: { id: entryId, userId },
    select: { content: true },
  });

  if (!entry) return null;

  return getSectionContent(entry.content, sectionIndex);
}

// ============================================================
// Create entry
// ============================================================
export async function createEntry(
  userId: string,
  data: {
    title: string;
    content: string;
    notebookId?: string;
    tags?: string[];
    type?: EntryType;
    summary?: string;
    source?: EntrySource;
    metadata?: Prisma.InputJsonValue;
  }
) {
  let notebookId = data.notebookId;
  if (!notebookId) {
    const defaultNb = await ensureDefaultNotebook(userId);
    notebookId = defaultNb.id;
  }

  const wordCount = countWords(data.content);
  const summary =
    data.summary || data.content.slice(0, 200).replace(/\n/g, " ");

  const entry = await prisma.entry.create({
    data: {
      userId,
      notebookId,
      title: data.title,
      content: data.content,
      summary,
      type: data.type || "note",
      source: data.source || "manual",
      wordCount,
      metadata: data.metadata ?? undefined,
    },
  });

  // Create tags
  if (data.tags && data.tags.length > 0) {
    const tagIds = await findOrCreateTags(userId, data.tags);
    await prisma.entryTag.createMany({
      data: tagIds.map((tagId) => ({ entryId: entry.id, tagId })),
    });
  }

  // Save initial version
  await prisma.entryVersion.create({
    data: {
      entryId: entry.id,
      version: 1,
      title: entry.title,
      content: entry.content,
      summary: entry.summary,
      changeSummary: "初始创建",
      source: data.source || "manual",
      wordCount,
    },
  });

  // Log if agent
  if (data.source === "agent") {
    await createAgentLog(userId, {
      action: "create",
      entryId: entry.id,
      entryTitle: entry.title,
      summary: `创建了 "${entry.title}"`,
      diffStats: { addedWords: wordCount },
    });
  }

  return {
    id: entry.id,
    title: entry.title,
    version: entry.version,
    createdAt: entry.createdAt.toISOString(),
  };
}

// ============================================================
// Update entry (full replacement)
// ============================================================
export async function updateEntry(
  userId: string,
  id: string,
  data: {
    title?: string;
    content?: string;
    summary?: string;
    tags?: string[];
    notebookId?: string;
    type?: EntryType;
    version: number;
    source?: EntrySource;
    changeSummary?: string;
  }
) {
  // Optimistic lock check
  const existing = await prisma.entry.findFirst({
    where: { id, userId },
  });

  if (!existing) return { error: "文档不存在" };
  if (existing.version !== data.version) {
    return { error: `版本冲突：当前版本为 ${existing.version}，请求版本为 ${data.version}` };
  }

  const updateData: Record<string, unknown> = {
    version: { increment: 1 },
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) {
    updateData.content = data.content;
    updateData.wordCount = countWords(data.content);
    if (!data.summary) {
      updateData.summary = data.content.slice(0, 200).replace(/\n/g, " ");
    }
  }
  if (data.summary !== undefined) updateData.summary = data.summary;
  if (data.notebookId !== undefined) updateData.notebookId = data.notebookId;
  if (data.type !== undefined) updateData.type = data.type;

  const updated = await prisma.entry.update({
    where: { id },
    data: updateData,
  });

  // Update tags if provided
  if (data.tags !== undefined) {
    await prisma.entryTag.deleteMany({ where: { entryId: id } });
    if (data.tags.length > 0) {
      const tagIds = await findOrCreateTags(userId, data.tags);
      await prisma.entryTag.createMany({
        data: tagIds.map((tagId) => ({ entryId: id, tagId })),
      });
    }
  }

  // Save version
  await prisma.entryVersion.create({
    data: {
      entryId: id,
      version: updated.version,
      title: updated.title,
      content: updated.content,
      summary: updated.summary,
      changeSummary: data.changeSummary || "更新文档",
      source: data.source || "manual",
      wordCount: updated.wordCount,
    },
  });

  // Log if agent
  if (data.source === "agent") {
    const oldWc = existing.wordCount;
    const newWc = updated.wordCount;
    await createAgentLog(userId, {
      action: "update",
      entryId: id,
      entryTitle: updated.title,
      summary: data.changeSummary || `更新了 "${updated.title}"`,
      diffStats: {
        addedWords: Math.max(0, newWc - oldWc),
        removedWords: Math.max(0, oldWc - newWc),
      },
    });
  }

  return {
    id: updated.id,
    version: updated.version,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

// ============================================================
// Append content
// ============================================================
export async function appendEntry(
  userId: string,
  id: string,
  data: { content: string; version: number; source?: EntrySource }
) {
  const existing = await prisma.entry.findFirst({
    where: { id, userId },
  });

  if (!existing) return { error: "文档不存在" };
  if (existing.version !== data.version) {
    return { error: `版本冲突：当前版本为 ${existing.version}` };
  }

  const newContent = existing.content + "\n\n" + data.content;

  return updateEntry(userId, id, {
    content: newContent,
    version: data.version,
    source: data.source,
    changeSummary: "追加内容",
  });
}

// ============================================================
// Update section
// ============================================================
export async function updateEntrySection(
  userId: string,
  entryId: string,
  sectionIndex: number,
  data: { content: string; version: number; source?: EntrySource }
) {
  const existing = await prisma.entry.findFirst({
    where: { id: entryId, userId },
  });

  if (!existing) return { error: "文档不存在" };
  if (existing.version !== data.version) {
    return { error: `版本冲突：当前版本为 ${existing.version}` };
  }

  const newContent = replaceSectionContent(
    existing.content,
    sectionIndex,
    data.content
  );

  if (newContent === null) {
    return { error: `Section ${sectionIndex} 不存在` };
  }

  return updateEntry(userId, entryId, {
    content: newContent,
    version: data.version,
    source: data.source,
    changeSummary: `更新了 section ${sectionIndex}`,
  });
}

// ============================================================
// Replace exact text
// ============================================================
export async function replaceEntryText(
  userId: string,
  entryId: string,
  data: { oldText: string; newText: string; version: number; source?: EntrySource }
) {
  const existing = await prisma.entry.findFirst({
    where: { id: entryId, userId },
  });

  if (!existing) return { error: "文档不存在" };
  if (existing.version !== data.version) {
    return { error: `版本冲突：当前版本为 ${existing.version}` };
  }

  const result = replaceExactText(existing.content, data.oldText, data.newText);
  if (result.error) return { error: result.error };

  return updateEntry(userId, entryId, {
    content: result.content,
    version: data.version,
    source: data.source,
    changeSummary: "精确文本替换",
  });
}

// ============================================================
// Delete entry
// ============================================================
export async function deleteEntry(userId: string, id: string) {
  const result = await prisma.entry.deleteMany({
    where: { id, userId },
  });
  return result.count > 0;
}
