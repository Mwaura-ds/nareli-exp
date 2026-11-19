'use client';

// Shared fetch helper + typed reads for the event-backend API.
// NEXT_PUBLIC_API_URL is inlined at build time. When unset, callers show a
// "not configured" state — never invented data.

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
export const apiConfigured = API_BASE.length > 0;

export type ApiEvent = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start_time: string;
  end_time: string;
  capacity: number | null;
  current_registrations: number;
};

export type Pagination = {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type Envelope<T> = { data: T[]; pagination: Pagination };
export type Notification = {
  id: string;
  subject?: string | null;
  body: string;
  sent: boolean;
  sent_at?: string | null;
  created_at: string;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch(path: string, init?: RequestInit) {
  if (!apiConfigured) {
    throw new ApiError(0, 'NEXT_PUBLIC_API_URL is not configured — set it in .env.local');
  }
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, (body as { error?: string })?.error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export function authHeaders(token: string | null | undefined): Record<string, string> {
  return token ? { authorization: `Bearer ${token}` } : {};
}

export async function getEvents(params: {
  status?: 'upcoming' | 'ongoing' | 'past';
  location?: string;
  page?: number;
  per_page?: number;
} = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.location?.trim()) qs.set('location', params.location.trim());
  qs.set('page', String(params.page ?? 1));
  qs.set('per_page', String(Math.min(50, Math.max(1, params.per_page ?? 12))));
  return apiJson<Envelope<ApiEvent>>(`/api/events?${qs.toString()}`);
}

export async function authenticate(mode: 'login' | 'register', email: string, password: string) {
  return apiJson<{ token: string }>(`/api/auth/${mode}`, {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
}

export async function getNotifications(token: string, page = 1) {
  return apiJson<Envelope<Notification>>(`/api/notifications?page=${page}&per_page=20`, {
    headers: authHeaders(token),
  });
}

// Customer sessions live in sessionStorage (tab-scoped, gone on close).
// Staff/door tokens deliberately stay in component memory only — see /gate.
const TOKEN_KEY = 'nareli_session_token';
export function saveSessionToken(token: string) {
  if (typeof window !== 'undefined') sessionStorage.setItem(TOKEN_KEY, token);
}
export function getSessionToken(): string | null {
  return typeof window === 'undefined' ? null : sessionStorage.getItem(TOKEN_KEY);
}
export function clearSessionToken() {
  if (typeof window !== 'undefined') sessionStorage.removeItem(TOKEN_KEY);
}
