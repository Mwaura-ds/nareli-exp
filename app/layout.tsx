import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: "Nareli Experience | Curated Events",
  description: "Luxury picnics, cozy sleepovers, and unforgettable movie nights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-stone-50 text-stone-900">
        <Navbar />
        <div className="grow">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}