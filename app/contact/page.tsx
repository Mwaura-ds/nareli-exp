"use client";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-stone-50 py-20 px-6 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white p-10 rounded-3xl shadow-sm border border-stone-100">
        <h1 className="text-4xl font-bold text-center mb-4 text-stone-900">Let's Plan Your Event</h1>
        <p className="text-center text-stone-600 mb-10">Fill out the form below and we'll get back to you within 24 hours.</p>

        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert("Thanks! We will contact you soon."); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Name</label>
              <input 
                type="text" 
                required 
                className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white text-stone-900 placeholder:text-stone-400" 
                placeholder="Jane Doe" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Email</label>
              <input 
                type="email" 
                required 
                className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white text-stone-900 placeholder:text-stone-400" 
                placeholder="jane@example.com" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Event Type</label>
            <select className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white text-stone-900">
              <option>Luxury Picnic</option>
              <option>Cozy Sleepover</option>
              <option>Movie Night</option>
              <option>House Party</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Tell us about your vision</label>
            <textarea 
              rows={4} 
              className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white text-stone-900 placeholder:text-stone-400" 
              placeholder="Date, number of guests, location..."
            ></textarea>
          </div>

          <button type="submit" className="w-full bg-stone-900 text-white py-4 rounded-full text-lg font-semibold hover:bg-stone-700 transition-colors">
            Send Inquiry
          </button>
        </form>
      </div>
    </main>
  );
}