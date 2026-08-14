import { auth } from "./firebase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const idToken = await auth.currentUser?.getIdToken();

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (idToken) headers.set("Authorization", `Bearer ${idToken}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }

  // 204 No Content (and any other empty-body success response) has nothing to parse —
  // calling res.json() on it throws "Unexpected end of JSON input" even though the
  // request succeeded, which previously made callers (e.g. product delete) think the
  // action had failed when it had actually already gone through.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
