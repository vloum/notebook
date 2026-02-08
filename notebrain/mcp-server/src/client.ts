/**
 * HTTP client for calling Next.js API routes.
 * Reads API URL and API Key from environment variables.
 */

const API_URL = process.env.NOTEBRAIN_API_URL || "http://localhost:3000/api";
const API_KEY = process.env.NOTEBRAIN_API_KEY || "";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function apiGet<T = unknown>(
  path: string,
  params?: Record<string, string>
): Promise<ApiResponse<T>> {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  return res.json() as Promise<ApiResponse<T>>;
}

export async function apiPost<T = unknown>(
  path: string,
  body: unknown
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return res.json() as Promise<ApiResponse<T>>;
}

export async function apiPut<T = unknown>(
  path: string,
  body: unknown
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return res.json() as Promise<ApiResponse<T>>;
}

export async function apiDelete<T = unknown>(
  path: string
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  return res.json() as Promise<ApiResponse<T>>;
}
