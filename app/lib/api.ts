'use client';

// Shared fetch helper for the event-backend API.
// NEXT_PUBLIC_API_URL is injected at build time; when unset, callers must
// fall back to a "coming soon" state (never invent data).

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
export const apiConfigured = API_BASE.length > 0;

export async function apiFetch(path: string, init?: RequestInit) {
  if (!apiConfigured) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured — set it in .env.local');
  }
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}
