import Todo from '../components/Todo';

export const metadata = {
  title: 'Nareli Experience | Privacy & Refunds',
  description: 'Privacy notice (Kenya Data Protection Act 2019) and refund terms for Nareli Experience bookings.',
};

// DRAFT — owner + legal/accounts sign-off required before public launch.
// This page exists so responsibilities and mechanisms are defined up front
// (Milimani Small Claims Court v. Shoke Shoke Festival: terms alone do not
// exempt an organiser who never refunds).
export default function TermsPage() {
  return (
    <main className="min-h-screen bg-stone-50 py-16 px-6">
      <article className="max-w-3xl mx-auto prose prose-stone">
        <p className="mb-6 inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800 not-prose">
          ⏳ Draft for owner + legal review <Todo>required before launch</Todo>
        </p>

        <h1>Privacy &amp; Refund Terms</h1>

        <h2>Privacy notice</h2>
        <p>
          <strong>Who we are.</strong> Nareli Experience (the “organiser”, “we”, “us”). Contact: narelieventske@gmail.com.
          We operate as a data controller under the Kenya Data Protection Act 2019 and registered where required with the ODPC.
        </p>
        <p>
          <strong>What we collect.</strong> Your name, phone number, and the first names you give us for your party,
          plus your check-in state at door. We do not store full payment-card data. M-PESA transaction codes, when provided
          for payment reconciliation or refunds, are stored only for as long as the refund window needs.
        </p>
        <p>
          <strong>Why.</strong> To run your booking, check your party in at the door, communicate changes, and process refunds.
          That’s it. We do not sell, rent, or share your data with marketeers.
        </p>
        <p>
          <strong>Retention.</strong> Booking data is kept until 90 days after the event for refund and dispute windows, then anonymised or deleted on request.
          You may ask us at any time what we hold and we will remove it (email us — we respond within 30 days).
        </p>
        <p>
          <strong>Your rights (Kenya DPA 2019).</strong> Access, correction, deletion, and objection — write to narelieventske@gmail.com and we will action within 30 days.
          If we mishandle your data you may complain to the ODPC (odpc.go.ke).
        </p>

        <h2>Refunds</h2>
        <p><strong>If we cancel the event.</strong> You will get a <strong>full refund of the ticket face value</strong>, communicated on the same channels you booked on,
          and we aim to complete refunds within 14 days of the cancellation notice. If we cancel, it is our problem, not yours.</p>
        <p><strong>If you cannot make it.</strong> Tickets are generally non-refundable — but message us and we’ll try to move you to a future edition or sell your seats to the waitlist if we can.</p>
        <p><strong>If you lose your ticket.</strong> Show up with the phone number used to book; we can re-issue once verified. One QR scan per seat — a previously scanned ticket is spent.</p>
        <p><strong>Material changes</strong> (date, time, venue that changes what you were sold) give you the choice of the rescheduled event or a full refund.</p>

        <h2>At the door</h2>
        <p>Gate staff see first names and party size — never your email, never your full phone, never anything about money. Door staff can mark your party arrived; nobody else can.</p>

        <h2>Photos</h2>
        <p>Photos are taken for the brand only where visible signage says so. If you’d rather not appear, tell the staff at the door and we will respect that.</p>

        <p className="text-sm text-stone-500">Nareli Experience · <a href="/contact" className="underline">Contact</a> for questions about these terms.</p>
      </article>
    </main>
  );
}
