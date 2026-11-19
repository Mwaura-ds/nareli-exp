"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiConfigured, apiFetch } from './lib/api';
import Todo from './components/Todo';

type ApiEvent = {
  id: string;
  title: string;
  location: string | null;
  start_time: string;
  end_time: string;
  capacity: number | null;
  current_registrations: number;
};

export default function Home() {
  const [events, setEvents] = useState<ApiEvent[] | null>(() => (apiConfigured ? null : []));
  const [eventsError, setEventsError] = useState(() => !apiConfigured);

  useEffect(() => {
    if (!apiConfigured) return;
    apiFetch('/api/events?status=upcoming&per_page=6')
      .then(async (r) => {
        if (!r.ok) throw new Error(`events: ${r.status}`);
        return r.json();
      })
      .then((d) => setEvents(d.data ?? []))
      .catch(() => setEventsError(true));
  }, []);

  const privateExperiences = [
    { 
      title: "Private Luxury Picnics", 
      description: "We bring the boho-chic setup to your chosen location. Perfect for proposals or birthdays."
    },
    { 
      title: "Custom Sleepovers", 
      description: "Ultimate slumber party setups with teepees, luxury bedding, and snack stations for your group."
    },
    { 
      title: "Intimate House Parties", 
      description: "Full aesthetic styling, lighting design, and seamless setup/teardown for up to 20 guests."
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <main className="flex flex-col bg-stone-50 text-stone-900">
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center text-center px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1478146059778-26028b07395a?auto=format&fit=crop&q=80&w=2000" 
            alt="Cozy event setup" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50"></div>
        </div>

        <div className="relative z-10 max-w-4xl text-white">
          <motion.h1 
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold mb-6 tracking-tight"
          >
            Nareli Experience
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-xl md:text-2xl mb-10 font-light"
          >
            Join our curated community events, or let us plan an unforgettable experience just for you.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a href="#upcoming">
              <button className="bg-white text-stone-900 px-8 py-4 rounded-full text-lg font-semibold hover:bg-stone-200 transition-all duration-300 shadow-lg">
                View Upcoming Events
              </button>
            </a>
            <Link href="/contact">
              <button className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white/10 transition-all duration-300">
                Book a Private Event
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Upcoming Public Events Section */}
      <motion.section 
        id="upcoming"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="py-24 px-6 max-w-5xl mx-auto w-full"
      >
        <div className="text-center mb-16">
          <span className="text-stone-500 font-medium tracking-widest uppercase text-sm">Join the Vibe</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-4">Upcoming Events</h2>
          <p className="text-stone-600 text-lg max-w-2xl mx-auto">Secure your spot at our next curated experience.</p>
          <Link href="/events" className="inline-block mt-3 text-sm font-semibold text-stone-700 underline underline-offset-4 hover:text-stone-900">
            See all events →
          </Link>
        </div>
        
        <div className="space-y-6">
          {events === null && (
            <p className="text-center text-stone-500 py-12">Loading events…</p>
          )}
          {events !== null && eventsError && (
            <p className="text-center text-stone-500 py-12">Events will be live soon — <Link href="/contact" className="underline">write to us</Link> about any of them.</p>
          )}
          {events !== null && !eventsError && events.length === 0 && (
            <div className="text-center py-16 border border-dashed border-stone-300 rounded-2xl px-6">
              <h3 className="text-2xl font-bold text-stone-900 mb-2">More moments in the making</h3>
              <p className="text-stone-600 max-w-md mx-auto">Our next curated experiences are being set up. Follow us for the reveal, or ask us about a private booking below.</p>
            </div>
          )}
          {events?.map((event) => {
            const seatsLeft = event.capacity == null ? null : Math.max(0, event.capacity - event.current_registrations);
            const soldOut = seatsLeft === 0;
            const dateLabel = new Intl.DateTimeFormat('en-KE', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Africa/Nairobi' }).format(new Date(event.start_time));
            return (
              <motion.div key={event.id} variants={item} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-stone-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-stone-900 text-white text-xs font-bold px-3 py-1 rounded-full">{dateLabel}</span>
                    {soldOut && <span className="text-red-700 text-sm font-medium">Sold out — waitlist open</span>}
                    {!soldOut && seatsLeft !== null && seatsLeft <= 10 && <span className="text-amber-700 text-sm font-medium">Only {seatsLeft} seats left</span>}
                  </div>
                  <h3 className="text-2xl font-bold text-stone-900 mb-1">{event.title}</h3>
                  <p className="text-stone-600 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    {event.location ?? 'Venue revealed after RSVP'}
                  </p>
                </div>
                <div className="text-right flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-2 w-full md:w-auto">
                  <p className="text-xs uppercase tracking-widest text-stone-500">KSh <Todo>owner: prices + payments</Todo></p>
                  <Link href={`/events/${event.id}`} className="bg-stone-900 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-stone-700 transition-colors w-full md:w-auto text-center">
                    {soldOut ? 'Join Waitlist' : 'Reserve'}
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Private Experiences Grid */}
      <motion.section 
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        className="py-24 px-6 bg-stone-100 w-full"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-stone-500 font-medium tracking-widest uppercase text-sm">Just For You</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-4">Private Bookings</h2>
            <p className="text-stone-600 text-lg max-w-2xl mx-auto">Want to host your own? We bring the magic to your location.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {privateExperiences.map((exp, index) => (
              <motion.div key={index} variants={item} className="group bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-200">
                <h3 className="text-xl font-bold mb-3 text-stone-900">{exp.title}</h3>
                <p className="text-stone-600 leading-relaxed mb-6">{exp.description}</p>
                <Link href="/contact" className="text-stone-900 font-semibold border-b-2 border-stone-900 pb-1 hover:text-amber-700 hover:border-amber-700 transition-colors">
                  Inquire Now →
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>
    </main>
  );
}