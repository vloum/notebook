import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const API_KEY_PREFIX = "nb_sk_";

/**
 * Generate a new API key
 * Returns the full key (shown only once) and the hash for storage
 */
export function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
  const randomPart = randomBytes(32).toString("base64url").slice(0, 32);
  const key = `${API_KEY_PREFIX}${randomPart}`;
  const keyHash = hashApiKey(key);
  const keyPrefix = key.slice(0, 10) + "...";
  return { key, keyHash, keyPrefix };
}

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Verify an API key and return the user ID
 * Also updates last_used_at
 */
export async function verifyApiKey(
  key: string
): Promise<{ userId: string } | null> {
  const keyHash = hashApiKey(key);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: { id: true, userId: true, isActive: true, expiresAt: true },
  });

  if (!apiKey) return null;
  if (!apiKey.isActive) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update last used (fire and forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // ignore errors on last_used_at update
    });

  return { userId: apiKey.userId };
}

/**
 * Get the authenticated user ID from a request.
 * Supports both NextAuth session (browser) and API Key (MCP).
 */
export async function getAuthUserId(
  req: NextRequest
): Promise<string | null> {
  // Check for Bearer token (API Key)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token.startsWith(API_KEY_PREFIX)) {
      const result = await verifyApiKey(token);
      return result?.userId ?? null;
    }
  }

  // Fall back to NextAuth session
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Helper to return 401 if not authenticated
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ userId: string } | Response> {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  return { userId };
}
