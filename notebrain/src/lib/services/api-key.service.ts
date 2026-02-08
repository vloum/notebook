import { prisma } from "@/lib/db";
import { generateApiKey } from "@/lib/auth/api-key";

const MAX_KEYS_PER_USER = 10;

export async function listApiKeys(userId: string) {
  const keys = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
    },
  });

  return keys.map((key) => ({
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    expiresAt: key.expiresAt?.toISOString() ?? null,
    isActive: key.isActive,
    createdAt: key.createdAt.toISOString(),
  }));
}

export async function createApiKeyForUser(
  userId: string,
  data: { name: string; expiresAt?: string }
) {
  // Check limit
  const count = await prisma.apiKey.count({ where: { userId } });
  if (count >= MAX_KEYS_PER_USER) {
    return { error: `每个用户最多生成 ${MAX_KEYS_PER_USER} 个 API 密钥` };
  }

  const { key, keyHash, keyPrefix } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name: data.name,
      keyPrefix,
      keyHash,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });

  return {
    id: apiKey.id,
    name: apiKey.name,
    key, // full key, shown only once
    keyPrefix,
    createdAt: apiKey.createdAt.toISOString(),
  };
}

export async function toggleApiKey(
  userId: string,
  id: string,
  isActive: boolean
) {
  const result = await prisma.apiKey.updateMany({
    where: { id, userId },
    data: { isActive },
  });
  return result.count > 0;
}

export async function deleteApiKey(userId: string, id: string) {
  const result = await prisma.apiKey.deleteMany({
    where: { id, userId },
  });
  return result.count > 0;
}
