import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-400 py-12 mt-auto">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <h3 className="text-2xl font-bold text-white mb-4">Nareli Experience</h3>
        <p className="mb-6">Curating unforgettable moments, one event at a time.</p>
        <nav className="flex gap-6 justify-center text-sm mb-6">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/events" className="hover:text-white">Events</Link>
          <Link href="/experiences" className="hover:text-white">Packages</Link>
          <Link href="/notifications" className="hover:text-white">My messages</Link>
          <Link href="/tickets" className="hover:text-white">My tickets</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
          <Link href="/terms" className="hover:text-white">Privacy &amp; Refunds</Link>
        </nav>
        <p className="text-sm">© 2026 Nareli Experience. All rights reserved.</p>
      </div>
    </footer>
  );
}