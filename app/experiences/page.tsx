import Link from 'next/link';

export default function ExperiencesPage() {
  const packages = [
    { name: "The Boho Picnic", details: "Includes rug, cushions, low table, floral arrangement, and tableware for 2." },
    { name: "Ultimate Sleepover", details: "Includes 4 teepee tents, luxury bedding, fairy lights, and a snack station." },
    { name: "Cinema Under Stars", details: "Includes 100-inch projector screen, projector, cozy seating, and popcorn bar." },
    { name: "Intimate House Party", details: "Full aesthetic styling, lighting design, and setup/teardown for up to 20 guests." },
  ];

  return (
    <main className="min-h-screen bg-stone-50 py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-4 text-stone-900">Our Packages</h1>
        <p className="text-center text-stone-600 mb-8 text-lg">Every event is quoted individually.</p>
        <p className="text-center text-stone-600 max-w-2xl mx-auto mb-12">
          Prices, VAT treatment and any booking deposit are set per event, not per package.
          Open an event from the calendar to see its final price and terms.
        </p>

        <div className="space-y-8">
          {packages.map((pkg, index) => (
            <div key={index} className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:shadow-md transition-shadow">
              <div>
                <h2 className="text-2xl font-bold text-stone-900 mb-2">{pkg.name}</h2>
                <p className="text-stone-600">{pkg.details}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-stone-500 mb-3">Price set per event</p>
                <Link href="/events">
                  <button className="bg-nareli text-white px-6 py-2 rounded-full text-sm hover:bg-nareli-dark transition-colors">
                    See events
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