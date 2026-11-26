import { Resend } from 'resend';
import { NextResponse } from 'next/server';

// TODO (owner): replace sandbox sender 'onboarding@resend.dev' with a verified
// domain sender (e.g. bookings@nareli.co.ke) once the domain + SPF/DKIM land.
// TODO (owner): decide whether inquiries get stored (Kenya DPA notice needed) —
// this route intentionally keeps no database yet.

// Fail closed: no key → inquiry endpoint answers 503, never a boot-time crash.
// (Resend's constructor throws on a missing key — this module is evaluated at build time too.)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, { count: number; resetAt: number }>();

// Never key the limiter on a header the caller controls. Deployments name the
// platform-injected IP header explicitly (cf-connecting-ip on Cloudflare,
// x-real-ip on Vercel). With nothing configured every caller shares one bucket:
// conservative, but impossible to bypass by inventing header values.
const TRUSTED_IP_HEADER = process.env.TRUSTED_IP_HEADER?.trim().toLowerCase();

function rateLimitKey(request: Request): string {
  const value = TRUSTED_IP_HEADER ? request.headers.get(TRUSTED_IP_HEADER) : null;
  return value?.trim() || 'shared';
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const asStr = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function POST(request: Request) {
  // Rate-limit key comes only from a deployment-configured trusted header.
  const ip = rateLimitKey(request);
  const now = Date.now();
  const slot = hits.get(ip);
  if (slot && now < slot.resetAt) {
    if (slot.count >= MAX_PER_WINDOW) {
      return NextResponse.json({ success: false, error: 'Too many inquiries — try again in a minute' }, { status: 429 });
    }
    slot.count += 1;
  } else {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const name = asStr((body as Record<string, unknown>)?.name, 120);
  const email = asStr((body as Record<string, unknown>)?.email, 254).toLowerCase();
  const eventType = asStr((body as Record<string, unknown>)?.eventType, 80);
  const message = asStr((body as Record<string, unknown>)?.message, 3000);

  if (!name || !email || !message || !EMAIL_RE.test(email)) {
    return NextResponse.json({ success: false, error: 'Please provide a valid name, email and message' }, { status: 400 });
  }

  if (!resend) {
    return NextResponse.json({ success: false, error: 'Inquiries are not configured yet — please reach us directly on email.' }, { status: 503 });
  }

  try {
    const data = await resend.emails.send({
      from: 'Nareli Experience <onboarding@resend.dev>',
      to: ['narelieventske@gmail.com'],
      replyTo: email,
      subject: `New Event Inquiry: ${eventType || 'General'}`,
      html: `
        <h2>New Booking Inquiry</h2>
        <p><strong>Name:</strong> ${esc(name)}</p>
        <p><strong>Email:</strong> ${esc(email)}</p>
        <p><strong>Event Type:</strong> ${esc(eventType || 'General')}</p>
        <p><strong>Message:</strong></p>
        <p>${esc(message).replace(/\n/g, '<br/>')}</p>
      `,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    // Log without PII; client gets a generic failure
    console.error('contact inquiry failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ success: false, error: 'Failed to send your inquiry — please try again later.' }, { status: 500 });
  }
}
