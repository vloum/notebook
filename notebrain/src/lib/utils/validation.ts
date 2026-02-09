import { NextResponse } from "next/server";

/**
 * Validate if a string is a valid UUID v4 format.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return UUID_REGEX.test(value);
}

/**
 * Validate UUID and return it, or return undefined if invalid.
 * Use this for optional UUID parameters (query strings).
 */
export function sanitizeUuid(value: string | null | undefined): string | undefined {
  if (!value || !isValidUuid(value)) return undefined;
  return value;
}

/**
 * Validate a required UUID path parameter.
 * Returns 400 response if invalid, or the validated id string.
 */
export function requireUuid(id: string): string | NextResponse {
  if (!isValidUuid(id)) {
    return NextResponse.json(
      { success: false, error: "无效的 ID 格式" },
      { status: 400 }
    );
  }
  return id;
}
