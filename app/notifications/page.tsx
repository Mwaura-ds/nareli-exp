'use client';

// /notifications — account inbox backed by GET /api/notifications.
// Delivery is in-app only today: the backend worker logs to console, and
// tickets reach the door on-screen. No email/SMS is implied by this page.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ApiError, apiConfigured, authenticate, clearSessionToken, getNotifications,
  getSessionToken, saveSessionToken, type Notification, type Pagination,
} from '../lib/api';
import Todo from '../components/Todo';

const input = 'w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-500 placeholder:text-stone-400';
const fmt = new Intl.DateTimeFormat('en-KE', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi',
});

export default function NotificationsPage() {
  const [token, setToken] = useState<string | null>(() => getSessionToken());
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [items, setItems] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => apiConfigured && getSessionToken() !== null);

  useEffect(() => {
    if (!token || !apiConfigured) return;
    let cancelled = false;
    getNotifications(token, page)
      .then((data) => {
        if (cancelled) return;
        setItems(data.data ?? []);
        setPagination(data.pagination ?? null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          clearSessionToken();
          setToken(null);
          setAuthError('Your session expired — sign in again.');
        } else {
          setLoadError('Could not load your messages right now.');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, page]);

  const signIn = async () => {
    setAuthError(null);
    setBusy(true);
    try {
      const res = await authenticate(mode, email, password);
      saveSessionToken(res.token);
      setToken(res.token);
      setPage(1);
      setLoading(true);
      setLoadError(null);
    } catch (e) {
      setAuthError(e instanceof ApiError && e.status === 409
        ? 'That email already has an account — switch to Log in.'
        : e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  if (!apiConfigured) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center text-stone-500">
        Your inbox is not configured yet — set NEXT_PUBLIC_API_URL on the site.
      </main>
    );
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center px-6 py-12">
        <div className="max-w-sm w-full bg-white rounded-3xl border border-stone-100 shadow-sm p-6 space-y-4">
          <Link href="/" className="text-stone-500 text-sm">← Back home</Link>
          <h1 className="text-2xl font-bold text-stone-900">Your messages</h1>
          <p className="text-stone-600 text-sm">Sign in with the email you booked with to see booking and event updates.</p>
          <div className="flex gap-2 text-sm">
            <button type="button" onClick={() => setMode('login')} className={`px-3 py-1.5 rounded-full border font-medium ${mode === 'login' ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-300 text-stone-600'}`}>Log in</button>
            <button type="button" onClick={() => setMode('register')} className={`px-3 py-1.5 rounded-full border font-medium ${mode === 'register' ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-300 text-stone-600'}`}>New account</button>
          </div>
          <input className={input} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <input className={input} type="password" placeholder="At least 8 characters" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          {authError && <p className="text-red-700 text-sm">{authError}</p>}
          <button onClick={signIn} disabled={busy || !email || password.length < 8} className="w-full bg-stone-900 text-white py-3 rounded-2xl font-semibold disabled:opacity-50">
            {busy ? 'Signing in…' : 'Continue'}
          </button>
          <p className="text-xs text-stone-400">Session lasts until you close this browser tab. <Todo>owner: email/SMS delivery</Todo></p>
        </div>
      </main>
    );
  }

  const totalPages = pagination?.total_pages ?? 1;
  return (
    <main className="min-h-screen bg-stone-50 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-900">Your messages</h1>
            <p className="text-stone-600 text-sm mt-1">Booking confirmations, event changes and waitlist updates.</p>
          </div>
          <button onClick={() => { clearSessionToken(); setToken(null); setItems([]); setLoading(false); setLoadError(null); }} className="border border-stone-300 px-4 py-2 rounded-full text-sm hover:border-stone-500">Sign out</button>
        </div>

        {loading && <p className="text-stone-500 py-10 text-center">Loading…</p>}
        {!loading && loadError && <p className="text-red-700 text-sm py-8 text-center">{loadError}</p>}
        {!loading && !loadError && items.length === 0 && (
          <div className="border border-dashed border-stone-300 rounded-2xl p-10 text-center text-stone-600">
            No messages yet. Booking updates will appear here.
          </div>
        )}

        <div className="space-y-3">
          {items.map((n) => (
            <article key={n.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
              <div className="flex items-center justify-between gap-4 mb-2">
                <h2 className="font-semibold text-stone-900">{n.subject ?? 'Event update'}</h2>
                <span className={`text-xs font-semibold ${n.sent ? 'text-green-700' : 'text-amber-700'}`}>
                  {n.sent ? `Sent ${n.sent_at ? fmt.format(new Date(n.sent_at)) : ''}` : 'Queued'}
                </span>
              </div>
              <p className="text-stone-600 text-sm whitespace-pre-wrap">{n.body}</p>
              <p className="text-xs text-stone-400 mt-2">{fmt.format(new Date(n.created_at))}</p>
            </article>
          ))}
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button disabled={page <= 1} onClick={() => { setPage((p) => p - 1); setLoading(true); }} className="border border-stone-300 px-4 py-2 rounded-full text-sm disabled:opacity-40">← Previous</button>
            <span className="text-sm text-stone-600">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => { setPage((p) => p + 1); setLoading(true); }} className="border border-stone-300 px-4 py-2 rounded-full text-sm disabled:opacity-40">Next →</button>
          </div>
        )}
      </div>
    </main>
  );
}
