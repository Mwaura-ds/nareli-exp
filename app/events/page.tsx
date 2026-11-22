'use client';

// /events — browsable event listing backed by GET /api/events.
// Same visual language as the rest of the site (stone + amber reminder marks).
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, apiConfigured, getEvents, type ApiEvent, type Pagination } from '../lib/api';

type Status = 'upcoming' | 'ongoing' | 'past';
const STATUSES: { key: Status; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ongoing', label: 'Happening now' },
  { key: 'past', label: 'Past' },
];

const input = 'w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-500 placeholder:text-stone-400';
const dateFmt = new Intl.DateTimeFormat('en-KE', {
  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi',
});

export default function EventsPage() {
  const [status, setStatus] = useState<Status>('upcoming');
  const [location, setLocation] = useState('');
  const [appliedLocation, setAppliedLocation] = useState('');
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(apiConfigured);
  const [error, setError] = useState<string | null>(apiConfigured ? null : 'Events are not configured yet — set NEXT_PUBLIC_API_URL on the site.');

  useEffect(() => {
    if (!apiConfigured) return;
    let cancelled = false;
    getEvents({ status, location: appliedLocation, page, per_page: 12 })
      .then((data) => {
        if (cancelled) return;
        setEvents(data.data ?? []);
        setPagination(data.pagination ?? null);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setEvents([]);
        setPagination(null);
        setError(e instanceof ApiError && e.status === 0 ? e.message : 'Could not load events right now — try again shortly.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, appliedLocation, page]);

  const totalPages = pagination?.total_pages ?? 1;

  return (
    <main className="min-h-screen bg-stone-50 py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-stone-500 hover:text-stone-800 text-sm">← Back home</Link>
        <div className="mt-5 mb-8">
          <span className="text-stone-500 font-medium tracking-widest uppercase text-sm">Nareli calendar</span>
          <h1 className="text-4xl md:text-5xl font-bold mt-2">All events</h1>
          <p className="text-stone-600 mt-2">Live from the ticketing service. Select an event to reserve a spot.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-8">
          <div className="flex gap-2 flex-wrap">
            {STATUSES.map((s) => (
              <button
                key={s.key}
                onClick={() => { setStatus(s.key); setPage(1); setLoading(true); }}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                  status === s.key ? 'bg-nareli text-white border-stone-900' : 'border-stone-300 text-stone-600 hover:border-stone-500'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); setAppliedLocation(location); setPage(1); setLoading(true); }}
            className="flex gap-2 w-full sm:w-auto sm:ml-auto"
          >
            <input
              className={`${input} py-2 text-sm`}
              placeholder="Filter by location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              aria-label="Filter by location"
            />
            <button type="submit" className="shrink-0 bg-nareli text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-nareli-dark">
              Filter
            </button>
          </form>
        </div>

        {loading && <p className="text-stone-500 py-12 text-center">Loading events…</p>}
        {!loading && error && (
          <div className="border border-dashed border-stone-300 rounded-2xl p-10 text-center text-stone-600">
            {error}
          </div>
        )}
        {!loading && !error && events.length === 0 && (
          <div className="border border-dashed border-stone-300 rounded-2xl p-10 text-center">
            <h2 className="text-2xl font-bold text-stone-900 mb-2">Nothing here yet</h2>
            <p className="text-stone-600">No {status} events match this view. <Link href="/contact" className="underline">Ask us about a private one</Link>.</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          {events.map((event) => {
            const seatsLeft = event.capacity == null ? null : Math.max(0, event.capacity - event.current_registrations);
            const soldOut = seatsLeft === 0;
            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 hover:shadow-md hover:border-stone-300 transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-nareli text-white text-xs font-bold px-3 py-1 rounded-full">{dateFmt.format(new Date(event.start_time))}</span>
                  {soldOut && <span className="text-red-700 text-xs font-semibold">Waitlist open</span>}
                  {!soldOut && seatsLeft !== null && seatsLeft <= 10 && <span className="text-amber-700 text-xs font-semibold">{seatsLeft} seats left</span>}
                </div>
                <h2 className="text-xl font-bold text-stone-900 mb-1">{event.title}</h2>
                <p className="text-stone-600 text-sm mb-4">{event.location ?? 'Venue revealed after RSVP'}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-stone-500">Ticket prices announced soon</span>
                  <span className="text-stone-900 text-sm font-medium">{soldOut ? 'Join waitlist →' : 'Reserve →'}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-10">
            <button
              disabled={page <= 1}
              onClick={() => { setPage((p) => Math.max(1, p - 1)); setLoading(true); }}
              className="border border-stone-300 px-4 py-2 rounded-full text-sm disabled:opacity-40"
            >
              ← Previous
            </button>
            <span className="text-sm text-stone-600">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); setLoading(true); }}
              className="border border-stone-300 px-4 py-2 rounded-full text-sm disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
