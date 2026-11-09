"use client";

import { useState } from 'react';

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      eventType: formData.get('eventType'),
      message: formData.get('message'),
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setIsSuccess(true); // Hii ndiyo inayoonyesha picha!
        (e.target as HTMLFormElement).reset();
      } else {
        alert('Something went wrong. Please try again.');
      }
    } catch (error) {
      alert('Failed to send. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 py-20 px-6 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white p-10 rounded-3xl shadow-sm border border-stone-100 min-h-[500px] flex flex-col justify-center">
        
        {/* Hii ndiyo sehemu ya picha inayoonekana baada ya kutuma */}
        {isSuccess ? (
          <div className="text-center py-10 flex flex-col items-center justify-center h-full">
            <img 
              src="/cheers.jpg" 
              alt="Cheers!" 
              className="w-64 h-64 object-contain mb-8 mx-auto"
            />
            <h2 className="text-3xl font-bold text-stone-900 mb-4">Cheers! 🥂</h2>
            <p className="text-stone-600 text-lg mb-8 max-w-md">
              We have received your inquiry. We'll be in touch shortly to start planning your magical event.
            </p>
            <button 
              onClick={() => setIsSuccess(false)} 
              className="text-stone-900 font-semibold underline hover:text-stone-600 transition-colors"
            >
              Send another inquiry
            </button>
          </div>
        ) : (
          /* Hii ni fomu ya kawaida */
          <div>
            <h1 className="text-4xl font-bold text-center mb-4 text-stone-900">Let's Plan Your Event</h1>
            <p className="text-center text-stone-600 mb-10">Fill out the form below and we'll get back to you within 24 hours.</p>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Name</label>
                  <input name="name" type="text" required className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white text-stone-900 placeholder:text-stone-400" placeholder="Jane Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Email</label>
                  <input name="email" type="email" required className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white text-stone-900 placeholder:text-stone-400" placeholder="jane@example.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Event Type</label>
                <select name="eventType" className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white text-stone-900">
                  <option>Luxury Picnic</option>
                  <option>Cozy Sleepover</option>
                  <option>Movie Night</option>
                  <option>House Party</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Tell us about your vision</label>
                <textarea name="message" rows={4} required className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white text-stone-900 placeholder:text-stone-400" placeholder="Date, number of guests, location..."></textarea>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-stone-900 text-white py-4 rounded-full text-lg font-semibold hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? 'Sending...' : 'Send Inquiry'}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}