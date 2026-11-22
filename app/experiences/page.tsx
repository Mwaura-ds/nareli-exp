import Link from 'next/link';

export default function ExperiencesPage() {
  const packages = [
    { name: "The Boho Picnic", price: "KSh TBD", details: "Includes rug, cushions, low table, floral arrangement, and tableware for 2." },
    { name: "Ultimate Sleepover", price: "KSh TBD", details: "Includes 4 teepee tents, luxury bedding, fairy lights, and a snack station." },
    { name: "Cinema Under Stars", price: "KSh TBD", details: "Includes 100-inch projector screen, projector, cozy seating, and popcorn bar." },
    { name: "Intimate House Party", price: "KSh TBD", details: "Full aesthetic styling, lighting design, and setup/teardown for up to 20 guests." },
  ];

  return (
    <main className="min-h-screen bg-stone-50 py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-4 text-stone-900">Our Packages</h1>
        <p className="text-center text-stone-600 mb-16 text-lg">Transparent pricing for unforgettable moments.</p>
        <p className="text-center text-amber-800 text-sm font-medium mb-12 border border-amber-300 bg-amber-50 rounded-xl px-4 py-2 max-w-md mx-auto">
          ⏳ Owner to set KSh package figures, VAT treatment and the booking deposit rule — shown as “TBD” until done.
        </p>

        <div className="space-y-8">
          {packages.map((pkg, index) => (
            <div key={index} className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:shadow-md transition-shadow">
              <div>
                <h2 className="text-2xl font-bold text-stone-900 mb-2">{pkg.name}</h2>
                <p className="text-stone-600">{pkg.details}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-stone-900 mb-3">{pkg.price}</p>
                <Link href="/contact">
                  <button className="bg-nareli text-white px-6 py-2 rounded-full text-sm hover:bg-nareli-dark transition-colors">
                    Book Now
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}