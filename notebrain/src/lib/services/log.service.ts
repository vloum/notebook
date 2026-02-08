import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export async function createAgentLog(
  userId: string,
  data: {
    action: string;
    entryId?: string;
    entryTitle?: string;
    summary?: string;
    diffStats?: Prisma.InputJsonValue;
    metadata?: Prisma.InputJsonValue;
  }
) {
  return prisma.agentLog.create({
    data: {
      userId,
      action: data.action,
      entryId: data.entryId,
      entryTitle: data.entryTitle,
      summary: data.summary,
      diffStats: data.diffStats ?? undefined,
      metadata: data.metadata ?? undefined,
    },
  });
}

export async function listAgentLogs(
  userId: string,
  opts: { page?: number; pageSize?: number; action?: string } = {}
) {
  const { page = 1, pageSize = 50, action } = opts;

  const where: Record<string, unknown> = {
    userId,
    createdAt: {
      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // last 30 days
    },
  };
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.agentLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.agentLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      entryId: log.entryId,
      entryTitle: log.entryTitle,
      summary: log.summary,
      diffStats: log.diffStats as Record<string, number> | null,
      createdAt: log.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}

export async function getRecentLogs(userId: string, limit: number = 10) {
  const logs = await prisma.agentLog.findMany({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    entryId: log.entryId,
    entryTitle: log.entryTitle,
    summary: log.summary,
    diffStats: log.diffStats as Record<string, number> | null,
    createdAt: log.createdAt.toISOString(),
  }));
}
