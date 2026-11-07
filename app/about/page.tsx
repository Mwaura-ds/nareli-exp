"use client";

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { galleryImages } from '@/app/data'; // Importing the Master List!

export default function AboutPage() {
  // State to keep track of which image is currently showing
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // This effect automatically changes the image every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % galleryImages.length);
    }, 4000); // 4000 milliseconds = 4 seconds
    
    return () => clearInterval(interval); // Cleanup to prevent memory leaks
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      {/* Hero Section */}
      <section className="py-24 px-6 text-center bg-stone-100">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">Our Story</h1>
          <p className="text-xl text-stone-600 leading-relaxed">
            Nareli Experience was born out of a simple belief: everyone deserves to celebrate life's beautiful moments without the stress of planning them.
          </p>
        </motion.div>
      </section>

      {/* The Mission Section with Slideshow */}
      <motion.section 
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="py-24 px-6 max-w-6xl mx-auto"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          
          {/* THE AUTOMATIC SLIDESHOW */}
          <motion.div variants={item} className="relative h-[400px] rounded-3xl shadow-lg overflow-hidden bg-stone-200">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImageIndex} // The key tells Framer Motion to animate when this changes
                src={galleryImages[currentImageIndex].src}
                alt={galleryImages[currentImageIndex].title}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }} // Smooth 1-second crossfade
                className="absolute inset-0 w-full h-full object-cover"
              />
            </AnimatePresence>
          </motion.div>

          <motion.div variants={item}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Curating the Unforgettable</h2>
            <p className="text-stone-600 mb-6 leading-relaxed">
              From cozy sleepovers and luxury picnics to cinematic nights under the stars, we handle every single detail. We source the aesthetics, set up the magic, and tear it all down so you can just be present in the moment.
            </p>
            <p className="text-stone-600 leading-relaxed">
              Whether you are hosting an intimate gathering for friends or looking to join one of our exclusive community pop-up events, Nareli Experience is here to bring your vision to life.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Contact Information Section */}
      <motion.section 
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="py-24 px-6 bg-stone-900 text-white"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 variants={item} className="text-4xl font-bold mb-4">Get in Touch</motion.h2>
          <motion.p variants={item} className="text-stone-400 mb-16 text-lg">Ready to plan your next event? Reach out to us directly.</motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div variants={item} className="bg-stone-800 p-8 rounded-2xl hover:bg-stone-700 transition-colors">
              <div className="w-12 h-12 bg-stone-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Email Us</h3>
              <p className="text-stone-400 text-sm mb-2">For bookings & inquiries</p>
              <a href="mailto:hello@nareliexperience.com" className="text-white font-medium hover:underline">hello@nareliexperience.com</a>
            </motion.div>

            <motion.div variants={item} className="bg-stone-800 p-8 rounded-2xl hover:bg-stone-700 transition-colors">
              <div className="w-12 h-12 bg-stone-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Call / WhatsApp</h3>
              <p className="text-stone-400 text-sm mb-2">Mon - Sat, 9am - 6pm</p>
              <a href="tel:+1234567890" className="text-white font-medium hover:underline">+1 (234) 567-890</a>
            </motion.div>

            <motion.div variants={item} className="bg-stone-800 p-8 rounded-2xl hover:bg-stone-700 transition-colors">
              <div className="w-12 h-12 bg-stone-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Follow Us</h3>
              <p className="text-stone-400 text-sm mb-2">See our latest setups</p>
              <div className="flex justify-center gap-4 text-white font-medium">
                <a href="#" className="hover:text-amber-400 transition-colors">Instagram</a>
                <span className="text-stone-600">|</span>
                <a href="#" className="hover:text-amber-400 transition-colors">TikTok</a>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Final Call to Action */}
      <section className="py-24 px-6 text-center">
        <h2 className="text-3xl font-bold mb-8">Ready to create something magical?</h2>
        <Link href="/contact">
          <button className="bg-stone-900 text-white px-10 py-4 rounded-full text-lg font-semibold hover:bg-stone-700 transition-all duration-300 shadow-lg">
            Send us a Message
          </button>
        </Link>
      </section>
    </main>
  );
}