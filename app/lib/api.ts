
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
    throw new ApiError(
      0,
      'NEXT_PUBLIC_API_URL is not configured — set it in .env.local'
    );
  }

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await apiFetch(path, init);
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      (body as { error?: string })?.error ??
        `Request failed (${res.status})`
    );
  }

  return body as T;
}

export function authHeaders(
  token: string | null | undefined
): Record<string, string> {
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
  if (params.location?.trim()) {
    qs.set('location', params.location.trim());
  }

  qs.set('page', String(params.page ?? 1));
  qs.set(
    'per_page',
    String(Math.min(50, Math.max(1, params.per_page ?? 12)))
  );

  return apiJson<Envelope<ApiEvent>>(
    `/api/events?${qs.toString()}`
  );
}

export async function authenticate(
  mode: 'login' | 'register',
  email: string,
  password: string
) {
  return apiJson<{ token: string }>(`/api/auth/${mode}`, {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });
}

export type MyBookingState = {
  status: 'registered' | 'waitlisted' | 'none' | 'cancelled';
  registration: MyRegistration | null;
  waitlist: { position: number; party_size: number; ticket_phone: string | null } | null;
  checkin_token: string | null;
};

export async function getMyRegistration(token: string, eventId: string) {
  return apiJson<MyBookingState>(`/api/events/${eventId}/my-registration`, {
    headers: authHeaders(token),
  });
}

export async function cancelMyRegistration(token: string, eventId: string) {
  return apiJson<{ status: string; promoted?: string | null }>(`/api/events/${eventId}/cancel`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
}

export async function getNotifications(token: string, page = 1) {
  return apiJson<Envelope<Notification>>(
    `/api/notifications?page=${page}&per_page=20`,
    {
      headers: authHeaders(token),
    }
  );
}

// ---- Owner / admin surface (never available to staff tokens) ----

export type StaffMember = {
  id: string;
  email: string;
  username: string | null;
  created_at: string;
};

export type RegistrationRow = {
  id: string;
  user_id: string;
  email: string | null;
  username: string | null;
  phone: string | null;
  party_size: number;
  status: string;
  arrived_count: number;
  arrived_names: string[];
  amount_kes: number | null;
  payment_ref: string | null;
  refund_status: string;
  refunded_kes: number | null;
  refund_ref: string | null;
  registered_at: string;
  checkin_at: string | null;
};

export type EventSummary = {
  confirmed_rows: number;
  cancelled_rows: number;
  seats_sold: number;
  seats_arrived: number;
  gross_collected: number;
  refunded: number;
  refund_pending: number;
  refund_requested_count: number;
  refund_refunded_count: number;
  waitlist_pending: number;
  net_kes: number;
};

export async function getMe(token: string) {
  return apiJson<{
    user: {
      id: string;
      role: string;
      username: string | null;
    };
  }>('/api/auth/me', {
    headers: authHeaders(token),
  });
}

export async function getOwnerEvents(token: string) {
  return apiJson<
    Envelope<ApiEvent & {
      is_public: boolean;
      cancelled_at?: string | null;
    }>
  >('/api/events?per_page=50', {
    headers: authHeaders(token),
  });
}

export async function getSummary(
  token: string,
  eventId: string
) {
  return apiJson<EventSummary>(
    `/api/events/${eventId}/summary`,
    {
      headers: authHeaders(token),
    }
  );
}

export async function getRegistrations(
  token: string,
  eventId: string,
  page = 1
) {
  return apiJson<Envelope<RegistrationRow>>(
    `/api/events/${eventId}/registrations?page=${page}&per_page=100`,
    {
      headers: authHeaders(token),
    }
  );
}

export async function downloadRegistrationsCsv(
  token: string,
  eventId: string
) {
  const res = await apiFetch(
    `/api/events/${eventId}/registrations?format=csv`,
    {
      headers: authHeaders(token),
    }
  );

  if (!res.ok) {
    throw new ApiError(
      res.status,
      'Could not export registrations'
    );
  }

  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');

  a.href = url;
  a.download = `event-${eventId}-registrations.csv`;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function cancelEvent(
  token: string,
  eventId: string,
  reason: string
) {
  return apiJson<{
    status: string;
    notifications_queued: number;
    refunds_requested: number;
  }>(`/api/events/${eventId}/cancel-event`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      reason: reason.trim() || undefined,
    }),
  });
}

export async function markRefund(
  token: string,
  eventId: string,
  regId: string,
  payload:
    | {
        action: 'mark_refunded';
        refund_ref?: string;
        refunded_kes?: number;
      }
    | {
        action: 'mark_declined';
      }
) {
  return apiJson<{ status: string }>(
    `/api/events/${eventId}/registrations/${regId}/refund`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }
  );
}

export async function createEvent(
  token: string,
  body: {
    title: string;
    description?: string;
    location?: string;
    start_time: string;
    end_time: string;
    capacity?: number;
    is_public: boolean;
  }
) {
  return apiJson<ApiEvent>('/api/events', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

export async function editCapacity(
  token: string,
  eventId: string,
  capacity: number | null
) {
  return apiJson<ApiEvent>(
    `/api/events/${eventId}`,
    {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ capacity }),
    }
  );
}

export async function editEvent(
  token: string,
  eventId: string,
  body: {
    title?: string;
    description?: string;
    location?: string;
    start_time?: string;
    end_time?: string;
    capacity?: number | null;
    is_public?: boolean;
  }
) {
  return apiJson<ApiEvent>(
    `/api/events/${eventId}`,
    {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }
  );
}

export async function cancelRegistration(
  token: string,
  eventId: string,
  userId: string
) {
  return apiJson<{ status: string }>(
    `/api/events/${eventId}/cancel`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ user_id: userId }),
    }
  );
}

export async function getStaff(token: string) {
  return apiJson<{ data: StaffMember[] }>(
    '/api/staff',
    {
      headers: authHeaders(token),
    }
  );
}

export async function createStaff(
  token: string,
  body: {
    email: string;
    password: string;
    username?: string;
  }
) {
  return apiJson<{ staff: StaffMember }>('/api/staff', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

export async function deleteStaff(
  token: string,
  id: string
) {
  return apiJson<{ status: string }>(
    `/api/staff/${id}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    }
  );
}

export async function provisionAccount(
  token: string,
  body: {
    email: string;
    password: string;
    role: 'admin' | 'owner' | 'finance' | 'content';
    username?: string;
  }
) {
  return apiJson<{ account: StaffMember }>('/api/admins', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

// ---- Customer self-service tickets ----

export type MyRegistration = {
  id: string;
  event_id: string;
  status: string;
  party_size: number | null;
  attendee_names: string[] | null;
  ticket_phone: string | null;
  checkin_at: string | null;
  refund_status: string;
  registered_at: string;
};

// Customer sessions live in sessionStorage (tab-scoped, gone on close).
// Staff/door tokens deliberately stay in component memory only — see /gate.

const TOKEN_KEY = 'nareli_session_token';

export function saveSessionToken(token: string) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
}

export function getSessionToken(): string | null {
  return typeof window === 'undefined'
    ? null
    : sessionStorage.getItem(TOKEN_KEY);
}

export function clearSessionToken() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}
